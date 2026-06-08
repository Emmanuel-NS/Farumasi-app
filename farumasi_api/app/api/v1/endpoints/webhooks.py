from fastapi import APIRouter, Depends, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.payments.payment_service import PaymentService

router = APIRouter()


@router.post("/momo")
async def momo_payment_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """MTN MoMo Collection callback (X-Reference-Id header + status body)."""
    reference_id = request.headers.get("X-Reference-Id") or request.headers.get("x-reference-id")
    body = {}
    try:
        body = await request.json()
    except Exception:
        pass

    status = body.get("status") or request.headers.get("X-Status") or "SUCCESSFUL"
    financial_id = body.get("financialTransactionId")

    if not reference_id:
        return {"ok": False, "detail": "Missing X-Reference-Id"}

    processed = await PaymentService(db).handle_momo_webhook(
        reference_id, status=str(status), financial_transaction_id=financial_id
    )
    return {"ok": processed}
