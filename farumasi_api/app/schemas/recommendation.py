from __future__ import annotations

from typing import List, Optional

from app.schemas.common import FarumasiBaseModel


class RecommendationRequest(FarumasiBaseModel):
    prescription_id: Optional[str] = None
    # If no prescription_id, supply ad-hoc medicine names
    medicine_names: Optional[List[str]] = None
    patient_latitude: float
    patient_longitude: float
    patient_insurance_provider_id: Optional[str] = None
    patient_budget_level: Optional[str] = None   # low | medium | high
    preferred_delivery: bool = True


class RecommendedPharmacyOut(FarumasiBaseModel):
    pharmacy_id: Optional[str] = None
    partner_company_id: Optional[str] = None
    business_name: str
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
    reasons: List[str] = []
    warnings: List[str] = []
    accepts_insurance: bool = False
    accepts_delivery: bool = False
    is_open: bool = False


class RecommendationResponse(FarumasiBaseModel):
    prescription_id: Optional[str] = None
    top_recommendations: List[RecommendedPharmacyOut]
    total_candidates_evaluated: int
    note: str = "Pharmacy names are hidden until after payment is completed."
