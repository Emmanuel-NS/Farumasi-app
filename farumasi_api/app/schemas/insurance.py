"""Insurance provider schemas — Phase 3."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from app.schemas.common import FarumasiBaseModel


class InsuranceProviderCreate(FarumasiBaseModel):
    name: str
    insurance_type: Optional[str] = None
    status: Optional[str] = "active"


class InsuranceProviderUpdate(FarumasiBaseModel):
    name: Optional[str] = None
    insurance_type: Optional[str] = None
    status: Optional[str] = None


class InsuranceProviderOut(FarumasiBaseModel):
    id: str
    name: str
    insurance_type: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime
