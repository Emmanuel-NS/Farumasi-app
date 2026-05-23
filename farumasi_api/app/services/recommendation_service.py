from __future__ import annotations

from typing import List, Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import NotFoundError, ValidationError
from app.models.pharmacy import Pharmacy
from app.models.partner import PartnerCompany
from app.models.product import ProductCatalogueItem, ProductListing
from app.models.prescription import DigitalPrescription
from app.models.recommendation import PharmacyRecommendation
from app.schemas.recommendation import RecommendationRequest, RecommendationResponse, RecommendedPharmacyOut
from app.utils.scoring import PharmacyCandidate, score_pharmacies
from app.core.constants import ListingAvailability, EntityStatus


class RecommendationService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def recommend(
        self,
        data: RecommendationRequest,
        patient_id: str,
    ) -> RecommendationResponse:
        # ── Step 1: Resolve required product IDs ─────────────────────────
        required_product_ids: List[str] = []

        if data.prescription_id:
            rx_result = await self.db.execute(
                select(DigitalPrescription)
                .where(DigitalPrescription.id == data.prescription_id)
                .options(selectinload(DigitalPrescription.items))
            )
            rx = rx_result.scalar_one_or_none()
            if not rx:
                raise NotFoundError("Prescription", data.prescription_id)

            for item in rx.items:
                if item.product_id:
                    required_product_ids.append(item.product_id)
                else:
                    # Try to find product by name
                    p_result = await self.db.execute(
                        select(ProductCatalogueItem).where(
                            ProductCatalogueItem.name.ilike(f"%{item.medicine_name}%")
                        )
                    )
                    product = p_result.scalar_one_or_none()
                    if product:
                        required_product_ids.append(product.id)

        elif data.medicine_names:
            for name in data.medicine_names:
                p_result = await self.db.execute(
                    select(ProductCatalogueItem).where(
                        ProductCatalogueItem.name.ilike(f"%{name}%")
                    )
                )
                product = p_result.scalar_one_or_none()
                if product:
                    required_product_ids.append(product.id)

        if not required_product_ids:
            raise ValidationError("No matching products found for recommendation")

        # ── Step 2: Load all active pharmacies with their listings ────────
        pharmacies_result = await self.db.execute(
            select(Pharmacy)
            .where(Pharmacy.status == EntityStatus.ACTIVE)
            .options(
                selectinload(Pharmacy.product_listings).selectinload(ProductListing.product),
                selectinload(Pharmacy.accepted_insurances),
            )
        )
        pharmacies = list(pharmacies_result.scalars().all())

        partners_result = await self.db.execute(
            select(PartnerCompany)
            .where(PartnerCompany.status == EntityStatus.ACTIVE)
            .options(selectinload(PartnerCompany.product_listings).selectinload(ProductListing.product))
        )
        partners = list(partners_result.scalars().all())

        # ── Step 3: Build candidates ─────────────────────────────────────
        candidates: List[PharmacyCandidate] = []

        for pharmacy in pharmacies:
            insurance_ids = [ins.id for ins in pharmacy.accepted_insurances]
            listings = [
                (l.product_id, float(l.price), l.stock_quantity, l.expiry_date)
                for l in pharmacy.product_listings
                if l.availability_status == ListingAvailability.AVAILABLE
                and l.status == EntityStatus.ACTIVE
            ]
            candidates.append(
                PharmacyCandidate(
                    pharmacy_id=pharmacy.id,
                    partner_company_id=None,
                    business_name=pharmacy.name,
                    latitude=float(pharmacy.latitude) if pharmacy.latitude else None,
                    longitude=float(pharmacy.longitude) if pharmacy.longitude else None,
                    accepts_delivery=pharmacy.accepts_delivery,
                    is_open=pharmacy.is_open,
                    accepted_insurance_ids=insurance_ids,
                    available_listings=listings,
                )
            )

        for partner in partners:
            listings = [
                (l.product_id, float(l.price), l.stock_quantity, l.expiry_date)
                for l in partner.product_listings
                if l.availability_status == ListingAvailability.AVAILABLE
            ]
            candidates.append(
                PharmacyCandidate(
                    pharmacy_id=None,
                    partner_company_id=partner.id,
                    business_name=partner.name,
                    latitude=float(partner.latitude) if partner.latitude else None,
                    longitude=float(partner.longitude) if partner.longitude else None,
                    accepts_delivery=True,
                    is_open=True,
                    accepted_insurance_ids=[],
                    available_listings=listings,
                )
            )

        # ── Step 4: Score ─────────────────────────────────────────────────
        scored = score_pharmacies(
            candidates,
            required_product_ids,
            data.patient_latitude,
            data.patient_longitude,
            patient_insurance_provider_id=data.patient_insurance_provider_id,
        )

        top3 = scored[:3]

        # ── Step 5: Persist recommendations ──────────────────────────────
        for rec in top3:
            db_rec = PharmacyRecommendation(
                prescription_id=data.prescription_id,
                patient_id=patient_id,
                pharmacy_id=rec.pharmacy_id,
                partner_company_id=rec.partner_company_id,
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
            self.db.add(db_rec)

        await self.db.flush()

        # ── Step 6: Return (names hidden — revealed after payment) ────────
        out = [
            RecommendedPharmacyOut(
                pharmacy_id=r.pharmacy_id,
                partner_company_id=r.partner_company_id,
                # Name deliberately excluded from response; caller exposes on completion
                business_name="",
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
                reasons=r.reasons,
                warnings=r.warnings,
                accepts_insurance=r.accepts_insurance,
                accepts_delivery=r.accepts_delivery,
                is_open=r.is_open,
            )
            for r in top3
        ]

        return RecommendationResponse(
            prescription_id=data.prescription_id,
            top_recommendations=out,
            total_candidates_evaluated=len(candidates),
        )
