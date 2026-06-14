from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, update, delete
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.consultation import Consultation, ChatMessage
from app.schemas.consultation import (
    ConsultationCreate,
    ConsultationOut,
    ChatMessageCreate,
    ChatMessageUpdate,
    ChatMessageOut,
)
from app.schemas.common import PaginatedResponse

router = APIRouter()


ANONYMOUS_LABEL = "Anonymous Patient"


def _user_snippet(u: User | None) -> dict | None:
    if not u:
        return None
    return {
        "id": u.id,
        "full_name": u.full_name,
        "email": u.email,
        "profile_image_url": getattr(u, "profile_image_url", None),
    }


def _anon_snippet(patient_id: str) -> dict:
    return {
        "id": patient_id,
        "full_name": ANONYMOUS_LABEL,
        "email": "",
        "profile_image_url": None,
    }


def _reply_preview(m: ChatMessage | None, mask_sender_id: str | None) -> dict | None:
    if not m:
        return None
    deleted = m.deleted_at is not None
    if mask_sender_id and m.sender_id == mask_sender_id:
        sender_name = ANONYMOUS_LABEL
    else:
        sender_name = m.sender.full_name if m.sender else ""
    return {
        "id": m.id,
        "sender_id": m.sender_id,
        "sender_name": sender_name,
        "content": "" if deleted else (m.content or ""),
        "attachment_type": None if deleted else m.attachment_type,
        "attachment_name": None if deleted else m.attachment_name,
        "is_deleted": deleted,
    }


def _serialize_message(
    m: ChatMessage,
    mask_sender_id: str | None,
    reply_lookup: dict[str, ChatMessage] | None = None,
) -> dict:
    sender = _user_snippet(m.sender)
    if mask_sender_id and m.sender_id == mask_sender_id:
        sender = _anon_snippet(m.sender_id)
        sender_name = ANONYMOUS_LABEL
    else:
        sender_name = m.sender.full_name if m.sender else ""
    deleted = m.deleted_at is not None
    parent = reply_lookup.get(m.reply_to_message_id) if reply_lookup and m.reply_to_message_id else m.reply_to
    return {
        "id": m.id,
        "consultation_id": m.consultation_id,
        "sender_id": m.sender_id,
        "content": "" if deleted else (m.content or ""),
        "is_read": m.is_read,
        "created_at": m.created_at,
        "sent_at": m.created_at,
        "sender": sender,
        "sender_name": sender_name,
        "attachment_url": None if deleted else m.attachment_url,
        "attachment_name": None if deleted else m.attachment_name,
        "attachment_type": None if deleted else m.attachment_type,
        "attachment_size": None if deleted else m.attachment_size,
        "reply_to_message_id": m.reply_to_message_id,
        "edited_at": m.edited_at,
        "is_deleted": deleted,
        "reply_to": _reply_preview(parent, mask_sender_id),
    }


def _serialize_consultation(c: Consultation, viewer_id: str) -> dict:
    """Build a ConsultationOut-shaped dict, masking patient identity for the
    pharmacist when the consultation is anonymous."""
    mask = bool(c.is_anonymous) and viewer_id == c.pharmacist_id
    if mask:
        patient_snip = _anon_snippet(c.patient_id)
        patient_name = ANONYMOUS_LABEL
    else:
        patient_snip = _user_snippet(c.patient)
        patient_name = c.patient.full_name if c.patient else ""
    pharmacist_snip = _user_snippet(c.pharmacist)
    pharmacist_name = c.pharmacist.full_name if c.pharmacist else ""
    mask_sender = c.patient_id if mask else None
    reply_lookup = {m.id: m for m in (c.messages or [])}
    return {
        "id": c.id,
        "patient_id": c.patient_id,
        "pharmacist_id": c.pharmacist_id,
        "status": c.status,
        "is_anonymous": bool(c.is_anonymous),
        "created_at": c.created_at,
        "patient": patient_snip,
        "pharmacist": pharmacist_snip,
        "patient_name": patient_name,
        "pharmacist_name": pharmacist_name,
        "messages": [
            _serialize_message(m, mask_sender, reply_lookup) for m in (c.messages or [])
        ],
    }


async def _load_consultation(db: AsyncSession, consultation_id: str) -> Consultation | None:
    result = await db.execute(
        select(Consultation)
        .where(Consultation.id == consultation_id)
        .options(
            selectinload(Consultation.patient),
            selectinload(Consultation.pharmacist),
            selectinload(Consultation.messages).selectinload(ChatMessage.sender),
            selectinload(Consultation.messages).selectinload(ChatMessage.reply_to).selectinload(ChatMessage.sender),
        )
    )
    return result.scalar_one_or_none()


async def _require_consultation_access(
    db: AsyncSession,
    consultation_id: str,
    user: User,
) -> Consultation:
    consultation = (
        await db.execute(select(Consultation).where(Consultation.id == consultation_id))
    ).scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if consultation.patient_id != user.id and consultation.pharmacist_id != user.id:
        raise HTTPException(status_code=403, detail="Access denied")
    return consultation


async def _get_message_in_consultation(
    db: AsyncSession,
    consultation_id: str,
    message_id: str,
) -> ChatMessage:
    result = await db.execute(
        select(ChatMessage)
        .where(
            ChatMessage.id == message_id,
            ChatMessage.consultation_id == consultation_id,
        )
        .options(selectinload(ChatMessage.sender), selectinload(ChatMessage.reply_to))
    )
    message = result.scalar_one_or_none()
    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    return message


@router.post("/", status_code=201)
async def start_consultation(
    data: ConsultationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Patient starts (or resumes) a consultation with a pharmacist.

    Normal and anonymous threads are kept as separate consultations so they
    are never mixed.
    """
    if current_user.id == data.pharmacist_id:
        raise HTTPException(status_code=400, detail="Cannot start a consultation with yourself.")

    pharmacist = (
        await db.execute(select(User).where(User.id == data.pharmacist_id))
    ).scalar_one_or_none()
    if not pharmacist or pharmacist.role != "pharmacist":
        raise HTTPException(status_code=404, detail="Pharmacist not found.")

    # Reuse the existing open thread for the same (patient, pharmacist, mode).
    existing = (
        await db.execute(
            select(Consultation).where(
                Consultation.patient_id == current_user.id,
                Consultation.pharmacist_id == data.pharmacist_id,
                Consultation.status == "open",
                Consultation.is_anonymous == data.is_anonymous,
            )
        )
    ).scalar_one_or_none()

    if existing:
        loaded = await _load_consultation(db, existing.id)
        return _serialize_consultation(loaded, current_user.id)

    consultation = Consultation(
        patient_id=current_user.id,
        pharmacist_id=data.pharmacist_id,
        status="open",
        is_anonymous=data.is_anonymous,
    )
    db.add(consultation)
    await db.flush()

    greeting_text = (
        f"Hello! I'm {pharmacist.full_name}. "
        + ("This is an anonymous consultation — your identity is hidden. " if data.is_anonymous else "")
        + "How can I help you today?"
    )
    db.add(
        ChatMessage(
            consultation_id=consultation.id,
            sender_id=pharmacist.id,
            content=greeting_text,
            is_read=False,
        )
    )
    await db.commit()

    loaded = await _load_consultation(db, consultation.id)
    return _serialize_consultation(loaded, current_user.id)


@router.get("/")
async def list_my_consultations(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=50),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """List consultations for the logged-in user (patient or pharmacist).

    Anonymous consultations are included; for the pharmacist viewer the
    patient identity is masked.
    """
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
    items = [_serialize_consultation(c, current_user.id) for c in result.scalars().all()]
    return {"items": items, "total": total, "offset": offset, "limit": limit}


@router.get("/{consultation_id}")
async def get_consultation(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    consultation = await _load_consultation(db, consultation_id)
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if (
        consultation.patient_id != current_user.id
        and consultation.pharmacist_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Access denied")
    return _serialize_consultation(consultation, current_user.id)


@router.post("/{consultation_id}/messages", response_model=ChatMessageOut, status_code=201)
async def send_message(
    consultation_id: str,
    data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Send a message in a consultation. Body must contain content or attachment."""
    consultation = (
        await db.execute(select(Consultation).where(Consultation.id == consultation_id))
    ).scalar_one_or_none()
    if not consultation:
        raise HTTPException(status_code=404, detail="Consultation not found")
    if (
        consultation.patient_id != current_user.id
        and consultation.pharmacist_id != current_user.id
    ):
        raise HTTPException(status_code=403, detail="Access denied")
    if consultation.status != "open":
        raise HTTPException(status_code=400, detail="Consultation is closed")

    has_text = bool((data.content or "").strip())
    has_attachment = bool(data.attachment_url)
    if not has_text and not has_attachment:
        raise HTTPException(status_code=400, detail="Message must include text or an attachment.")

    attachment_type = data.attachment_type
    if has_attachment and attachment_type not in ("image", "file", "product"):
        attachment_type = "image" if (data.attachment_url or "").lower().endswith(
            (".png", ".jpg", ".jpeg", ".webp", ".gif")
        ) else "file"

    reply_to_id = data.reply_to_message_id
    if reply_to_id:
        parent = await _get_message_in_consultation(db, consultation_id, reply_to_id)
        if parent.deleted_at is not None:
            raise HTTPException(status_code=400, detail="Cannot reply to a deleted message.")

    message = ChatMessage(
        consultation_id=consultation_id,
        sender_id=current_user.id,
        content=(data.content or "").strip() or None,
        is_read=False,
        attachment_url=data.attachment_url,
        attachment_name=data.attachment_name,
        attachment_type=attachment_type,
        attachment_size=data.attachment_size,
        reply_to_message_id=reply_to_id,
    )
    db.add(message)
    await db.commit()

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.id == message.id)
        .options(
            selectinload(ChatMessage.sender),
            selectinload(ChatMessage.reply_to).selectinload(ChatMessage.sender),
        )
    )
    return result.scalar_one()


@router.patch("/{consultation_id}/messages/{message_id}", response_model=ChatMessageOut)
async def edit_message(
    consultation_id: str,
    message_id: str,
    data: ChatMessageUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Edit the text of your own message."""
    consultation = await _require_consultation_access(db, consultation_id, current_user)
    if consultation.status != "open":
        raise HTTPException(status_code=400, detail="Consultation is closed")

    message = await _get_message_in_consultation(db, consultation_id, message_id)
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only edit your own messages.")
    if message.deleted_at is not None:
        raise HTTPException(status_code=400, detail="Deleted messages cannot be edited.")
    if message.attachment_url and not (message.content or "").strip() and not data.content.strip():
        raise HTTPException(status_code=400, detail="Attachment-only messages need caption text to edit.")

    message.content = data.content.strip()
    message.edited_at = datetime.now(timezone.utc)
    await db.commit()

    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.id == message.id)
        .options(
            selectinload(ChatMessage.sender),
            selectinload(ChatMessage.reply_to).selectinload(ChatMessage.sender),
        )
    )
    return result.scalar_one()


@router.delete("/{consultation_id}/messages/{message_id}")
async def delete_message(
    consultation_id: str,
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Soft-delete your own message."""
    await _require_consultation_access(db, consultation_id, current_user)
    message = await _get_message_in_consultation(db, consultation_id, message_id)
    if message.sender_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only delete your own messages.")
    if message.deleted_at is not None:
        return {"ok": True}

    message.deleted_at = datetime.now(timezone.utc)
    message.content = None
    message.attachment_url = None
    message.attachment_name = None
    message.attachment_type = None
    message.attachment_size = None
    await db.commit()
    return {"ok": True}


@router.delete("/{consultation_id}/messages")
async def clear_chat(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Delete all messages in a consultation for both participants."""
    await _require_consultation_access(db, consultation_id, current_user)
    await db.execute(
        delete(ChatMessage).where(ChatMessage.consultation_id == consultation_id)
    )
    await db.commit()
    return {"ok": True}


@router.patch("/{consultation_id}/messages/read")
async def mark_messages_read(
    consultation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark all messages in a consultation as read for the current user."""
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
