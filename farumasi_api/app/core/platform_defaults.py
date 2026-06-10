"""Default platform configuration — overridden by `platform_settings` rows when present."""

from __future__ import annotations

from typing import Any, TypedDict


class DeliveryTier(TypedDict):
    max_km: float
    fee_rwf: float


DEFAULT_DELIVERY_CONFIG: dict[str, Any] = {
    "tiers": [
        {"max_km": 10.0, "fee_rwf": 1500.0},
        {"max_km": 15.0, "fee_rwf": 2000.0},
        {"max_km": 20.0, "fee_rwf": 2500.0},
    ],
    "base_over_20_rwf": 2500.0,
    "extra_km_fee_rwf": 150.0,
    "max_delivery_km": 20.0,
    "road_distance_factor": 1.3,
    "unpaid_order_ttl_minutes": 30,
    "prescription_valid_days": 90,
}

SUPPORTED_LANGUAGES = ("en", "rw", "fr", "sw")
