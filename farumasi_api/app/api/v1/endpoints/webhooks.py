from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.payments.payment_service import PaymentService

router = APIRouter()


def _pesapal_params(request: Request, body: dict) -> tuple[str, str]:
    tracking = (
        request.query_params.get("OrderTrackingId")
        or body.get("OrderTrackingId")
        or ""
    )
    merchant_ref = (
        request.query_params.get("OrderMerchantReference")
        or body.get("OrderMerchantReference")
        or ""
    )
    return tracking, merchant_ref


@router.post("/pesapal")
async def pesapal_ipn_post(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Pesapal IPN (POST) — verify payment and acknowledge."""
    body: dict = {}
    try:
        body = await request.json()
    except Exception:
        pass
    tracking, merchant_ref = _pesapal_params(request, body)
    return await PaymentService(db).handle_pesapal_ipn(
        order_tracking_id=tracking,
        merchant_reference=merchant_ref,
    )


@router.get("/pesapal")
async def pesapal_ipn_get(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """Pesapal IPN (GET) — same handler as POST."""
    tracking, merchant_ref = _pesapal_params(request, {})
    return await PaymentService(db).handle_pesapal_ipn(
        order_tracking_id=tracking,
        merchant_reference=merchant_ref,
    )
