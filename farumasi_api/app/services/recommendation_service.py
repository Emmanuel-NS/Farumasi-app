from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import List, Optional, Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.constants import (
    EntityStatus,
    ListingAvailability,
    ProductApprovalStatus,
    UserRole,
)
from app.core.exceptions import (
    AuthorizationError,
    NotFoundError,
    ValidationError,
)
from app.models.doctor import DoctorProfile
from app.models.partner import PartnerCompany
from app.models.patient import PatientProfile
from app.models.pharmacy import Pharmacy
from app.models.prescription import DigitalPrescription
from app.models.product import ProductCatalogueItem, ProductListing
from app.models.recommendation import PharmacyRecommendation
from app.models.user import User
from app.schemas.recommendation import (
    AdHocPrescriptionItem,
    RecommendationRequest,
    RecommendationResponse,
    RecommendedProviderOut,
)
from app.utils.scoring import (
    PharmacyCandidate,
    ScoredProvider,
    score_providers,
)


_REVIEWER_ROLES = {UserRole.PHARMACIST, UserRole.SUPER_ADMIN}
_NEAR_EXPIRY_DAYS = 30


class RecommendationService:
    """Phase-5 intelligent pharmacy recommendation engine."""

    def __init__(self, db: AsyncSession):
        self.db = db

    # ── Public entry ────────────────────────────────────────────────────
    async def recommend(
        self,
        data: RecommendationRequest,
        actor: User,
    ) -> RecommendationResponse:
        # Resolve prescription (if any) + access control + items
        rx: Optional[DigitalPrescription] = None
        patient: Optional[PatientProfile] = None

        if data.prescription_id:
            rx = await self._load_prescription(data.prescription_id)
            await self._assert_can_view(rx, actor)
            patient = rx.patient
            required_product_ids = await self._resolve_required_from_rx(rx)
        else:
            # Ad-hoc items — caller must be the patient themselves
            if actor.role != UserRole.PATIENT:
                raise AuthorizationError(
                    "Only patients may request ad-hoc recommendations without a prescription"
                )
            patient = await self._get_patient_for_user(actor)
            required_product_ids = await self._resolve_required_from_items(
                data.prescription_items or []
            )

        if not required_product_ids:
            raise ValidationError(
                "No approved catalogue products matched the prescription items"
            )

        # Resolve insurance: explicit override > patient profile fallback
        insurance_id = (
            data.patient_insurance_provider_id
            or (patient.insurance_provider_id if patient else None)
        )

        # Load candidates (active pharmacies + active partners)
        candidates = await self._build_candidates(required_product_ids)

        # Score & rank
        scored = score_providers(
            candidates,
            required_product_ids,
            data.patient_location.latitude,
            data.patient_location.longitude,
            patient_insurance_provider_id=insurance_id,
            preferred_delivery=data.preferred_delivery,
        )

        top3 = scored[:3]

        # Persist (best-effort — never commits, only flushes)
        if patient is not None:
            await self._persist(top3, prescription_id=data.prescription_id, patient_id=patient.id)

        return RecommendationResponse(
            prescription_id=data.prescription_id,
            top_recommendations=[
                RecommendedProviderOut(
                    rank=r.rank,
                    provider_type=r.provider_type,
                    provider_id=r.provider_id,
                    provider_name=r.provider_name,
                    total_score=r.total_score,
                    availability_score=r.availability_score,
                    insurance_score=r.insurance_score,
                    price_score=r.price_score,
                    location_score=r.location_score,
                    delivery_score=r.delivery_score,
                    reliability_score=r.reliability_score,
                    expiry_safety_score=r.expiry_safety_score,
                    estimated_total_price=r.estimated_total_price,
                    estimated_distance_km=r.estimated_distance_km,
                    can_fulfill_complete_prescription=r.can_fulfill_complete_prescription,
                    available_items_count=r.available_items_count,
                    total_items_count=r.total_items_count,
                    reasons=r.reasons,
                    warnings=r.warnings,
                )
                for r in top3
            ],
            total_candidates_evaluated=len(candidates),
        )

    # ── Convenience for endpoint shortcuts ──────────────────────────────
    async def recommend_for_prescription(
        self,
        *,
        prescription_id: str,
        actor: User,
        latitude: float,
        longitude: float,
        preferred_delivery: bool = False,
    ) -> RecommendationResponse:
        from app.schemas.recommendation import PatientLocation

        req = RecommendationRequest(
            prescription_id=prescription_id,
            patient_location=PatientLocation(latitude=latitude, longitude=longitude),
            preferred_delivery=preferred_delivery,
        )
        return await self.recommend(req, actor)

    # ── Internals ───────────────────────────────────────────────────────
    async def _load_prescription(self, prescription_id: str) -> DigitalPrescription:
        result = await self.db.execute(
            select(DigitalPrescription)
            .where(DigitalPrescription.id == prescription_id)
            .options(
                selectinload(DigitalPrescription.items),
                selectinload(DigitalPrescription.patient),
            )
        )
        rx = result.scalar_one_or_none()
        if not rx:
            raise NotFoundError("Prescription", prescription_id)
        return rx

    async def _assert_can_view(self, rx: DigitalPrescription, actor: User) -> None:
        role = actor.role
        if role == UserRole.SUPER_ADMIN or role in _REVIEWER_ROLES:
            return
        if role == UserRole.PATIENT:
            if rx.patient and rx.patient.user_id == actor.id:
                return
            raise AuthorizationError(
                "Patients can only access recommendations for their own prescriptions"
            )
        if role == UserRole.DOCTOR:
            if rx.doctor_id is None:
                raise AuthorizationError("Not allowed to access this prescription")
            r = await self.db.execute(
                select(DoctorProfile.user_id).where(DoctorProfile.id == rx.doctor_id)
            )
            owner_user_id = r.scalar_one_or_none()
            if owner_user_id == actor.id:
                return
            raise AuthorizationError(
                "Doctors can only access prescriptions they created"
            )
        raise AuthorizationError("Not allowed to access this prescription")

    async def _get_patient_for_user(self, actor: User) -> PatientProfile:
        result = await self.db.execute(
            select(PatientProfile).where(PatientProfile.user_id == actor.id)
        )
        patient = result.scalar_one_or_none()
        if not patient:
            raise NotFoundError("Patient profile")
        return patient

    async def _resolve_required_from_rx(
        self, rx: DigitalPrescription
    ) -> List[str]:
        ids: List[str] = []
        for item in rx.items:
            if item.product_id:
                ids.append(item.product_id)
                continue
            pid = await self._lookup_product_id_by_name(item.medicine_name)
            if pid:
                ids.append(pid)
        return ids

    async def _resolve_required_from_items(
        self, items: Sequence[AdHocPrescriptionItem]
    ) -> List[str]:
        ids: List[str] = []
        for it in items:
            if it.product_id:
                ids.append(it.product_id)
                continue
            pid = await self._lookup_product_id_by_name(it.medicine_name)
            if pid:
                ids.append(pid)
        return ids

    async def _lookup_product_id_by_name(self, name: str) -> Optional[str]:
        if not name:
            return None
        result = await self.db.execute(
            select(ProductCatalogueItem.id).where(
                ProductCatalogueItem.name.ilike(f"%{name}%"),
                ProductCatalogueItem.approval_status == ProductApprovalStatus.APPROVED,
            )
        )
        return result.scalars().first()

    async def _build_candidates(
        self, required_product_ids: List[str]
    ) -> List[PharmacyCandidate]:
        now = datetime.now(timezone.utc)
        near_expiry_cutoff = now + timedelta(days=_NEAR_EXPIRY_DAYS)
        required_set = set(required_product_ids)

        pharmacies = (
            (
                await self.db.execute(
                    select(Pharmacy)
                    .where(Pharmacy.status == EntityStatus.ACTIVE)
                    .options(
                        selectinload(Pharmacy.product_listings).selectinload(
                            ProductListing.product
                        ),
                        selectinload(Pharmacy.accepted_insurances),
                    )
                )
            )
            .scalars()
            .all()
        )

        partners = (
            (
                await self.db.execute(
                    select(PartnerCompany)
                    .where(PartnerCompany.status == EntityStatus.ACTIVE)
                    .options(
                        selectinload(PartnerCompany.product_listings).selectinload(
                            ProductListing.product
                        )
                    )
                )
            )
            .scalars()
            .all()
        )

        candidates: List[PharmacyCandidate] = []

        for pharmacy in pharmacies:
            listings, near_expiry = self._extract_listings(
                pharmacy.product_listings, required_set, now
            )
            insurance_ids = [ins.id for ins in pharmacy.accepted_insurances]
            candidates.append(
                PharmacyCandidate(
                    provider_type="pharmacy",
                    provider_id=pharmacy.id,
                    provider_name=pharmacy.name,
                    latitude=float(pharmacy.latitude) if pharmacy.latitude is not None else None,
                    longitude=float(pharmacy.longitude) if pharmacy.longitude is not None else None,
                    accepts_delivery=bool(pharmacy.accepts_delivery),
                    is_open=bool(pharmacy.is_open),
                    accepted_insurance_ids=insurance_ids,
                    available_listings=listings,
                    near_expiry_product_ids=near_expiry,
                )
            )

        for partner in partners:
            listings, near_expiry = self._extract_listings(
                partner.product_listings, required_set, now
            )
            candidates.append(
                PharmacyCandidate(
                    provider_type="partner",
                    provider_id=partner.id,
                    provider_name=partner.name,
                    latitude=float(partner.latitude) if getattr(partner, "latitude", None) is not None else None,
                    longitude=float(partner.longitude) if getattr(partner, "longitude", None) is not None else None,
                    accepts_delivery=True,
                    is_open=True,
                    accepted_insurance_ids=[],
                    available_listings=listings,
                    near_expiry_product_ids=near_expiry,
                )
            )

        return candidates

    def _extract_listings(
        self,
        listings: Sequence[ProductListing],
        required_set: set,
        now: datetime,
    ):
        """Filter listings down to those that may fulfill required items.

        Excludes:
          - Listings not AVAILABLE
          - Listings with status != ACTIVE
          - Listings of products not APPROVED
          - Stock <= 0
          - Expired stock
        Returns (available_listings_tuples, near_expiry_product_ids).
        """
        kept: List[tuple] = []
        near_expiry: List[str] = []
        for l in listings:
            if l.product_id not in required_set:
                continue
            if l.availability_status != ListingAvailability.AVAILABLE:
                continue
            if getattr(l, "status", EntityStatus.ACTIVE) != EntityStatus.ACTIVE:
                continue
            if (l.stock_quantity or 0) <= 0:
                continue
            product = getattr(l, "product", None)
            if product is not None and product.approval_status != ProductApprovalStatus.APPROVED:
                continue
            expiry = l.expiry_date
            if expiry is not None:
                expiry_dt = expiry if isinstance(expiry, datetime) else datetime(
                    expiry.year, expiry.month, expiry.day, tzinfo=timezone.utc
                )
                if expiry_dt.tzinfo is None:
                    expiry_dt = expiry_dt.replace(tzinfo=timezone.utc)
                if expiry_dt <= now:
                    continue
                if (expiry_dt - now).days < _NEAR_EXPIRY_DAYS:
                    near_expiry.append(l.product_id)
            kept.append((l.product_id, float(l.price), l.stock_quantity, l.expiry_date))
        return kept, near_expiry

    async def _persist(
        self,
        scored: Sequence[ScoredProvider],
        *,
        prescription_id: Optional[str],
        patient_id: str,
    ) -> None:
        for rec in scored:
            row = PharmacyRecommendation(
                prescription_id=prescription_id,
                patient_id=patient_id,
                pharmacy_id=rec.provider_id if rec.provider_type == "pharmacy" else None,
                partner_company_id=rec.provider_id if rec.provider_type == "partner" else None,
                total_score=rec.total_score,
                availability_score=rec.availability_score,
                insurance_score=rec.insurance_score,
                price_score=rec.price_score,
                location_score=rec.location_score,
                delivery_score=rec.delivery_score,
                reliability_score=rec.reliability_score,
                expiry_safety_score=rec.expiry_safety_score,
                reasons=rec.reasons,
                warnings=rec.warnings,
                estimated_total_price=rec.estimated_total_price,
                estimated_distance_km=rec.estimated_distance_km,
                can_fulfill_complete_prescription=rec.can_fulfill_complete_prescription,
            )
            self.db.add(row)
        await self.db.flush()
