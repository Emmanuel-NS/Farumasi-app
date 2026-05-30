"""add_product_categories

Revision ID: a3b4c5d6e7f8
Revises: f892943f1fdb
Create Date: 2026-05-30 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a3b4c5d6e7f8"
down_revision: Union[str, None] = "317d8167e335"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Default categories seeded on first migration — mirrors BACKEND_CATEGORIES
# in the pharmacist portal with the matching icon_name keys from CategoryIcons.tsx.
_DEFAULT_CATEGORIES = [
    ("Analgesics",           "pain-relief",    0),
    ("Antibiotics",          "antibiotics",    1),
    ("Antidiabetics",        "diabetes",       2),
    ("Antihypertensives",    "blood-pressure", 3),
    ("Antimalarials",        "infectious",     4),
    ("Antihistamines",       "allergy",        5),
    ("Gastrointestinal",     "digestive",      6),
    ("Respiratory",          "respiratory",    7),
    ("Vitamins & Supplements","vitamins",      8),
    ("Pain Relief",          "pain-relief",    9),
    ("Cold & Flu",           "cold-flu",       10),
    ("Allergy & Asthma",     "allergy",        11),
    ("Digestive Health",     "digestive",      12),
    ("Chronic Care",         "chronic-care",   13),
    ("Supplements",          "supplements",    14),
    ("Personal Care",        "skincare",       15),
    ("First Aid",            "first-aid",      16),
    ("Wellness",             "general",        17),
    ("General",              "general",        18),
]


def upgrade() -> None:
    op.create_table(
        "product_categories",
        sa.Column("name",          sa.String(100), nullable=False, unique=True),
        sa.Column("icon_name",     sa.String(60),  nullable=False, server_default="general"),
        sa.Column("is_default",    sa.Boolean(),   nullable=False, server_default=sa.text("false")),
        sa.Column("display_order", sa.Integer(),   nullable=False, server_default=sa.text("0")),
        sa.Column("id",            sa.String(),    nullable=False),
        sa.Column("created_at",    sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at",    sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("name", name="uq_product_category_name"),
    )
    op.create_index("ix_product_categories_name", "product_categories", ["name"])

    # Seed defaults
    import uuid
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    op.bulk_insert(
        sa.table(
            "product_categories",
            sa.column("id",            sa.String),
            sa.column("name",          sa.String),
            sa.column("icon_name",     sa.String),
            sa.column("is_default",    sa.Boolean),
            sa.column("display_order", sa.Integer),
            sa.column("created_at",    sa.DateTime(timezone=True)),
            sa.column("updated_at",    sa.DateTime(timezone=True)),
        ),
        [
            {
                "id": str(uuid.uuid4()),
                "name": name,
                "icon_name": icon,
                "is_default": True,
                "display_order": order,
                "created_at": now,
                "updated_at": now,
            }
            for name, icon, order in _DEFAULT_CATEGORIES
        ],
    )


def downgrade() -> None:
    op.drop_index("ix_product_categories_name", table_name="product_categories")
    op.drop_table("product_categories")
