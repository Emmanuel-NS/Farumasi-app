"""FDA compliance: dispatch traceability, pharmacy reassignment, partner assignment ledger."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.constants import PaymentStatus
from app.models.order import Order
from app.models.order_partner_assignment import OrderPartnerAssignment
from app.models.pharmacy import Pharmacy
from app.services.revenue_service import RevenueService

pytestmark = pytest.mark.anyio


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _h(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def _register(client: AsyncClient, role: str, db: AsyncSession) -> dict:
    from tests.bootstrap import bootstrap_test_user

    return await bootstrap_test_user(client, db, role)


async def _create_product(client: AsyncClient, sa_tokens: dict) -> str:
    r = await client.post(
        "/api/v1/products/",
        headers=_h(sa_tokens),
        json={
            "name": f"Drug_{_uid()}",
            "category": "analgesic",
            "product_type": "medicine",
            "description": "test",
            "manufacturer": "ACME Labs",
            "prescription_required": False,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _create_pharmacy(client: AsyncClient, admin_tokens: dict, name: str) -> str:
    r = await client.post(
        "/api/v1/pharmacies/",
        headers=_h(admin_tokens),
        json={
            "name": name,
            "address": "addr",
            "city": "Kigali",
            "latitude": -1.95,
            "longitude": 30.06,
            "accepts_delivery": True,
            "is_open": True,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _add_listing(
    client: AsyncClient,
    *,
    admin_tokens: dict,
    product_id: str,
    price: float,
    stock: int = 50,
) -> str:
    r = await client.post(
        "/api/v1/pharmacies/me/listings",
        headers=_h(admin_tokens),
        json={
            "product_id": product_id,
            "price": price,
            "stock_quantity": stock,
            "availability_status": "available",
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _create_pickup_order(
    client: AsyncClient,
    *,
    patient_tokens: dict,
    listing_id: str,
    access_code: str = "pickup-secret",
) -> dict:
    r = await client.post(
        "/api/v1/orders/",
        headers=_h(patient_tokens),
        json={
            "delivery_method": "pickup",
            "patient_access_code": access_code,
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _mark_order_paid(db, order_id: str, *, overdue: bool = False) -> None:
    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalar_one()
    order.payment_status = PaymentStatus.PAID
    order.amount_paid_snapshot = float(order.total_amount)
    if overdue:
        order.partner_response_due_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    else:
        order.partner_response_due_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.flush()


async def _pharmacy_id_for_admin(client: AsyncClient, admin_tokens: dict) -> str:
    r = await client.get("/api/v1/pharmacies/me", headers=_h(admin_tokens))
    assert r.status_code == 200, r.text
    return r.json()["id"]


async def _setup_two_pharmacies_same_product(
    client: AsyncClient,
    db: AsyncSession,
    *,
    price: float = 1000.0,
) -> tuple[dict, dict, str, str, str, str, str]:
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)

    admin_a = await _register(client, "pharmacy_admin", db)
    pharm_a = await _pharmacy_id_for_admin(client, admin_a)
    listing_a = await _add_listing(
        client, admin_tokens=admin_a, product_id=product_id, price=price
    )

    admin_b = await _register(client, "pharmacy_admin", db)
    pharm_b = await _pharmacy_id_for_admin(client, admin_b)
    listing_b = await _add_listing(
        client, admin_tokens=admin_b, product_id=product_id, price=price
    )

    return admin_a, admin_b, pharm_a, pharm_b, listing_a, listing_b, product_id


# ── Dispatch traceability ─────────────────────────────────────────────


async def test_ready_for_pickup_requires_confirm_dispatch(client: AsyncClient, db):
    admin_a, _, _, _, listing_a, _, _ = await _setup_two_pharmacies_same_product(client, db)
    patient = await _register(client, "patient", db)
    order = await _create_pickup_order(client, patient_tokens=patient, listing_id=listing_a)
    order_id = order["id"]
    await _mark_order_paid(db, order_id)

    for status in ("accepted", "preparing"):
        r = await client.patch(
            f"/api/v1/orders/{order_id}/status",
            headers=_h(admin_a),
            json={"order_status": status},
        )
        assert r.status_code == 200, r.text

    r = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=_h(admin_a),
        json={"order_status": "ready_for_pickup"},
    )
    assert r.status_code == 400, r.text
    assert "confirm-dispatch" in r.text.lower() or "batch" in r.text.lower()


async def test_confirm_dispatch_records_batch_and_advances_status(client: AsyncClient, db):
    admin_a, _, _, _, listing_a, _, _ = await _setup_two_pharmacies_same_product(client, db)
    patient = await _register(client, "patient", db)
    order = await _create_pickup_order(
        client, patient_tokens=patient, listing_id=listing_a, access_code="Rx-1234"
    )
    order_id = order["id"]
    item_id = order["items"][0]["id"]
    await _mark_order_paid(db, order_id)

    await client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=_h(admin_a),
        json={"order_status": "accepted"},
    )
    await client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=_h(admin_a),
        json={"order_status": "preparing"},
    )

    expiry = (datetime.now(timezone.utc) + timedelta(days=180)).isoformat()
    r = await client.post(
        f"/api/v1/orders/{order_id}/confirm-dispatch",
        headers=_h(admin_a),
        json={
            "access_code": "Rx-1234",
            "items": [
                {
                    "order_item_id": item_id,
                    "batch_number": "BN-2026-001",
                    "expiry_date": expiry,
                    "manufacturer": "ACME Labs",
                }
            ],
        },
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["order_status"] == "ready_for_pickup"
    assert body["dispatch_confirmed_at"] is not None
    item = body["items"][0]
    assert item["dispatch_batch_number"] == "BN-2026-001"
    assert item["dispatch_manufacturer"] == "ACME Labs"
    assert item["dispatch_expiry_date"] is not None


async def test_confirm_dispatch_rejects_wrong_access_code(client: AsyncClient, db):
    admin_a, _, _, _, listing_a, _, _ = await _setup_two_pharmacies_same_product(client, db)
    patient = await _register(client, "patient", db)
    order = await _create_pickup_order(
        client, patient_tokens=patient, listing_id=listing_a, access_code="correct-code"
    )
    order_id = order["id"]
    item_id = order["items"][0]["id"]
    await _mark_order_paid(db, order_id)
    await client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=_h(admin_a),
        json={"order_status": "preparing"},
    )

    expiry = (datetime.now(timezone.utc) + timedelta(days=90)).isoformat()
    r = await client.post(
        f"/api/v1/orders/{order_id}/confirm-dispatch",
        headers=_h(admin_a),
        json={
            "access_code": "wrong-code",
            "items": [
                {
                    "order_item_id": item_id,
                    "batch_number": "BN-X",
                    "expiry_date": expiry,
                    "manufacturer": "Maker",
                }
            ],
        },
    )
    assert r.status_code == 403, r.text


# ── Pharmacy reassignment ───────────────────────────────────────────────


async def test_reassignment_not_available_before_timeout(client: AsyncClient, db):
    admin_a, _, pharm_a, _, listing_a, _, _ = await _setup_two_pharmacies_same_product(
        client, db
    )
    patient = await _register(client, "patient", db)
    order = await _create_pickup_order(client, patient_tokens=patient, listing_id=listing_a)
    order_id = order["id"]
    await _mark_order_paid(db, order_id, overdue=False)

    r = await client.get(
        f"/api/v1/patients/me/orders/{order_id}/reassignment-options",
        headers=_h(patient),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["can_reassign"] is False
    assert body.get("switch_enabled") is False
    # Options are visible for AI preview before the timeout elapses.
    assert len(body["options"]) >= 1
    assert body["options"][0].get("can_switch") is True


async def test_reassignment_moves_order_and_records_partner_ledger(client: AsyncClient, db):
    admin_a, admin_b, pharm_a, pharm_b, listing_a, listing_b, _ = (
        await _setup_two_pharmacies_same_product(client, db, price=1000.0)
    )
    patient = await _register(client, "patient", db)
    order = await _create_pickup_order(client, patient_tokens=patient, listing_id=listing_a)
    order_id = order["id"]
    paid_amount = float(order["total_amount"])
    await _mark_order_paid(db, order_id, overdue=True)

    opts = await client.get(
        f"/api/v1/patients/me/orders/{order_id}/reassignment-options",
        headers=_h(patient),
    )
    assert opts.status_code == 200, opts.text
    options = opts.json()["options"]
    assert opts.json()["can_reassign"] is True
    assert any(o.get("pharmacy_id") == pharm_b for o in options)

    r = await client.post(
        f"/api/v1/patients/me/orders/{order_id}/reassign-pharmacy",
        headers=_h(patient),
        json={"pharmacy_id": pharm_b},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["pharmacy_id"] == pharm_b
    assert body["previous_pharmacy_id"] == pharm_a
    assert body["reassignment_count"] == 1
    assert float(body["total_amount"]) <= paid_amount

    # Old partner no longer sees order in active list
    old_list = await client.get(
        "/api/v1/pharmacies/me/orders",
        headers=_h(admin_a),
    )
    assert old_list.status_code == 200
    assert not any(o["id"] == order_id for o in old_list.json()["items"])

    # New partner sees the order
    new_list = await client.get(
        "/api/v1/pharmacies/me/orders",
        headers=_h(admin_b),
    )
    assert new_list.status_code == 200
    assert any(o["id"] == order_id for o in new_list.json()["items"])

    # Assignment ledger: closed row for A, open row for B
    rows = list(
        (
            await db.execute(
                select(OrderPartnerAssignment)
                .where(OrderPartnerAssignment.order_id == order_id)
                .order_by(OrderPartnerAssignment.assigned_at.asc())
            )
        ).scalars().all()
    )
    assert len(rows) == 2
    assert rows[0].pharmacy_id == pharm_a
    assert rows[0].end_reason == "reassigned"
    assert rows[0].ended_at is not None
    assert rows[1].pharmacy_id == pharm_b
    assert rows[1].end_reason is None

    # Old partner revenue summary reflects lost expected net from reassignment
    pharm_a_row = (
        await db.execute(select(Pharmacy).where(Pharmacy.id == pharm_a))
    ).scalar_one()
    summary = await RevenueService(db).get_summary(pharmacy_id=pharm_a)
    assert summary.reassigned_orders == 1
    assert summary.reassigned_lost_net == float(rows[0].net_partner_amount)


async def test_reassignment_rejects_pharmacy_above_paid_amount(client: AsyncClient, db):
    admin_a, admin_b, _, pharm_b, listing_a, listing_b, product_id = (
        await _setup_two_pharmacies_same_product(client, db, price=1000.0)
    )
    # Make pharmacy B more expensive
    await client.patch(
        f"/api/v1/pharmacies/me/listings/{listing_b}",
        headers=_h(admin_b),
        json={"price": 2500},
    )

    patient = await _register(client, "patient", db)
    order = await _create_pickup_order(client, patient_tokens=patient, listing_id=listing_a)
    order_id = order["id"]
    await _mark_order_paid(db, order_id, overdue=True)

    r = await client.post(
        f"/api/v1/patients/me/orders/{order_id}/reassign-pharmacy",
        headers=_h(patient),
        json={"pharmacy_id": pharm_b},
    )
    assert r.status_code in (400, 422), r.text


async def test_phase6_listing_order_still_works(client: AsyncClient, db):
    """Regression: basic listing order flow unaffected by FDA changes."""
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(
        client, admin_tokens=admin, product_id=product_id, price=500
    )
    patient = await _register(client, "patient", db)
    r = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    assert r.status_code == 201, r.text
    assert r.json()["pharmacy_assigned_at"] is not None
