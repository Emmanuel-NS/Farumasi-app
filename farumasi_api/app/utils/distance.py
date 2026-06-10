from __future__ import annotations

import math
import logging
from typing import Optional

logger = logging.getLogger(__name__)

# Rwanda road-to-straight-line multiplier.
# Rwandan terrain (hills, winding roads) means actual road distance is
# typically 1.25–1.35× the great-circle displacement.  We use 1.3 as a
# conservative estimate when the OSRM call is unavailable.
_RW_ROAD_FACTOR = 1.3

# Kigali bounding box (approximate).  Orders whose delivery point falls
# outside this box are considered "outside Kigali" and cannot use delivery
# if the road distance exceeds 20 km.
_KIGALI_LAT_MIN = -2.05
_KIGALI_LAT_MAX = -1.85
_KIGALI_LON_MIN = 29.95
_KIGALI_LON_MAX = 30.15


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two GPS points using the Haversine formula.
    Returns distance in kilometres.  This is straight-line (displacement), NOT road distance.
    """
    R = 6371.0
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def location_score(distance_km: float, max_km: float = 20.0) -> float:
    """Convert distance to a 0-100 score. Closer = higher score. Beyond max_km → 0."""
    if distance_km <= 0:
        return 100.0
    if distance_km >= max_km:
        return 0.0
    return round((1 - distance_km / max_km) * 100, 2)


async def road_distance_km(
    lat1: float, lon1: float,
    lat2: float, lon2: float,
) -> float:
    """
    Return the estimated road distance in km between two coordinates.

    Tries the public OSRM routing server first (free, uses real road network).
    Falls back to Haversine × 1.3 (Rwanda road factor) if OSRM is unavailable.
    """
    try:
        import httpx
        url = (
            f"http://router.project-osrm.org/route/v1/driving/"
            f"{lon1},{lat1};{lon2},{lat2}"
            f"?overview=false&annotations=false"
        )
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                data = resp.json()
                routes = data.get("routes", [])
                if routes:
                    meters = routes[0].get("distance", 0)
                    return round(meters / 1000.0, 2)
    except Exception as exc:
        logger.debug("OSRM road distance unavailable (%s), using Haversine fallback", exc)

    # Fallback: straight-line × road factor
    straight = haversine_km(lat1, lon1, lat2, lon2)
    return round(straight * _RW_ROAD_FACTOR, 2)


def calculate_delivery_fee(distance_km: float) -> float:
    """
    Calculate delivery fee in RWF based on road distance.

    Pricing tiers:
      ≤ 10 km          → 1,500 RWF
      > 10 km, ≤ 15 km → 2,000 RWF
      > 15 km, ≤ 20 km → 2,500 RWF
      > 20 km          → 2,500 + 150 RWF per extra km (ceiling)

    Distances > 20 km are only allowed for pickup — callers should enforce
    this before calling this function.
    """
    if distance_km <= 10.0:
        return 1_500.0
    if distance_km <= 15.0:
        return 2_000.0
    if distance_km <= 20.0:
        return 2_500.0
    extra_km = math.ceil(distance_km - 20.0)
    return 2_500.0 + extra_km * 150.0


def is_outside_kigali(lat: float, lon: float) -> bool:
    """Return True if the coordinate falls outside the approximate Kigali bounding box."""
    return not (
        _KIGALI_LAT_MIN <= lat <= _KIGALI_LAT_MAX
        and _KIGALI_LON_MIN <= lon <= _KIGALI_LON_MAX
    )
