"""Tests for manual MoMo payments and admin-managed content pages."""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession

from tests.bootstrap import bootstrap_test_user

pytestmark = pytest.mark.anyio


def _auth(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.mark.anyio
async def test_public_content_pages_seeded(client: AsyncClient, db: AsyncSession):
    resp = await client.get("/api/v1/content/pages", params={"audience": "patient"})
    assert resp.status_code == 200, resp.text
    pages = resp.json()
    slugs = {p["slug"] for p in pages}
    assert "terms" in slugs
    assert "privacy" in slugs
    assert "support" in slugs

    terms = await client.get("/api/v1/content/pages/terms", params={"audience": "patient"})
    assert terms.status_code == 200, terms.text
    body = terms.json()
    assert body["title"]
    assert body["body"]
    assert body["version"] >= 1


@pytest.mark.anyio
async def test_admin_updates_and_publishes_content(client: AsyncClient, db: AsyncSession):
    admin = await bootstrap_test_user(client, db, "super_admin")
    headers = _auth(admin["access_token"])

    listed = await client.get("/api/v1/admin/content-pages", headers=headers)
    assert listed.status_code == 200, listed.text
    pages = listed.json()
    assert len(pages) >= 1
    page_id = pages[0]["id"]

    updated = await client.put(
        f"/api/v1/admin/content-pages/{page_id}",
        headers=headers,
        json={"summary": "Updated in automated test"},
    )
    assert updated.status_code == 200, updated.text
    assert updated.json()["summary"] == "Updated in automated test"

    published = await client.post(
        f"/api/v1/admin/content-pages/{page_id}/publish",
        headers=headers,
    )
    assert published.status_code == 200, published.text
    assert published.json()["status"] == "published"


@pytest.mark.anyio
async def test_content_notify_selected_users(client: AsyncClient, db: AsyncSession):
    admin = await bootstrap_test_user(client, db, "super_admin")
    patient = await bootstrap_test_user(client, db, "patient")
    admin_h = _auth(admin["access_token"])
    patient_h = _auth(patient["access_token"])

    me = await client.get("/api/v1/users/me", headers=patient_h)
    assert me.status_code == 200, me.text
    patient_id = me.json()["id"]

    terms = await client.get("/api/v1/content/pages/terms", params={"audience": "patient"})
    assert terms.status_code == 200
    page_id = terms.json()["id"]

    result = await client.post(
        f"/api/v1/admin/content-pages/{page_id}/notify",
        headers=admin_h,
        json={
            "user_ids": [patient_id],
            "message": "Test policy update notice",
            "send_email": False,
            "send_in_app": True,
        },
    )
    assert result.status_code == 200, result.text
    body = result.json()
    assert body["recipient_count"] == 1
    assert body["in_app_sent_count"] == 1


@pytest.mark.anyio
async def test_manual_payment_submit_approve_flow(client: AsyncClient, db: AsyncSession):
    patient = await bootstrap_test_user(client, db, "patient")
    admin = await bootstrap_test_user(client, db, "super_admin")
    patient_h = _auth(patient["access_token"])
    admin_h = _auth(admin["access_token"])

    # Create minimal unpaid order
    order_resp = await client.post(
        "/api/v1/orders/",
        headers=patient_h,
        json={
            "delivery_method": "pickup",
            "items": [{"product_name": "Test Med", "quantity": 1, "unit_price": 5000}],
        },
    )
    assert order_resp.status_code in (200, 201), order_resp.text
    order_id = order_resp.json()["id"]

    submit = await client.post(
        f"/api/v1/patients/me/orders/{order_id}/payments/manual",
        headers=patient_h,
        json={
            "proof_urls": ["https://example.com/proof1.png"],
            "patient_note": "Paid via MoMo code",
        },
    )
    assert submit.status_code == 200, submit.text
    assert submit.json()["payment_status"] == "awaiting_review"

    pending = await client.get("/api/v1/admin/manual-payments", headers=admin_h)
    assert pending.status_code == 200, pending.text
    txns = [t for t in pending.json() if t["order_id"] == order_id]
    assert len(txns) == 1
    txn_id = txns[0]["id"]

    approve = await client.post(
        f"/api/v1/admin/manual-payments/{txn_id}/approve",
        headers=admin_h,
        json={"momo_transaction_id": "MTN-TXN-TEST-001"},
    )
    assert approve.status_code == 200, approve.text
    assert approve.json()["status"] == "successful"

    dup = await client.post(
        f"/api/v1/admin/manual-payments/{txn_id}/approve",
        headers=admin_h,
        json={"momo_transaction_id": "MTN-TXN-TEST-002"},
    )
    assert dup.status_code == 400

    # Reject path on a second order
    order2 = await client.post(
        "/api/v1/orders/",
        headers=patient_h,
        json={
            "delivery_method": "pickup",
            "items": [{"product_name": "Test Med 2", "quantity": 1, "unit_price": 3000}],
        },
    )
    assert order2.status_code in (200, 201), order2.text
    order2_id = order2.json()["id"]

    submit2 = await client.post(
        f"/api/v1/patients/me/orders/{order2_id}/payments/manual",
        headers=patient_h,
        json={"proof_urls": ["https://example.com/proof2.png"]},
    )
    assert submit2.status_code == 200, submit2.text
    txn2_id = (
        await client.get("/api/v1/admin/manual-payments", headers=admin_h)
    ).json()
    txn2_id = next(t["id"] for t in txn2_id if t["order_id"] == order2_id)

    reject = await client.post(
        f"/api/v1/admin/manual-payments/{txn2_id}/reject",
        headers=admin_h,
        json={"review_note": "Amount mismatch in screenshot"},
    )
    assert reject.status_code == 200, reject.text
    assert reject.json()["status"] == "rejected"

    # Third order — cannot reuse MoMo transaction ID from first approval
    order3 = await client.post(
        "/api/v1/orders/",
        headers=patient_h,
        json={
            "delivery_method": "pickup",
            "items": [{"product_name": "Test Med 3", "quantity": 1, "unit_price": 2000}],
        },
    )
    assert order3.status_code in (200, 201), order3.text
    order3_id = order3.json()["id"]
    submit3 = await client.post(
        f"/api/v1/patients/me/orders/{order3_id}/payments/manual",
        headers=patient_h,
        json={"proof_urls": ["https://example.com/proof3.png"]},
    )
    assert submit3.status_code == 200, submit3.text
    txn3_id = next(
        t["id"]
        for t in (await client.get("/api/v1/admin/manual-payments", headers=admin_h)).json()
        if t["order_id"] == order3_id
    )
    reuse = await client.post(
        f"/api/v1/admin/manual-payments/{txn3_id}/approve",
        headers=admin_h,
        json={"momo_transaction_id": "MTN-TXN-TEST-001"},
    )
    assert reuse.status_code == 400


@pytest.mark.anyio
async def test_public_config_includes_manual_momo(client: AsyncClient, db: AsyncSession):
    resp = await client.get("/api/v1/config/public")
    assert resp.status_code == 200, resp.text
    payments = resp.json()["payments"]
    assert "manual_momo" in payments.get("methods", [])
    assert payments.get("manual_momo") is not None
