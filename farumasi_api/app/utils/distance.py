from __future__ import annotations

import math


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate great-circle distance between two GPS points using the Haversine formula.
    Returns distance in kilometres.
    """
    R = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2) ** 2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2) ** 2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return round(R * c, 2)


def location_score(distance_km: float, max_km: float = 20.0) -> float:
    """
    Convert distance to a 0-100 score.
    Closer = higher score.  Beyond max_km → 0.
    """
    if distance_km <= 0:
        return 100.0
    if distance_km >= max_km:
        return 0.0
    return round((1 - distance_km / max_km) * 100, 2)
