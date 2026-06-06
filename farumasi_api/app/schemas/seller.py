from __future__ import annotations

from pydantic import BaseModel, ConfigDict


class SellerEntityBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    name: str
    kind: str  # pharmacy | partner_company
    is_open: bool


class SellerOpenStatusOut(BaseModel):
    """Open/closed state for every seller entity owned by the logged-in user."""

    is_open: bool
    entities: list[SellerEntityBrief]


class SetSellerOpenRequest(BaseModel):
    is_open: bool
