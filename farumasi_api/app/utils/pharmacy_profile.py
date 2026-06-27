"""Pharmacy registration completeness checks."""
from __future__ import annotations

from typing import List

from app.models.pharmacy import Pharmacy

REQUIRED_PHARMACY_PROFILE_FIELDS = (
    "name",
    "address",
    "district",
    "phone",
    "email",
    "license_number",
    "license_document_url",
    "supervising_pharmacist_name",
    "supervising_pharmacist_license",
    "latitude",
    "longitude",
)


def pharmacy_missing_fields(pharmacy: Pharmacy) -> List[str]:
    missing: List[str] = []
    for field in REQUIRED_PHARMACY_PROFILE_FIELDS:
        value = getattr(pharmacy, field, None)
        if value is None or (isinstance(value, str) and not value.strip()):
            missing.append(field)
    return missing


def pharmacy_profile_complete(pharmacy: Pharmacy) -> bool:
    return not pharmacy_missing_fields(pharmacy)
