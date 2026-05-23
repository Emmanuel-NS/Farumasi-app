from __future__ import annotations

from typing import List, Literal, Optional

from pydantic import Field, model_validator

from app.schemas.common import FarumasiBaseModel


# ── Inputs ──────────────────────────────────────────────────────────────────
class PatientLocation(FarumasiBaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)


class AdHocPrescriptionItem(FarumasiBaseModel):
    medicine_name: str = Field(..., min_length=1)
    product_id: Optional[str] = None
    quantity: int = Field(1, ge=1)


class RecommendationRequest(FarumasiBaseModel):
    prescription_id: Optional[str] = None
    prescription_items: Optional[List[AdHocPrescriptionItem]] = None
    patient_location: PatientLocation
    patient_insurance_provider_id: Optional[str] = None
    patient_budget_level: Optional[str] = None  # low | medium | high
    preferred_delivery: bool = False

    @model_validator(mode="after")
    def _exactly_one_source(self) -> "RecommendationRequest":
        has_rx = self.prescription_id is not None
        has_items = bool(self.prescription_items)
        if has_rx == has_items:
            raise ValueError(
                "Provide exactly one of 'prescription_id' or 'prescription_items'"
            )
        return self


# ── Outputs ─────────────────────────────────────────────────────────────────
class RecommendedProviderOut(FarumasiBaseModel):
    id: Optional[str] = None  # persisted PharmacyRecommendation row id
    rank: int
    provider_type: Literal["pharmacy", "partner"]
    provider_id: str
    provider_name: str
    total_score: float
    availability_score: float
    insurance_score: float
    price_score: float
    location_score: float
    delivery_score: float
    reliability_score: float
    expiry_safety_score: float
    estimated_total_price: Optional[float] = None
    estimated_distance_km: Optional[float] = None
    can_fulfill_complete_prescription: bool
    available_items_count: int
    total_items_count: int
    reasons: List[str] = []
    warnings: List[str] = []


class RecommendationResponse(FarumasiBaseModel):
    prescription_id: Optional[str] = None
    top_recommendations: List[RecommendedProviderOut]
    total_candidates_evaluated: int
