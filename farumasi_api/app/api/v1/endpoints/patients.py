from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.patient import PatientProfile, Address
from app.schemas.patient import PatientProfileOut, PatientProfileUpdate, AddressCreate, AddressUpdate, AddressOut
from app.schemas.common import PaginatedResponse
from app.core.exceptions import NotFoundError

router = APIRouter()


async def _get_patient(user_id: str, db: AsyncSession) -> PatientProfile:
    result = await db.execute(select(PatientProfile).where(PatientProfile.user_id == user_id))
    patient = result.scalar_one_or_none()
    if not patient:
        raise NotFoundError("Patient profile")
    return patient


@router.get("/me", response_model=PatientProfileOut)
async def get_my_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    patient = await _get_patient(current_user.id, db)
    base = PatientProfileOut.model_validate(patient)
    return base.model_copy(update={"has_pin": bool(patient.pin_hash)})


@router.put("/me", response_model=PatientProfileOut)
async def update_my_profile(
    data: PatientProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    for field, value in data.model_dump(exclude_unset=True).items():
        setattr(patient, field, value)
    await db.flush()
    await db.commit()
    await db.refresh(patient)
    return patient


@router.post("/me/addresses", response_model=AddressOut, status_code=201)
async def add_address(
    data: AddressCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    if data.is_default:
        # Clear existing default
        existing = await db.execute(select(Address).where(Address.patient_id == patient.id, Address.is_default == True))
        for addr in existing.scalars():
            addr.is_default = False

    address = Address(
        patient_id=patient.id,
        label=data.label,
        line1=data.line1,
        line2=data.line2,
        district=data.district,
        city=data.city,
        latitude=data.latitude,
        longitude=data.longitude,
        is_default=data.is_default,
    )
    db.add(address)
    await db.commit()
    await db.refresh(address)
    return address


@router.get("/me/addresses", response_model=list[AddressOut])
async def list_addresses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    result = await db.execute(select(Address).where(Address.patient_id == patient.id))
    return list(result.scalars().all())


@router.patch("/me/addresses/{address_id}", response_model=AddressOut)
async def update_address(
    address_id: str,
    data: AddressUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.patient_id == patient.id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise NotFoundError("Address")
    patch = data.model_dump(exclude_unset=True)
    if patch.get("is_default"):
        existing = await db.execute(
            select(Address).where(Address.patient_id == patient.id, Address.is_default == True)
        )
        for addr in existing.scalars():
            addr.is_default = False
    for field, value in patch.items():
        setattr(address, field, value)
    if patch.get("is_default"):
        patient.default_address_id = address.id
    await db.commit()
    await db.refresh(address)
    return address


@router.delete("/me/addresses/{address_id}", status_code=204)
async def delete_address(
    address_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    result = await db.execute(
        select(Address).where(Address.id == address_id, Address.patient_id == patient.id)
    )
    address = result.scalar_one_or_none()
    if not address:
        raise NotFoundError("Address")
    if patient.default_address_id == address.id:
        patient.default_address_id = None
    await db.delete(address)
    await db.commit()


# ── Prescriptions (Phase 4) ──────────────────────────────────────────────
from app.schemas.prescription import PrescriptionOut, PrescriptionUploadCreate  # noqa: E402
from app.services.prescription_service import PrescriptionService  # noqa: E402


@router.get("/me/prescriptions", response_model=list[PrescriptionOut])
async def list_my_prescriptions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    return await PrescriptionService(db).list_for_patient(patient.id)


@router.post(
    "/me/prescriptions/upload",
    response_model=PrescriptionOut,
    status_code=201,
)
async def upload_my_prescription(
    data: PrescriptionUploadCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await PrescriptionService(db).patient_upload(data, current_user)


# -- Phase 5: recommendations shortcut ------------------------------------
from app.schemas.recommendation import RecommendationResponse  # noqa: E402
from app.services.recommendation_service import RecommendationService  # noqa: E402


@router.get(
    "/me/prescriptions/{prescription_id}/recommendations",
    response_model=RecommendationResponse,
)
async def get_my_prescription_recommendations(
    prescription_id: str,
    lat: float = Query(default=-1.9441, ge=-90.0, le=90.0),
    lon: float = Query(default=30.0619, ge=-180.0, le=180.0),
    preferred_delivery: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await RecommendationService(db).recommend_for_prescription(
        prescription_id=prescription_id,
        actor=current_user,
        latitude=lat,
        longitude=lon,
        preferred_delivery=preferred_delivery,
    )


# -- Phase 6: orders shortcuts -------------------------------------------
from app.schemas.order import OrderCreate, OrderOut
from app.schemas.order_visibility import order_out_for_patient
from app.services.order_service import OrderService


@router.get("/me/orders", response_model=PaginatedResponse[OrderOut])
async def list_my_orders(
    offset: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    items, total = await OrderService(db).list_patient_orders(
        current_user, offset=offset, limit=limit
    )
    return PaginatedResponse(
        items=[order_out_for_patient(o) for o in items],
        total=total,
        offset=offset,
        limit=limit,
    )


@router.post("/me/orders", response_model=OrderOut, status_code=201)
async def create_my_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await OrderService(db).create_order(data, current_user)
    return order_out_for_patient(order)


from app.schemas.payment import PaymentInitiate, PaymentInitiateOut, PaymentStatusOut, ManualPaymentSubmit  # noqa: E402
from app.services.payments.payment_service import PaymentService  # noqa: E402


async def _initiate_order_payment(
    order_id: str,
    data: PaymentInitiate,
    current_user: User,
    db: AsyncSession,
) -> PaymentInitiateOut:
    return await PaymentService(db).initiate_payment(
        order_id,
        current_user,
        phone=data.phone,
        email=data.email,
        name=data.name,
        redirect_url=data.redirect_url,
        payment_method=data.payment_method,
    )


@router.post(
    "/me/orders/{order_id}/payments/initiate",
    response_model=PaymentInitiateOut,
)
async def initiate_my_order_payment(
    order_id: str,
    data: PaymentInitiate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _initiate_order_payment(order_id, data, current_user, db)


@router.post(
    "/me/orders/{order_id}/payments/flutterwave/initiate",
    response_model=PaymentInitiateOut,
)
async def initiate_my_order_flutterwave_payment(
    order_id: str,
    data: PaymentInitiate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Backward-compatible alias for MTN MADAPI / Pesapal checkout."""
    return await _initiate_order_payment(order_id, data, current_user, db)


@router.get(
    "/me/orders/{order_id}/payments/status",
    response_model=PaymentStatusOut,
)
async def get_my_order_payment_status(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await PaymentService(db).get_status(order_id, current_user)


@router.post(
    "/me/orders/{order_id}/payments/manual",
    response_model=PaymentStatusOut,
)
async def submit_my_order_manual_payment(
    order_id: str,
    data: ManualPaymentSubmit,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await PaymentService(db).submit_manual_payment(
        order_id,
        current_user,
        proof_urls=data.proof_urls,
        patient_note=data.patient_note,
        claimed_reference=data.claimed_reference,
        phone=data.phone,
    )


from app.schemas.order import ReassignPharmacyRequest, ReassignmentOptionsOut  # noqa: E402


@router.get(
    "/me/orders/{order_id}/reassignment-options",
    response_model=ReassignmentOptionsOut,
)
async def get_my_order_reassignment_options(
    order_id: str,
    include_cheaper_with_refund: bool = Query(False),
    include_below_paid_without_change: bool = Query(False),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await OrderService(db).get_reassignment_options(
        order_id,
        current_user,
        include_cheaper_with_refund=include_cheaper_with_refund,
        include_below_paid_without_change=include_below_paid_without_change,
    )


@router.post("/me/orders/{order_id}/reassign-pharmacy", response_model=OrderOut)
async def reassign_my_order_pharmacy(
    order_id: str,
    data: ReassignPharmacyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    order = await OrderService(db).reassign_pharmacy(order_id, data, current_user)
    return order_out_for_patient(order)


# -- Phase 7: delivery QR for patient --------------------------------------
from app.schemas.delivery import DeliveryQRForPatient  # noqa: E402
from app.services.delivery_service import DeliveryService  # noqa: E402


@router.get(
    "/me/orders/{order_id}/delivery-qr",
    response_model=DeliveryQRForPatient,
)
async def get_my_order_delivery_qr(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await DeliveryService(db).get_qr_for_patient(order_id, current_user)


# ── Server-synced PIN (matches portal / app SHA-256 hashes) ───────────────
import hashlib  # noqa: E402

from app.core.exceptions import AuthenticationError, ValidationError  # noqa: E402
from app.schemas.user import PinChangeRequest, PinSetRequest, PinVerifyRequest  # noqa: E402
from app.services.audit_service import AuditService  # noqa: E402


def _hash_pin(pin: str) -> str:
    return hashlib.sha256(pin.encode("utf-8")).hexdigest()


@router.put("/me/pin", status_code=200)
async def set_my_pin(
    data: PinSetRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    patient.pin_hash = _hash_pin(data.pin)
    await db.flush()
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="patient.pin.set",
        entity_type="PatientProfile",
        entity_id=patient.id,
    )
    return {"status": "ok", "has_pin": True}


@router.post("/me/pin/verify", status_code=200)
async def verify_my_pin(
    data: PinVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    if not patient.pin_hash:
        return {"status": "ok", "verified": True}
    if _hash_pin(data.pin) != patient.pin_hash:
        raise AuthenticationError("Incorrect PIN")
    return {"status": "ok", "verified": True}


@router.put("/me/pin/change", status_code=200)
async def change_my_pin(
    data: PinChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    if not patient.pin_hash:
        raise ValidationError("No PIN is set")
    if _hash_pin(data.current_pin) != patient.pin_hash:
        raise AuthenticationError("Current PIN is incorrect")
    patient.pin_hash = _hash_pin(data.new_pin)
    await db.flush()
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="patient.pin.change",
        entity_type="PatientProfile",
        entity_id=patient.id,
    )
    return {"status": "ok"}


@router.delete("/me/pin", status_code=200)
async def clear_my_pin(
    data: PinVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    patient = await _get_patient(current_user.id, db)
    if patient.pin_hash and _hash_pin(data.pin) != patient.pin_hash:
        raise AuthenticationError("Incorrect PIN")
    patient.pin_hash = None
    await db.flush()
    await AuditService(db).log(
        actor_user_id=current_user.id,
        action="patient.pin.clear",
        entity_type="PatientProfile",
        entity_id=patient.id,
    )
    return {"status": "ok", "has_pin": False}

