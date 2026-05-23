from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.consultation import Consultation, ChatMessage
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationOut,
    ChatMessageCreate,
    ChatMessageOut,
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


@router.post("/", response_model=ConsultationOut, status_code=201)
async def start_consultation(
    data: ConsultationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Patient starts a new consultation with a pharmacist."""
    # Check if an open consultation already exists between these two users
    existing = (
        await db.execute(
            select(Consultation).where(
                Consultation.patient_id == current_user.id,
                Consultation.pharmacist_id == data.pharmacist_id,
                Consultation.status == "open",
            )
        )
    ).scalar_one_or_none()

    if existing:
        # Return existing open consultation
        result = await db.execute(
            select(Consultation)
            .where(Consultation.id == existing.id)
            .options(
                selectinload(Consultation.patient),
                selectinload(Consultation.pharmacist),
                selectinload(Consultation.messages).selectinload(ChatMessage.sender),
            )
        )
        return result.scalar_one()

    consultation = Consultation(
        patient_id=current_user.id,
        pharmacist_id=data.pharmacist_id,
        status="open",
    )
    db.add(consultation)
    await db.flush()

    # Auto-send pharmacist greeting
    pharmacist = (await db.execute(select(User).where(User.id == data.pharmacist_id))).scalar_one_or_none()
    if pharmacist:
        greeting = ChatMessage(
            consultation_id=consultation.id,
            sender_id=pharmacist.id,
            content=f"Hello! I'm {pharmacist.full_name}. How can I help you today?",
            is_read=False,
        )
        db.add(greeting)

    await db.commit()

    result = await db.execute(
        select(Consultation)
        .where(Consultation.id == consultation.id)
        .options(
            selectinload(Consultation.patient),
            selectinload(Consultation.pharmacist),
            selectinload(Consultation.messages).selectinload(ChatMessage.sender),
        )
    )
    return result.scalar_one()


@router.get("/", response_model=PaginatedResponse[ConsultationOut])
async def list_my_consultations(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List consultations for the logged-in user (patient or pharmacist)."""
    from sqlalchemy import func, or_

    total = (
        await db.execute(
            select(func.count(Consultation.id)).where(
                or_(
                    Consultation.patient_id == current_user.id,
                    Consultation.pharmacist_id == current_user.id,
                )
            )
        )
    ).scalar_one()

    result = await db.execute(
        select(Consultation)
        .where(
            or_(
                Consultation.patient_id == current_user.id,
                Consultation.pharmacist_id == current_user.id,
            )
        )
        .options(
            selectinload(Consultation.patient),
            selectinload(Consultation.pharmacist),
            selectinload(Consultation.messages).selectinload(ChatMessage.sender),
        )
        .order_by(Consultation.created_at.desc())
        .offset(offset)
        .limit(limit)
    )
    items = list(result.scalars().all())
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.get("/{consultation_id}", response_model=ConsultationOut)
async def get_consultation(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Consultation)
        .where(Consultation.id == consultation_id)
        .options(
            selectinload(Consultation.patient),
            selectinload(Consultation.pharmacist),
            selectinload(Consultation.messages).selectinload(ChatMessage.sender),
        )
    )
    consultation = result.scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if consultation.patient_id != current_user.id and consultation.pharmacist_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return consultation


@router.post("/{consultation_id}/messages", response_model=ChatMessageOut, status_code=201)
async def send_message(
    consultation_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a consultation."""
    consultation = (
        await db.execute(select(Consultation).where(Consultation.id == consultation_id))
    ).scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if consultation.patient_id != current_user.id and consultation.pharmacist_id != current_user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    if consultation.status != "open":
        raise HTTPException(status_code=400, detail="Consultation is closed")

    message = ChatMessage(
        consultation_id=consultation_id,
        sender_id=current_user.id,
        content=data.content,
        is_read=False,
    )
    db.add(message)
    await db.commit()

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.id == message.id)
        .options(selectinload(ChatMessage.sender))
    )
    return result.scalar_one()


@router.patch("/{consultation_id}/messages/read")
async def mark_messages_read(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all messages in a consultation as read for the current user."""
    from sqlalchemy import update

    await db.execute(
        update(ChatMessage)
        .where(
            ChatMessage.consultation_id == consultation_id,
            ChatMessage.sender_id != current_user.id,
        )
        .values(is_read=True)
    )
    await db.commit()
    return {"ok": True}
