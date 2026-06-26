from fastapi import APIRouter, Depends, Header, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.services.payments.payment_service import PaymentService

router = APIRouter()


@router.post("/flutterwave")
async def flutterwave_webhook(
    request: Request,
    verif_hash: str = Header(default="", alias="verif-hash"),
    db: AsyncSession = Depends(get_db),
):
    """Flutterwave charge.completed webhook."""
    body: dict = {}
    try:
        body = await request.json()
    except Exception:
        pass
    return await PaymentService(db).handle_flutterwave_webhook(
        body, verif_hash=verif_hash
    )
