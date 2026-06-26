from fastapi import APIRouter, Depends, Header, Query, Request
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
    """Legacy Flutterwave webhook — ignored (MTN MADAPI + Pesapal active)."""
    body: dict = {}
    try:
        body = await request.json()
    except Exception:
        pass
    return await PaymentService(db).handle_flutterwave_webhook(
        body, verif_hash=verif_hash
    )


@router.post("/pesapal")
@router.get("/pesapal")
async def pesapal_webhook(
    request: Request,
    OrderTrackingId: str = Query(default=""),
    OrderMerchantReference: str = Query(default=""),
    db: AsyncSession = Depends(get_db),
):
    """Pesapal IPN — confirms card payments."""
    order_tracking_id = OrderTrackingId.strip()
    merchant_reference = OrderMerchantReference.strip()

    if not order_tracking_id and not merchant_reference:
        try:
            body = await request.json()
            order_tracking_id = str(
                body.get("OrderTrackingId") or body.get("order_tracking_id") or ""
            ).strip()
            merchant_reference = str(
                body.get("OrderMerchantReference")
                or body.get("merchant_reference")
                or body.get("id")
                or ""
            ).strip()
        except Exception:
            pass

    return await PaymentService(db).handle_pesapal_webhook(
        order_tracking_id=order_tracking_id or None,
        merchant_reference=merchant_reference or None,
    )


@router.post("/mtn-madapi")
async def mtn_madapi_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db),
):
    """MTN MADAPI payment callback."""
    body: dict = {}
    try:
        body = await request.json()
    except Exception:
        pass
    return await PaymentService(db).handle_mtn_madapi_webhook(body)
