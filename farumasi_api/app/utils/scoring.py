from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime
from typing import List, Literal, Optional

from app.utils.distance import haversine_km, location_score


# Phase-5 weights per audit:
#   availability 40 / insurance 20 / price 15 / location 10 /
#   delivery 5 / reliability 5 / expiry_safety 5
WEIGHTS = {
    "availability": 0.40,
    "insurance": 0.20,
    "price": 0.15,
    "location": 0.10,
    "delivery": 0.05,
    "reliability": 0.05,
    "expiry_safety": 0.05,
}


@dataclass
class PharmacyCandidate:
    """Provider data for scoring. Listings must be pre-filtered upstream."""

    provider_type: Literal["pharmacy", "partner"]
    provider_id: str
    provider_name: str
    latitude: Optional[float]
    longitude: Optional[float]
    accepts_delivery: bool
    is_open: bool
    accepted_insurance_ids: List[str] = field(default_factory=list)
    # tuples of (product_id, price, stock, expiry_date | None)
    available_listings: List[tuple] = field(default_factory=list)
    near_expiry_product_ids: List[str] = field(default_factory=list)


@dataclass
class ScoredProvider:
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
    estimated_total_price: Optional[float]
    estimated_distance_km: Optional[float]
    can_fulfill_complete_prescription: bool
    available_items_count: int
    total_items_count: int
    reasons: List[str]
    warnings: List[str]


def score_providers(
    candidates: List[PharmacyCandidate],
    required_product_ids: List[str],
    patient_lat: float,
    patient_lon: float,
    *,
    patient_insurance_provider_id: Optional[str] = None,
    preferred_delivery: bool = False,
    max_price_reference: float = 100_000.0,
) -> List[ScoredProvider]:
    """Score and rank candidates descending. Caller slices to top-N."""
    total_items = len(required_product_ids)
    has_insurance = bool(patient_insurance_provider_id)

    # Reference max price for normalisation
    all_prices: List[float] = []
    for c in candidates:
        price = _estimate_total(c, required_product_ids)
        if price is not None:
            all_prices.append(price)
    max_price = max(all_prices) if all_prices else max_price_reference

    scored: List[ScoredProvider] = []
    for candidate in candidates:
        reasons: List[str] = []
        warnings: List[str] = []

        # ── availability ────────────────────────────────────────────────
        available_ids = {l[0] for l in candidate.available_listings}
        fulfillable = [pid for pid in required_product_ids if pid in available_ids]
        available_count = len(fulfillable)
        avail_ratio = available_count / total_items if total_items else 0.0
        avail_score = round(avail_ratio * 100, 2)
        can_fulfill = total_items > 0 and available_count == total_items

        if total_items == 0:
            pass
        elif can_fulfill:
            reasons.append("Has all prescribed medicines")
        elif available_count > 0:
            reasons.append(
                f"Has {available_count} of {total_items} prescribed medicines"
            )
            warnings.append(
                f"Only {available_count}/{total_items} medicines available — partial fulfillment"
            )
        else:
            warnings.append("None of the prescribed medicines are available")

        # ── insurance ───────────────────────────────────────────────────
        if has_insurance and patient_insurance_provider_id in candidate.accepted_insurance_ids:
            ins_score = 100.0
            reasons.append("Accepts patient insurance")
        elif has_insurance:
            ins_score = 0.0
            warnings.append("Does not accept patient insurance")
        else:
            ins_score = 50.0  # neutral

        # ── price ───────────────────────────────────────────────────────
        estimated_price = _estimate_total(candidate, required_product_ids)
        if estimated_price is not None and max_price > 0:
            price_sc = round((1 - estimated_price / max_price) * 100, 2)
            price_sc = max(0.0, min(100.0, price_sc))
            reasons.append(f"Estimated total: RWF {estimated_price:,.0f}")
        else:
            price_sc = 30.0
            warnings.append("Price could not be estimated for this provider")

        # ── location ────────────────────────────────────────────────────
        if candidate.latitude is not None and candidate.longitude is not None:
            dist_km = haversine_km(
                patient_lat, patient_lon, candidate.latitude, candidate.longitude
            )
            loc_sc = location_score(dist_km)
            reasons.append(f"Distance: {dist_km:.1f} km")
        else:
            dist_km = None
            loc_sc = 30.0
            warnings.append("Provider location unknown")

        # ── delivery ────────────────────────────────────────────────────
        if preferred_delivery:
            if candidate.accepts_delivery:
                del_score = 100.0
                reasons.append("Supports delivery")
            else:
                del_score = 0.0
                warnings.append("Delivery requested but provider is pickup only")
        else:
            del_score = 100.0 if candidate.accepts_delivery else 50.0

        # ── reliability ─────────────────────────────────────────────────
        if candidate.is_open:
            rel_score = 100.0
        else:
            rel_score = 0.0
            warnings.append("Provider is currently closed")

        # ── expiry safety ───────────────────────────────────────────────
        relevant_near_expiry = [
            pid for pid in candidate.near_expiry_product_ids if pid in fulfillable
        ]
        if not relevant_near_expiry:
            exp_score = 100.0
        else:
            exp_score = max(0.0, 100.0 - len(relevant_near_expiry) * 25.0)
            warnings.append(
                f"{len(relevant_near_expiry)} item(s) expire within 30 days"
            )

        total = round(
            WEIGHTS["availability"] * avail_score
            + WEIGHTS["insurance"] * ins_score
            + WEIGHTS["price"] * price_sc
            + WEIGHTS["location"] * loc_sc
            + WEIGHTS["delivery"] * del_score
            + WEIGHTS["reliability"] * rel_score
            + WEIGHTS["expiry_safety"] * exp_score,
            2,
        )

        scored.append(
            ScoredProvider(
                rank=0,
                provider_type=candidate.provider_type,
                provider_id=candidate.provider_id,
                provider_name=candidate.provider_name,
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
                available_items_count=available_count,
                total_items_count=total_items,
                reasons=reasons,
                warnings=warnings,
            )
        )

    scored.sort(key=lambda s: s.total_score, reverse=True)
    for idx, sp in enumerate(scored, start=1):
        sp.rank = idx
    return scored


def _estimate_total(
    candidate: PharmacyCandidate, required_product_ids: List[str]
) -> Optional[float]:
    """Sum cheapest price for each required product across candidate listings."""
    listing_by_product: dict[str, float] = {}
    for listing in candidate.available_listings:
        pid, price = listing[0], listing[1]
        if pid not in listing_by_product or price < listing_by_product[pid]:
            listing_by_product[pid] = price
    total = 0.0
    found = 0
    for pid in required_product_ids:
        if pid in listing_by_product:
            total += listing_by_product[pid]
            found += 1
    return round(total, 2) if found > 0 else None


# Legacy aliases for backward compatibility
score_pharmacies = score_providers
ScoredPharmacy = ScoredProvider
