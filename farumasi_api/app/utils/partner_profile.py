"""Partner company registration completeness checks."""
from __future__ import annotations

from typing import List

from app.models.partner import PartnerCompany

REQUIRED_PARTNER_PROFILE_FIELDS = (
    "name",
    "address",
    "district",
    "phone",
    "email",
    "business_registration_number",
    "regulatory_authority",
    "regulatory_license_number",
    "regulatory_license_document_url",
    "latitude",
    "longitude",
)


def partner_missing_fields(company: PartnerCompany) -> List[str]:
    missing: List[str] = []
    for field in REQUIRED_PARTNER_PROFILE_FIELDS:
        value = getattr(company, field, None)
        if value is None or (isinstance(value, str) and not value.strip()):
            missing.append(field)
    return missing


def partner_profile_complete(company: PartnerCompany) -> bool:
    return not partner_missing_fields(company)
