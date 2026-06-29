"""Phase 7 — Rider delivery workflow + QR confirmation tests.

Out of scope (explicitly excluded by Phase 7 spec): withdrawals, real payouts,
real GPS / live tracking, route optimization, dispatch automation, advanced
analytics, real payment gateways, revenue refactor.
"""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


# ─────────────────────────── helpers ───────────────────────────
def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _h(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


from tests.bootstrap import register_for_test, mark_pharmacy_verified


async def _register(client: AsyncClient, role: str) -> dict:
    return await register_for_test(client, client._test_db, role=role)


async def _create_pharmacy(client: AsyncClient, admin_tokens: dict) -> str:
    r = await client.post(
        "/api/v1/pharmacies/",
        headers=_h(admin_tokens),
        json={
            "name": f"Pharm_{_uid()}",
            "address": "KG 3",
            "city": "Kigali",
            "latitude": -1.95,
            "longitude": 30.06,
            "accepts_delivery": True,
            "is_open": True,
        },
    )
    assert r.status_code == 201, r.text
    pharmacy_id = r.json()["id"]
    await mark_pharmacy_verified(client._test_db, pharmacy_id)
    return pharmacy_id


async def _create_delivery_order(
    client: AsyncClient,
    patient_tokens: dict,
    pharmacy_id: str,
    method: str = "delivery",
) -> dict:
    body = {
        "pharmacy_id": pharmacy_id,
        "delivery_method": method,
        "items": [
            {"product_name": "Test Med", "quantity": 1, "unit_price": 1500.0}
        ],
    }
    if method == "delivery":
        body.update(
            {
                "delivery_address": "KG 11 Ave",
                "delivery_latitude": "-1.950",
                "delivery_longitude": "30.060",
            }
        )
    r = await client.post(
        "/api/v1/orders/", headers=_h(patient_tokens), json=body
    )
    assert r.status_code == 201, r.text
    return r.json()


async def _rider_id(client: AsyncClient, rider_tokens: dict) -> str:
    r = await client.get("/api/v1/riders/me", headers=_h(rider_tokens))
    assert r.status_code == 200, r.text
    return r.json()["id"]


async def _full_setup(client: AsyncClient):
    """Return (super_admin, pharmacy_admin, patient, rider, pharmacy_id, order)."""
    sa = await _register(client, "super_admin")
    pharma = await _register(client, "pharmacy_admin")
    patient = await _register(client, "patient")
    rider = await _register(client, "rider")
    pharmacy_id = await _create_pharmacy(client, pharma)
    order = await _create_delivery_order(client, patient, pharmacy_id)
    return sa, pharma, patient, rider, pharmacy_id, order


# ═════════════════════════ Tests ═══════════════════════════════

# 1. Super admin can create delivery from eligible order
async def test_super_admin_can_create_delivery(client: AsyncClient):
    sa, _, _, _, _, order = await _full_setup(client)
    r = await client.post(
        "/api/v1/deliveries/",
        headers=_h(sa),
        json={"order_id": order["id"], "pickup_address": "Pharma HQ"},
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["order_id"] == order["id"]
    assert body["status"] == "pending_assignment"


# 2. Cannot create delivery for pickup-only order
async def test_cannot_create_delivery_for_pickup_order(client: AsyncClient):
    sa = await _register(client, "super_admin")
    pharma = await _register(client, "pharmacy_admin")
    patient = await _register(client, "patient")
    pharmacy_id = await _create_pharmacy(client, pharma)
    order = await _create_delivery_order(
        client, patient, pharmacy_id, method="pickup"
    )
    r = await client.post(
        "/api/v1/deliveries/",
        headers=_h(sa),
        json={"order_id": order["id"]},
    )
    assert r.status_code == 400, r.text
    assert "pickup" in r.text.lower()


# 3. Cannot create delivery for cancelled/rejected order
async def test_cannot_create_delivery_for_cancelled_order(
    client: AsyncClient, db
):
    from sqlalchemy import select
    from app.models.order import Order
    from app.core.constants import OrderStatus

    sa, _, _, _, _, order = await _full_setup(client)
    # Mutate order to CANCELLED via shared db fixture
    res = await db.execute(select(Order).where(Order.id == order["id"]))
    o = res.scalar_one()
    o.order_status = OrderStatus.CANCELLED
    await db.flush()

    r = await client.post(
        "/api/v1/deliveries/",
        headers=_h(sa),
        json={"order_id": order["id"]},
    )
    assert r.status_code == 400, r.text


# 4. Delivery gets QR token/code on creation
async def test_delivery_gets_qr_on_creation(client: AsyncClient):
    sa, _, _, _, _, order = await _full_setup(client)
    r = await client.post(
        "/api/v1/deliveries/",
        headers=_h(sa),
        json={"order_id": order["id"]},
    )
    body = r.json()
    assert body["qr_token"]
    assert body["qr_code"]
    assert len(body["qr_token"]) > 16


# 5. Super admin can assign rider
async def test_super_admin_can_assign_rider(client: AsyncClient):
    sa, _, _, rider, _, order = await _full_setup(client)
    rider_id = await _rider_id(client, rider)
    create = await client.post(
        "/api/v1/deliveries/",
        headers=_h(sa),
        json={"order_id": order["id"]},
    )
    delivery_id = create.json()["id"]
    r = await client.patch(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=_h(sa),
        json={"rider_id": rider_id, "delivery_fee": 1500, "rider_earning": 1200},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "assigned"
    assert body["rider_id"] == rider_id
    assert float(body["rider_earning"]) == 1200.0


# 6. Rider can view assigned delivery
async def test_rider_can_view_assigned_delivery(client: AsyncClient):
    sa, _, _, rider, _, order = await _full_setup(client)
    rider_id = await _rider_id(client, rider)
    create = await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    delivery_id = create.json()["id"]
    await client.patch(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=_h(sa),
        json={"rider_id": rider_id},
    )
    r = await client.get(
        "/api/v1/riders/me/deliveries", headers=_h(rider)
    )
    assert r.status_code == 200, r.text
    ids = [d["id"] for d in r.json()]
    assert delivery_id in ids


# 7. Rider can accept assigned delivery
async def test_rider_can_accept_assigned_delivery(client: AsyncClient):
    sa, _, _, rider, _, order = await _full_setup(client)
    rider_id = await _rider_id(client, rider)
    create = await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    delivery_id = create.json()["id"]
    await client.patch(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=_h(sa),
        json={"rider_id": rider_id},
    )
    r = await client.patch(
        f"/api/v1/riders/me/deliveries/{delivery_id}/accept",
        headers=_h(rider),
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "accepted"
    assert r.json()["accepted_at"]


# 8. Rider can reject with reason; OTHER requires custom_reason
async def test_rider_can_reject_with_reason(client: AsyncClient):
    sa, _, _, rider, _, order = await _full_setup(client)
    rider_id = await _rider_id(client, rider)
    create = await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    delivery_id = create.json()["id"]
    await client.patch(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=_h(sa),
        json={"rider_id": rider_id},
    )
    # OTHER w/o custom_reason fails
    bad = await client.patch(
        f"/api/v1/riders/me/deliveries/{delivery_id}/reject",
        headers=_h(rider),
        json={"reason": "other"},
    )
    assert bad.status_code == 422, bad.text

    r = await client.patch(
        f"/api/v1/riders/me/deliveries/{delivery_id}/reject",
        headers=_h(rider),
        json={"reason": "too_far"},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "rejected"
    assert body["rejection_reason"] == "too_far"
    assert body["rider_id"] is None


# 9. Rider cannot accept another rider's delivery
async def test_rider_cannot_accept_others_delivery(client: AsyncClient):
    sa, _, _, rider_a, _, order = await _full_setup(client)
    rider_b = await _register(client, "rider")
    rider_a_id = await _rider_id(client, rider_a)
    create = await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    delivery_id = create.json()["id"]
    await client.patch(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=_h(sa),
        json={"rider_id": rider_a_id},
    )
    r = await client.patch(
        f"/api/v1/riders/me/deliveries/{delivery_id}/accept",
        headers=_h(rider_b),
    )
    assert r.status_code == 403, r.text


# 10. Invalid status transition is rejected
async def test_invalid_status_transition_rejected(client: AsyncClient):
    sa, _, _, rider, _, order = await _full_setup(client)
    rider_id = await _rider_id(client, rider)
    create = await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    delivery_id = create.json()["id"]
    await client.patch(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=_h(sa),
        json={"rider_id": rider_id},
    )
    # ASSIGNED -> PICKED_UP is not allowed; must go through ACCEPTED + going + arrived
    r = await client.patch(
        f"/api/v1/riders/me/deliveries/{delivery_id}/status",
        headers=_h(rider),
        json={"status": "picked_up"},
    )
    assert r.status_code == 400, r.text
    assert "Invalid" in r.text or "transition" in r.text.lower()


# 11. Rider progresses through full lifecycle
async def test_rider_full_lifecycle(client: AsyncClient):
    sa, _, _, rider, _, order = await _full_setup(client)
    rider_id = await _rider_id(client, rider)
    create = await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    delivery_id = create.json()["id"]
    await client.patch(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=_h(sa),
        json={"rider_id": rider_id},
    )
    await client.patch(
        f"/api/v1/riders/me/deliveries/{delivery_id}/accept", headers=_h(rider)
    )

    for s in [
        "going_to_pickup",
        "arrived_at_pickup",
        "picked_up",
        "out_for_delivery",
        "arrived_at_destination",
    ]:
        r = await client.patch(
            f"/api/v1/riders/me/deliveries/{delivery_id}/status",
            headers=_h(rider),
            json={"status": s},
        )
        assert r.status_code == 200, (s, r.text)
        assert r.json()["status"] == s


# 12. Wrong QR fails
async def test_wrong_qr_fails(client: AsyncClient):
    sa, _, _, rider, _, order = await _full_setup(client)
    rider_id = await _rider_id(client, rider)
    create = await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    delivery_id = create.json()["id"]
    await client.patch(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=_h(sa),
        json={"rider_id": rider_id},
    )
    await client.patch(
        f"/api/v1/riders/me/deliveries/{delivery_id}/accept", headers=_h(rider)
    )
    r = await client.post(
        f"/api/v1/riders/me/deliveries/{delivery_id}/confirm-qr",
        headers=_h(rider),
        json={"qr_token": "not-a-real-token"},
    )
    assert r.status_code == 400, r.text
    assert "Invalid" in r.text or "qr" in r.text.lower()


# 13/14/15/16: Correct QR confirms, updates timestamps, order status, elapsed
async def test_correct_qr_confirms_delivery(client: AsyncClient):
    sa, _, patient, rider, _, order = await _full_setup(client)
    rider_id = await _rider_id(client, rider)
    create = await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    delivery_id = create.json()["id"]
    qr_token = create.json()["qr_token"]

    await client.patch(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=_h(sa),
        json={"rider_id": rider_id},
    )
    await client.patch(
        f"/api/v1/riders/me/deliveries/{delivery_id}/accept", headers=_h(rider)
    )
    # Confirm directly (service allows any active state)
    r = await client.post(
        f"/api/v1/riders/me/deliveries/{delivery_id}/confirm-qr",
        headers=_h(rider),
        json={"qr_token": qr_token},
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["status"] == "delivered"
    assert body["delivered_at"]
    assert body["qr_confirmed_at"]
    assert body["elapsed_seconds"] is not None
    assert body["elapsed_seconds"] >= 0

    # Order should be completed
    order_resp = await client.get(
        f"/api/v1/orders/{order['id']}", headers=_h(patient)
    )
    assert order_resp.status_code == 200
    assert order_resp.json()["order_status"] == "completed"


# 17. Patient can fetch QR for own order
async def test_patient_fetches_own_qr(client: AsyncClient):
    sa, _, patient, _, _, order = await _full_setup(client)
    await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    r = await client.get(
        f"/api/v1/patients/me/orders/{order['id']}/delivery-qr",
        headers=_h(patient),
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["order_id"] == order["id"]
    assert body["qr_token"]
    assert body["qr_code"]


# 18. Patient cannot fetch another patient's QR
async def test_patient_cannot_fetch_others_qr(client: AsyncClient):
    sa, _, patient_a, _, _, order = await _full_setup(client)
    patient_b = await _register(client, "patient")
    await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    r = await client.get(
        f"/api/v1/patients/me/orders/{order['id']}/delivery-qr",
        headers=_h(patient_b),
    )
    assert r.status_code == 403, r.text


# 19. Rider earnings endpoint works for per_trip rider
async def test_rider_earnings_per_trip(client: AsyncClient):
    sa, _, _, rider, _, order = await _full_setup(client)
    rider_id = await _rider_id(client, rider)
    create = await client.post(
        "/api/v1/deliveries/", headers=_h(sa), json={"order_id": order["id"]}
    )
    delivery_id = create.json()["id"]
    qr_token = create.json()["qr_token"]
    await client.patch(
        f"/api/v1/deliveries/{delivery_id}/assign",
        headers=_h(sa),
        json={"rider_id": rider_id, "rider_earning": 1200},
    )
    await client.patch(
        f"/api/v1/riders/me/deliveries/{delivery_id}/accept", headers=_h(rider)
    )
    await client.post(
        f"/api/v1/riders/me/deliveries/{delivery_id}/confirm-qr",
        headers=_h(rider),
        json={"qr_token": qr_token},
    )

    r = await client.get("/api/v1/riders/me/earnings", headers=_h(rider))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["rider_type"] == "per_trip"
    assert body["completed_deliveries_today"] == 1
    assert body["estimated_earnings_today"] == 1200.0


# 20. Weekly rider earnings placeholder
async def test_rider_earnings_weekly_placeholder(client: AsyncClient):
    rider = await _register(client, "rider")
    # Change rider type to weekly
    upd = await client.put(
        "/api/v1/riders/me",
        headers=_h(rider),
        json={"rider_type": "weekly"},
    )
    assert upd.status_code == 200, upd.text

    r = await client.get("/api/v1/riders/me/earnings", headers=_h(rider))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["rider_type"] == "weekly"
    assert body["estimated_earnings_today"] == 0.0
    assert body["estimated_earnings_week"] == 0.0
    assert body["pending_payout"] == 0.0
