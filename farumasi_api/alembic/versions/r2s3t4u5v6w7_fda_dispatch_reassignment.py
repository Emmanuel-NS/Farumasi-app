"""FDA dispatch records, pharmacy reassignment, expiry alerts

Revision ID: r2s3t4u5v6w7
Revises: q1r2s3t4u5v6
"""
from alembic import op
import sqlalchemy as sa

revision = "r2s3t4u5v6w7"
down_revision = "q1r2s3t4u5v6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "orders",
        sa.Column("pharmacy_assigned_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("pharmacy_confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("partner_response_due_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("amount_paid_snapshot", sa.Numeric(12, 2), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("previous_pharmacy_id", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("previous_partner_company_id", sa.String(length=36), nullable=True),
    )
    op.add_column(
        "orders",
        sa.Column("reassignment_count", sa.Integer(), nullable=False, server_default="0"),
    )
    op.add_column(
        "orders",
        sa.Column("dispatch_confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_foreign_key(
        "fk_orders_previous_pharmacy_id",
        "orders",
        "pharmacies",
        ["previous_pharmacy_id"],
        ["id"],
        ondelete="SET NULL",
    )
    op.create_foreign_key(
        "fk_orders_previous_partner_company_id",
        "orders",
        "partner_companies",
        ["previous_partner_company_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.add_column(
        "order_items",
        sa.Column("dispatch_batch_number", sa.String(length=100), nullable=True),
    )
    op.add_column(
        "order_items",
        sa.Column("dispatch_expiry_date", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "order_items",
        sa.Column("dispatch_manufacturer", sa.String(length=255), nullable=True),
    )
    op.add_column(
        "order_items",
        sa.Column("dispatch_confirmed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "order_items",
        sa.Column("expiry_alert_30d_sent", sa.Boolean(), nullable=False, server_default="false"),
    )
    op.add_column(
        "order_items",
        sa.Column("expiry_alert_7d_sent", sa.Boolean(), nullable=False, server_default="false"),
    )

    op.create_table(
        "order_partner_assignments",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("order_id", sa.String(length=36), nullable=False),
        sa.Column("pharmacy_id", sa.String(length=36), nullable=True),
        sa.Column("partner_company_id", sa.String(length=36), nullable=True),
        sa.Column("subtotal", sa.Numeric(12, 2), nullable=False),
        sa.Column("platform_commission", sa.Numeric(12, 2), nullable=False),
        sa.Column("net_partner_amount", sa.Numeric(12, 2), nullable=False),
        sa.Column("assigned_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("ended_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("end_reason", sa.String(length=50), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["order_id"], ["orders.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["pharmacy_id"], ["pharmacies.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["partner_company_id"], ["partner_companies.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_order_partner_assignments_order_id",
        "order_partner_assignments",
        ["order_id"],
    )
    op.create_index(
        "ix_order_partner_assignments_pharmacy_id",
        "order_partner_assignments",
        ["pharmacy_id"],
    )

    # Backfill pharmacy_assigned_at for existing orders
    op.execute("UPDATE orders SET pharmacy_assigned_at = created_at WHERE pharmacy_assigned_at IS NULL")


def downgrade() -> None:
    op.drop_index("ix_order_partner_assignments_pharmacy_id", "order_partner_assignments")
    op.drop_index("ix_order_partner_assignments_order_id", "order_partner_assignments")
    op.drop_table("order_partner_assignments")

    op.drop_column("order_items", "expiry_alert_7d_sent")
    op.drop_column("order_items", "expiry_alert_30d_sent")
    op.drop_column("order_items", "dispatch_confirmed_at")
    op.drop_column("order_items", "dispatch_manufacturer")
    op.drop_column("order_items", "dispatch_expiry_date")
    op.drop_column("order_items", "dispatch_batch_number")

    op.drop_constraint("fk_orders_previous_partner_company_id", "orders", type_="foreignkey")
    op.drop_constraint("fk_orders_previous_pharmacy_id", "orders", type_="foreignkey")
    op.drop_column("orders", "dispatch_confirmed_at")
    op.drop_column("orders", "reassignment_count")
    op.drop_column("orders", "previous_partner_company_id")
    op.drop_column("orders", "previous_pharmacy_id")
    op.drop_column("orders", "amount_paid_snapshot")
    op.drop_column("orders", "partner_response_due_at")
    op.drop_column("orders", "pharmacy_confirmed_at")
    op.drop_column("orders", "pharmacy_assigned_at")
