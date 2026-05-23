from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional

from app.utils.distance import haversine_km, location_score


# ── Scoring weights (must sum to 1.0) ────────────────────────────────────────
WEIGHTS = {
    "insurance": 0.25,
    "availability": 0.25,
    "price": 0.20,
    "location": 0.15,
    "delivery": 0.07,
    "reliability": 0.05,
    "expiry_safety": 0.03,
}


@dataclass
class PharmacyCandidate:
    """Raw data about a pharmacy/partner for scoring."""

    pharmacy_id: Optional[str]
    partner_company_id: Optional[str]
    business_name: str
    latitude: Optional[float]
    longitude: Optional[float]
    accepts_delivery: bool
    is_open: bool
    # list of insurance provider IDs this pharmacy accepts
    accepted_insurance_ids: List[str] = field(default_factory=list)
    # list of (product_id, price, stock, expiry_date) tuples
    available_listings: List[tuple] = field(default_factory=list)


@dataclass
class ScoredPharmacy:
    pharmacy_id: Optional[str]
    partner_company_id: Optional[str]
    business_name: str
    total_score: float
    availability_score: float
    insurance_score: float
    price_score: float
    location_score: float
    delivery_score: float
    reliability_score: float
    expiry_safety_score: float
    estimated_total_price: Optional[float]
    estimated_distance_km: Optional[float]
    can_fulfill_complete_prescription: bool
    reasons: List[str]
    warnings: List[str]
    accepts_insurance: bool
    accepts_delivery: bool
    is_open: bool


def score_pharmacies(
    candidates: List[PharmacyCandidate],
    required_product_ids: List[str],
    patient_lat: float,
    patient_lon: float,
    patient_insurance_provider_id: Optional[str] = None,
    max_price_reference: float = 100_000.0,  # used to normalise price score
) -> List[ScoredPharmacy]:
    """
    Score a list of pharmacy candidates and return them sorted by total_score descending.
    Returns top candidates (caller should slice to top-3).

    Scoring dimensions (all 0-100):
    1. insurance_score  – pharmacy accepts patient insurance
    2. availability_score – % of required items available without expired stock
    3. price_score  – lower total price = higher score
    4. location_score  – closer = higher score
    5. delivery_score  – accepts delivery
    6. reliability_score  – is_open penalty if closed
    7. expiry_safety_score – no near-expiry / expired stock
    """
    now = datetime.now(timezone.utc)
    scored: List[ScoredPharmacy] = []

    all_prices: List[float] = []
    for c in candidates:
        price = _estimate_total(c, required_product_ids)
        if price is not None:
            all_prices.append(price)

    max_price = max(all_prices) if all_prices else max_price_reference

    for candidate in candidates:
        reasons: List[str] = []
        warnings: List[str] = []

        # ── Availability ─────────────────────────────────────────────────
        available_ids = {listing[0] for listing in candidate.available_listings}
        fulfillable = [pid for pid in required_product_ids if pid in available_ids]
        avail_ratio = len(fulfillable) / len(required_product_ids) if required_product_ids else 0.0
        avail_score = round(avail_ratio * 100, 2)
        can_fulfill = avail_ratio == 1.0

        if avail_ratio == 1.0:
            reasons.append("All medicines available")
        elif avail_ratio > 0.5:
            reasons.append(f"{len(fulfillable)}/{len(required_product_ids)} medicines available")
        else:
            warnings.append(f"Only {len(fulfillable)}/{len(required_product_ids)} medicines available")

        # ── Insurance ────────────────────────────────────────────────────
        if patient_insurance_provider_id and patient_insurance_provider_id in candidate.accepted_insurance_ids:
            ins_score = 100.0
            accepts_insurance = True
            reasons.append("Accepts your insurance")
        else:
            ins_score = 0.0
            accepts_insurance = False
            if patient_insurance_provider_id:
                warnings.append("Does not accept your insurance")

        # ── Price ────────────────────────────────────────────────────────
        estimated_price = _estimate_total(candidate, required_product_ids)
        if estimated_price is not None and max_price > 0:
            price_sc = round((1 - estimated_price / max_price) * 100, 2)
            price_sc = max(0.0, price_sc)
            reasons.append(f"Estimated total: RWF {estimated_price:,.0f}")
        else:
            price_sc = 50.0  # neutral when price unavailable
            estimated_price = None

        # ── Location ─────────────────────────────────────────────────────
        if candidate.latitude and candidate.longitude:
            dist_km = haversine_km(patient_lat, patient_lon, candidate.latitude, candidate.longitude)
            loc_sc = location_score(dist_km)
            reasons.append(f"Distance: {dist_km:.1f} km")
        else:
            dist_km = None
            loc_sc = 30.0  # mild penalty for unknown location

        # ── Delivery ────────────────────────────────────────────────────
        if candidate.accepts_delivery:
            del_score = 100.0
            reasons.append("Offers delivery")
        else:
            del_score = 0.0
            warnings.append("Pickup only")

        # ── Reliability (is_open) ───────────────────────────────────────
        if candidate.is_open:
            rel_score = 100.0
        else:
            rel_score = 0.0
            warnings.append("Currently closed")

        # ── Expiry Safety ───────────────────────────────────────────────
        expiry_issues = 0
        for listing in candidate.available_listings:
            # listing = (product_id, price, stock, expiry_date)
            if len(listing) >= 4 and listing[3] is not None:
                expiry_date = listing[3]
                if isinstance(expiry_date, datetime):
                    expiry_dt = expiry_date
                else:
                    expiry_dt = datetime(expiry_date.year, expiry_date.month, expiry_date.day, tzinfo=timezone.utc)

                if expiry_dt <= now:
                    # Never recommend expired stock
                    avail_score = 0.0
                    can_fulfill = False
                    warnings.append(f"Expired stock detected — product excluded")
                    expiry_issues += 1
                elif (expiry_dt - now).days < 30:
                    warnings.append("Some stock expires within 30 days")
                    expiry_issues += 1

        exp_score = 100.0 if expiry_issues == 0 else max(0.0, 100.0 - expiry_issues * 30)

        # ── Total ────────────────────────────────────────────────────────
        total = round(
            WEIGHTS["insurance"] * ins_score
            + WEIGHTS["availability"] * avail_score
            + WEIGHTS["price"] * price_sc
            + WEIGHTS["location"] * loc_sc
            + WEIGHTS["delivery"] * del_score
            + WEIGHTS["reliability"] * rel_score
            + WEIGHTS["expiry_safety"] * exp_score,
            2,
        )

        scored.append(
            ScoredPharmacy(
                pharmacy_id=candidate.pharmacy_id,
                partner_company_id=candidate.partner_company_id,
                business_name=candidate.business_name,
                total_score=total,
                availability_score=avail_score,
                insurance_score=ins_score,
                price_score=price_sc,
                location_score=loc_sc,
                delivery_score=del_score,
                reliability_score=rel_score,
                expiry_safety_score=exp_score,
                estimated_total_price=estimated_price,
                estimated_distance_km=dist_km,
                can_fulfill_complete_prescription=can_fulfill,
                reasons=reasons,
                warnings=warnings,
                accepts_insurance=accepts_insurance,
                accepts_delivery=candidate.accepts_delivery,
                is_open=candidate.is_open,
            )
        )

    return sorted(scored, key=lambda s: s.total_score, reverse=True)


def _estimate_total(candidate: PharmacyCandidate, required_product_ids: List[str]) -> Optional[float]:
    """Sum up prices for required products found in candidate's listings."""
    listing_by_product = {listing[0]: listing[1] for listing in candidate.available_listings}
    total = 0.0
    found = 0
    for pid in required_product_ids:
        if pid in listing_by_product:
            total += listing_by_product[pid]
            found += 1
    return round(total, 2) if found > 0 else None
