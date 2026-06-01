"""consolidate product types into 4 categories

Revision ID: b1c2d3e4f5a6
Revises: d9a2c4f1e7b6
Create Date: 2026-06-15 00:00:00.000000

Old values: medicine, medical_device, diagnostic, wellness, equipment,
            consumable, supplement, other, device, personal_care
New values: medicine, medical_device, food_supplements, cosmetics
"""
from typing import Sequence, Union

from alembic import op


revision: str = "b1c2d3e4f5a6"
down_revision: Union[str, None] = "d9a2c4f1e7b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


_MAPPING = {
    "supplement":    "food_supplements",
    "wellness":      "food_supplements",
    "diagnostic":    "medical_device",
    "equipment":     "medical_device",
    "consumable":    "medical_device",
    "device":        "medical_device",
    "personal_care": "cosmetics",
    "other":         "medicine",
}


def _build_case(column: str) -> str:
    whens = " ".join(f"WHEN '{old}' THEN '{new}'" for old, new in _MAPPING.items())
    return f"UPDATE {{table}} SET {column} = CASE {column} {whens} ELSE {column} END"


def upgrade() -> None:
    for table in ("product_catalogue_items", "product_requests"):
        op.execute(_build_case("product_type").format(table=table))


def downgrade() -> None:
    # Non-reversible (information loss).
    pass
