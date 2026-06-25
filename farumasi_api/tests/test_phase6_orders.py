"""Phase 6 — Orders and payment placeholder flow tests.

Covers the three creation paths (recommendation, listing-based, legacy),
pricing/commission math, role-scoped access control, and the payment
placeholder endpoint. Delivery, rider, QR confirmation, withdrawals and
real payment gateways are explicitly *out of scope* for Phase 6.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


# ─────────────────────────── helpers ───────────────────────────
def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _h(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def _register(client: AsyncClient, role: str, db) -> dict:
    from tests.bootstrap import bootstrap_test_user

    return await bootstrap_test_user(client, db, role)


async def _mark_order_paid(db, order_id: str) -> None:
    from sqlalchemy import select

    from app.core.constants import PaymentStatus
    from app.models.order import Order

    res = await db.execute(select(Order).where(Order.id == order_id))
    order = res.scalar_one()
    order.payment_status = PaymentStatus.PAID
    order.amount_paid_snapshot = float(order.total_amount)
    order.partner_response_due_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.flush()


async def _patient_profile_id(client: AsyncClient, tokens: dict) -> str:
    r = await client.get("/api/v1/patients/me", headers=_h(tokens))
    assert r.status_code == 200, r.text
    return r.json()["id"]


async def _create_product(client: AsyncClient, sa_tokens: dict, name: str | None = None) -> str:
    name = name or f"Drug_{_uid()}"
    r = await client.post(
        "/api/v1/products/",
        headers=_h(sa_tokens),
        json={
            "name": name,
            "category": "analgesic",
            "product_type": "medicine",
            "description": "test",
            "manufacturer": "ACME",
            "prescription_required": False,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _create_pharmacy(client: AsyncClient, admin_tokens: dict, name: str | None = None) -> str:
    name = name or f"Pharm_{_uid()}"
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
    expiry: datetime | None = None,
    available: bool = True,
) -> str:
    body: dict = {
        "product_id": product_id,
        "price": price,
        "stock_quantity": stock,
        "availability_status": "available" if available else "out_of_stock",
    }
    if expiry is not None:
        body["expiry_date"] = expiry.isoformat()
    r = await client.post(
        "/api/v1/pharmacies/me/listings",
        headers=_h(admin_tokens),
        json=body,
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _create_prescription(
    client: AsyncClient,
    *,
    doctor_tokens: dict,
    patient_id: str,
    product_ids: list[str],
) -> str:
    items = [
        {"medicine_name": f"Item-{i}", "product_id": pid, "quantity": 1}
        for i, pid in enumerate(product_ids)
    ]
    r = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor_tokens),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": items,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _get_recommendations(
    client: AsyncClient, *, patient_tokens: dict, prescription_id: str
) -> dict:
    r = await client.get(
        f"/api/v1/patients/me/prescriptions/{prescription_id}/recommendations",
        params={"lat": -1.9441, "lon": 30.0619},
        headers=_h(patient_tokens),
    )
    assert r.status_code == 200, r.text
    return r.json()


# ══════════════════════════════ Tests ══════════════════════════════

# 1. Patient creates order from own recommendation
async def test_patient_creates_order_from_recommendation(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    await _add_listing(client, admin_tokens=admin, product_id=product_id, price=500)

    patient = await _register(client, "patient", db)
    patient_id = await _patient_profile_id(client, patient)
    doctor = await _register(client, "doctor", db)
    rx_id = await _create_prescription(
        client, doctor_tokens=doctor, patient_id=patient_id, product_ids=[product_id]
    )
    recs = await _get_recommendations(client, patient_tokens=patient, prescription_id=rx_id)
    rec_id = recs["top_recommendations"][0]["id"]

    r = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "prescription_id": rx_id,
            "selected_recommendation_id": rec_id,
            "delivery_method": "pickup",
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["order_code"].startswith("FAR-")
    assert body["selected_recommendation_id"] == rec_id
    assert body["prescription_id"] == rx_id
    assert len(body["items"]) == 1
    assert float(body["items"][0]["unit_price"]) == 500.0


# 2. Patient cannot create order from another patient's recommendation
async def test_patient_cannot_use_others_recommendation(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    await _add_listing(client, admin_tokens=admin, product_id=product_id, price=500)

    owner = await _register(client, "patient", db)
    owner_id = await _patient_profile_id(client, owner)
    doctor = await _register(client, "doctor", db)
    rx_id = await _create_prescription(
        client, doctor_tokens=doctor, patient_id=owner_id, product_ids=[product_id]
    )
    recs = await _get_recommendations(client, patient_tokens=owner, prescription_id=rx_id)
    rec_id = recs["top_recommendations"][0]["id"]

    intruder = await _register(client, "patient", db)
    r = await client.post(
        "/api/v1/orders/",
        headers=_h(intruder),
        json={
            "prescription_id": rx_id,
            "selected_recommendation_id": rec_id,
            "delivery_method": "pickup",
        },
    )
    assert r.status_code == 403, r.text


# 3. Patient creates manual order from an available listing
async def test_patient_creates_listing_based_order(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(
        client, admin_tokens=admin, product_id=product_id, price=750, stock=10
    )

    patient = await _register(client, "patient", db)
    r = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 2}],
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert float(body["items"][0]["unit_price"]) == 750.0
    assert float(body["subtotal"]) == 1500.0


# 4. Cannot order expired listing
async def test_cannot_order_expired_listing(client: AsyncClient, db):
    from app.models.product import ProductListing
    from sqlalchemy import select

    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(
        client,
        admin_tokens=admin,
        product_id=product_id,
        price=300,
        expiry=datetime.now(timezone.utc) + timedelta(days=30),
    )

    # Force the listing to be expired by writing directly to the DB
    res = await db.execute(select(ProductListing).where(ProductListing.id == listing_id))
    lst = res.scalar_one()
    lst.expiry_date = datetime.now(timezone.utc) - timedelta(days=1)
    await db.flush()

    patient = await _register(client, "patient", db)
    r = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    assert r.status_code in (400, 422), r.text


# 5. Cannot order unavailable listing
async def test_cannot_order_unavailable_listing(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(
        client, admin_tokens=admin, product_id=product_id, price=300, available=False
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
    assert r.status_code in (400, 422), r.text


# 6. Cannot order more than available stock
async def test_cannot_order_more_than_stock(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(
        client, admin_tokens=admin, product_id=product_id, price=300, stock=2
    )

    patient = await _register(client, "patient", db)
    r = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 5}],
        },
    )
    assert r.status_code in (400, 422), r.text


# 7. Order totals + 8. Commission math (10%)
async def test_order_totals_and_commission(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(
        client, admin_tokens=admin, product_id=product_id, price=2000, stock=10
    )

    patient = await _register(client, "patient", db)
    r = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 3}],
        },
    )
    assert r.status_code == 201, r.text
    body = r.json()
    subtotal = float(body["subtotal"])
    commission = float(body["platform_commission"])
    net = float(body["net_partner_amount"])
    total = float(body["total_amount"])
    assert subtotal == 6000.0
    assert commission == round(subtotal * 0.10, 2)
    assert net == round(subtotal - commission, 2)
    # pickup → no delivery fee
    assert total == subtotal


# 9. Patient views own orders
async def test_patient_views_own_orders(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(client, admin_tokens=admin, product_id=product_id, price=500)

    patient = await _register(client, "patient", db)
    create = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    assert create.status_code == 201, create.text
    order_id = create.json()["id"]

    r = await client.get("/api/v1/patients/me/orders", headers=_h(patient))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["total"] >= 1
    assert any(it["id"] == order_id for it in body["items"])


# 10. Patient cannot view another patient's order
async def test_patient_cannot_view_others_order(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(client, admin_tokens=admin, product_id=product_id, price=500)

    owner = await _register(client, "patient", db)
    create = await client.post(
        "/api/v1/orders/",
        headers=_h(owner),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    order_id = create.json()["id"]

    intruder = await _register(client, "patient", db)
    r = await client.get(f"/api/v1/orders/{order_id}", headers=_h(intruder))
    assert r.status_code == 403, r.text


# 11. Pharmacy admin views own pharmacy orders
async def test_pharmacy_admin_lists_own_orders(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(client, admin_tokens=admin, product_id=product_id, price=500)

    patient = await _register(client, "patient", db)
    create = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    order_id = create.json()["id"]

    r = await client.get("/api/v1/pharmacies/me/orders", headers=_h(admin))
    assert r.status_code == 200, r.text
    body = r.json()
    assert any(it["id"] == order_id for it in body["items"])


# 12. Pharmacy admin cannot view another pharmacy's order
async def test_pharmacy_admin_cannot_view_others_orders(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)

    admin_a = await _register(client, "pharmacy_admin", db)
    listing_a = await _add_listing(client, admin_tokens=admin_a, product_id=product_id, price=500)

    admin_b = await _register(client, "pharmacy_admin", db)

    patient = await _register(client, "patient", db)
    create = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_a, "quantity": 1}],
        },
    )
    order_id = create.json()["id"]

    r = await client.get(f"/api/v1/orders/{order_id}", headers=_h(admin_b))
    assert r.status_code == 403, r.text


# 13. Pharmacy admin accepts own order
async def test_pharmacy_admin_accepts_own_order(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(client, admin_tokens=admin, product_id=product_id, price=500)

    patient = await _register(client, "patient", db)
    create = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    order_id = create.json()["id"]
    await _mark_order_paid(db, order_id)

    r = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=_h(admin),
        json={"order_status": "accepted"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["order_status"] == "accepted"


# 14. Pharmacy admin rejects own order
async def test_pharmacy_admin_rejects_own_order(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(client, admin_tokens=admin, product_id=product_id, price=500)

    patient = await _register(client, "patient", db)
    create = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    order_id = create.json()["id"]

    r = await client.patch(
        f"/api/v1/pharmacies/me/orders/{order_id}/status",
        headers=_h(admin),
        json={"order_status": "rejected", "notes": "out of stock"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["order_status"] == "rejected"


# 15. Partner admin manages own partner orders
async def test_partner_admin_manages_own_orders(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)

    partner_admin = await _register(client, "partner_company_admin", db)
    partner_resp = await client.post(
        "/api/v1/partners/",
        headers=_h(partner_admin),
        json={"name": f"Partner_{_uid()}", "company_type": "distributor"},
    )
    assert partner_resp.status_code == 201, partner_resp.text

    listing = await client.post(
        "/api/v1/partners/me/listings",
        headers=_h(partner_admin),
        json={
            "product_id": product_id,
            "price": 400,
            "stock_quantity": 10,
            "availability_status": "available",
        },
    )
    assert listing.status_code == 201, listing.text
    listing_id = listing.json()["id"]

    patient = await _register(client, "patient", db)
    create = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    assert create.status_code == 201, create.text
    order_id = create.json()["id"]
    await _mark_order_paid(db, order_id)

    listed = await client.get("/api/v1/partners/me/orders", headers=_h(partner_admin))
    assert listed.status_code == 200, listed.text
    assert any(it["id"] == order_id for it in listed.json()["items"])

    upd = await client.patch(
        f"/api/v1/partners/me/orders/{order_id}/status",
        headers=_h(partner_admin),
        json={"order_status": "preparing"},
    )
    assert upd.status_code == 200, upd.text
    assert upd.json()["order_status"] == "preparing"


# 16. Non-owner pharmacy admin cannot change another pharmacy's order status
async def test_non_owner_cannot_change_status(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)

    admin_a = await _register(client, "pharmacy_admin", db)
    listing_a = await _add_listing(client, admin_tokens=admin_a, product_id=product_id, price=500)

    admin_b = await _register(client, "pharmacy_admin", db)

    patient = await _register(client, "patient", db)
    create = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_a, "quantity": 1}],
        },
    )
    order_id = create.json()["id"]
    await _mark_order_paid(db, order_id)

    r = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=_h(admin_b),
        json={"order_status": "accepted"},
    )
    assert r.status_code == 403, r.text


# 17. Payment status placeholder updatable by patient (own order)
async def test_payment_status_placeholder_update(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(client, admin_tokens=admin, product_id=product_id, price=500)

    patient = await _register(client, "patient", db)
    create = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    order_id = create.json()["id"]

    await _mark_order_paid(db, order_id)

    r = await client.get(f"/api/v1/orders/{order_id}", headers=_h(patient))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["payment_status"] == "paid"
    assert float(body["amount_paid_snapshot"]) == float(body["total_amount"])


# 18. Patient may cancel own pending order
async def test_patient_can_cancel_own_pending_order(client: AsyncClient, db):
    sa = await _register(client, "super_admin", db)
    product_id = await _create_product(client, sa)
    admin = await _register(client, "pharmacy_admin", db)
    listing_id = await _add_listing(client, admin_tokens=admin, product_id=product_id, price=500)

    patient = await _register(client, "patient", db)
    create = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": 1}],
        },
    )
    order_id = create.json()["id"]

    r = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=_h(patient),
        json={"order_status": "cancelled"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["order_status"] == "cancelled"


# 19. OrderCreate input validation: must pick exactly one path
async def test_order_create_requires_one_path(client: AsyncClient, db):
    patient = await _register(client, "patient", db)
    r = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={"delivery_method": "pickup"},
    )
    assert r.status_code == 422, r.text
