from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.models.patient import PatientProfile, Address
from app.schemas.patient import PatientProfileOut, PatientProfileUpdate, AddressCreate, AddressOut
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
    return await _get_patient(current_user.id, db)


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
    lat: float = Query(..., ge=-90.0, le=90.0),
    lon: float = Query(..., ge=-180.0, le=180.0),
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
    return PaginatedResponse(items=items, total=total, offset=offset, limit=limit)


@router.post("/me/orders", response_model=OrderOut, status_code=201)
async def create_my_order(
    data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await OrderService(db).create_order(data, current_user)


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

