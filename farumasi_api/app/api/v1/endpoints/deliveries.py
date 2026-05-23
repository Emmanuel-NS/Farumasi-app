from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import UserRole
from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_roles
from app.models.user import User
from app.schemas.delivery import (
    DeliveryAssignRequest,
    DeliveryCreateRequest,
    DeliveryOut,
    DeliveryRejectRequest,
    DeliveryStatusUpdate,
    DeliveryTimerOut,
    QRConfirmRequest,
)
from app.services.delivery_service import DeliveryService

router = APIRouter()


# ── List / Create ─────────────────────────────────────────────────────────
@router.get("", response_model=list[DeliveryOut])
@router.get("/", response_model=list[DeliveryOut])
async def list_deliveries(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await DeliveryService(db).list_all(actor)


@router.post(
    "",
    response_model=DeliveryOut,
    status_code=201,
)
@router.post(
    "/",
    response_model=DeliveryOut,
    status_code=201,
)
async def create_delivery(
    data: DeliveryCreateRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.OPERATIONS_ADMIN,
            UserRole.PHARMACY_ADMIN,
            UserRole.PARTNER_COMPANY_ADMIN,
        )
    ),
):
    return await DeliveryService(db).create_delivery(data, actor)


# ── Back-compat: POST /assign (old test path) ─────────────────────────────
@router.post("/assign", response_model=DeliveryOut)
async def assign_delivery_legacy(
    data: DeliveryAssignRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.OPERATIONS_ADMIN,
            UserRole.PHARMACY_ADMIN,
            UserRole.PARTNER_COMPANY_ADMIN,
        )
    ),
):
    return await DeliveryService(db).assign_delivery_legacy(data, actor)


# ── Per-delivery routes ───────────────────────────────────────────────────
@router.get("/{delivery_id}", response_model=DeliveryOut)
async def get_delivery(
    delivery_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await DeliveryService(db).get_delivery_scoped(delivery_id, actor)


@router.patch("/{delivery_id}/assign", response_model=DeliveryOut)
async def assign_delivery(
    delivery_id: str,
    data: DeliveryAssignRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(
        require_roles(
            UserRole.SUPER_ADMIN,
            UserRole.OPERATIONS_ADMIN,
            UserRole.PHARMACY_ADMIN,
            UserRole.PARTNER_COMPANY_ADMIN,
        )
    ),
):
    return await DeliveryService(db).assign_delivery_by_id(
        delivery_id, data, actor
    )


@router.patch("/{delivery_id}/accept", response_model=DeliveryOut)
async def accept_delivery(
    delivery_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.RIDER)),
):
    return await DeliveryService(db).accept_for_rider(delivery_id, actor)


@router.patch("/{delivery_id}/reject", response_model=DeliveryOut)
async def reject_delivery(
    delivery_id: str,
    data: DeliveryRejectRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_roles(UserRole.RIDER)),
):
    return await DeliveryService(db).reject_for_rider(
        delivery_id, data, actor
    )


@router.patch("/{delivery_id}/status", response_model=DeliveryOut)
async def update_delivery_status(
    delivery_id: str,
    data: DeliveryStatusUpdate,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await DeliveryService(db).update_status_scoped(
        delivery_id, data, actor
    )


@router.post("/{delivery_id}/confirm-qr", response_model=DeliveryOut)
async def confirm_qr(
    delivery_id: str,
    data: QRConfirmRequest,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await DeliveryService(db).confirm_qr_scoped(
        delivery_id, data, actor
    )


@router.get("/{delivery_id}/timer", response_model=DeliveryTimerOut)
async def delivery_timer(
    delivery_id: str,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(get_current_user),
):
    return await DeliveryService(db).get_timer(delivery_id, actor)
