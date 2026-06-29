from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.dependencies.roles import require_finance, require_super_admin
from app.models.user import User
from app.schemas.payment import ManualPaymentReject, ManualPaymentReview, PaymentTransactionOut
from app.services.payments.payment_service import PaymentService

router = APIRouter()


@router.get("", response_model=list[PaymentTransactionOut])
async def list_manual_payments(
    status: Optional[str] = Query(None, description="Filter by txn status, e.g. awaiting_review"),
    _: User = Depends(require_finance()),
    db: AsyncSession = Depends(get_db),
):
    return await PaymentService(db).list_manual_payments(status=status)


@router.get("/pending-count")
async def manual_payments_pending_count(
    _: User = Depends(require_finance()),
    db: AsyncSession = Depends(get_db),
):
    count = await PaymentService(db).pending_manual_payment_count()
    return {"pending": count}


@router.post("/{txn_id}/approve", response_model=PaymentTransactionOut)
async def approve_manual_payment(
    txn_id: str,
    data: ManualPaymentReview,
    admin: User = Depends(require_finance()),
    db: AsyncSession = Depends(get_db),
):
    return await PaymentService(db).approve_manual_payment(txn_id, admin, data)


@router.post("/{txn_id}/reject", response_model=PaymentTransactionOut)
async def reject_manual_payment(
    txn_id: str,
    data: ManualPaymentReject,
    admin: User = Depends(require_finance()),
    db: AsyncSession = Depends(get_db),
):
    return await PaymentService(db).reject_manual_payment(txn_id, admin, data)
