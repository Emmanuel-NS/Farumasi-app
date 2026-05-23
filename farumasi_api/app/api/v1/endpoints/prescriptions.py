from fastapi import APIRouter, Depends, Query, status

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.prescription import (
    PrescriptionOut,
    PrescriptionCreate,
    PrescriptionUpdate,
    PrescriptionItemCreate,
    PrescriptionItemUpdate,
    PrescriptionItemOut,
)
from app.schemas.common import PaginatedResponse
from app.services.prescription_service import PrescriptionService


router = APIRouter()


@router.get("/", response_model=PaginatedResponse[PrescriptionOut])
async def list_prescriptions(
    status: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    items, total = await PrescriptionService(db).list_prescriptions(
        actor, status=status, offset=offset, limit=limit
    )
    return PaginatedResponse(items=list(items), total=total, offset=offset, limit=limit)


@router.post("/", response_model=PrescriptionOut, status_code=status.HTTP_201_CREATED)
async def create_prescription(
    data: PrescriptionCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await PrescriptionService(db).create_prescription(data, actor)


@router.get("/{prescription_id}", response_model=PrescriptionOut)
async def get_prescription(
    prescription_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await PrescriptionService(db).get_prescription(prescription_id, actor)


@router.patch("/{prescription_id}", response_model=PrescriptionOut)
async def update_prescription(
    prescription_id: str,
    data: PrescriptionUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await PrescriptionService(db).update_prescription(prescription_id, data, actor)


@router.post(
    "/{prescription_id}/items",
    response_model=PrescriptionItemOut,
    status_code=status.HTTP_201_CREATED,
)
async def add_item(
    prescription_id: str,
    data: PrescriptionItemCreate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await PrescriptionService(db).add_item(prescription_id, data, actor)


@router.patch(
    "/{prescription_id}/items/{item_id}",
    response_model=PrescriptionItemOut,
)
async def update_item(
    prescription_id: str,
    item_id: str,
    data: PrescriptionItemUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await PrescriptionService(db).update_item(prescription_id, item_id, data, actor)


@router.delete(
    "/{prescription_id}/items/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_item(
    prescription_id: str,
    item_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    await PrescriptionService(db).delete_item(prescription_id, item_id, actor)
    return None
