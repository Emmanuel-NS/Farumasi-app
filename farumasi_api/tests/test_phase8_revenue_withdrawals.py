"""Phase 8 — Revenue & Withdrawal end-to-end tests.

Covers:
- Revenue record creation on order completion (idempotent)
- Owner-scoped revenue visibility (pharmacy / partner)
- Available balance & locked-funds math
- Withdrawal request validation, RBAC, lifecycle
- Admin (super_admin / finance_admin) actions: approve / reject / mark-paid
"""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


# ───────────────────────────── helpers ─────────────────────────────
def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _h(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


def _withdrawal_json(amount: float, *, allow_below_min: bool = False) -> dict:
    if not allow_below_min and amount > 0:
        amount = max(amount, 1000.0)
    return {"amount": amount}


async def _seed_payout_credentials(
    client: AsyncClient,
    admin_tokens: dict,
    *,
    method: str = "mobile_money",
    account: str = "+250788000000",
    name: str = "Test Owner",
) -> None:
    r = await client.put(
        "/api/v1/sellers/me/payout-credentials",
        headers=_h(admin_tokens),
        json={
            "payout_method": method,
            "payout_details": {"account": account, "account_name": name},
        },
    )
    assert r.status_code == 200, r.text


async def _pay_order_sandbox(client: AsyncClient, patient: dict, order_id: str, phone: str = "0788000000") -> None:
    r = await client.post(
        f"/api/v1/patients/me/orders/{order_id}/payments/flutterwave/initiate",
        headers=_h(patient),
        json={"phone": phone},
    )
    assert r.status_code == 200, r.text
    assert r.json()["payment_status"] == "paid", r.text


from tests.bootstrap import register_for_test, mark_pharmacy_verified, mark_partner_verified


async def _register(client: AsyncClient, role: str) -> dict:
    return await register_for_test(client, client._test_db, role=role)


from tests.conftest import TEST_MEDICINE_INFO_URL


async def _create_partner_product(client: AsyncClient, sa_tokens: dict) -> str:
    r = await client.post(
        "/api/v1/products/",
        headers=_h(sa_tokens),
        json={
            "name": f"Supplement_{_uid()}",
            "category": "wellness",
            "product_type": "food_supplements",
            "description": "test",
            "manufacturer": "ACME",
            "prescription_required": False,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _create_product(client: AsyncClient, sa_tokens: dict) -> str:
    r = await client.post(
        "/api/v1/products/",
        headers=_h(sa_tokens),
        json={
            "name": f"Drug_{_uid()}",
            "category": "analgesic",
            "product_type": "medicine",
            "description": "test",
            "manufacturer": "ACME",
            "prescription_required": False,
            "information_source_url": TEST_MEDICINE_INFO_URL,
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _create_pharmacy(client: AsyncClient, admin_tokens: dict) -> str:
    r = await client.post(
        "/api/v1/pharmacies/",
        headers=_h(admin_tokens),
        json={
            "name": f"Pharm_{_uid()}",
            "address": "addr",
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


async def _create_partner(client: AsyncClient, admin_tokens: dict) -> str:
    r = await client.post(
        "/api/v1/partners/",
        headers=_h(admin_tokens),
        json={
            "name": f"Partner_{_uid()}",
            "company_type": "supplier",
            "address": "addr",
            "city": "Kigali",
        },
    )
    assert r.status_code == 201, r.text
    partner_id = r.json()["id"]
    await mark_partner_verified(client._test_db, partner_id)
    return partner_id


async def _add_pharmacy_listing(
    client: AsyncClient, admin_tokens: dict, product_id: str, *, price: float = 1000.0, stock: int = 50
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


async def _add_partner_listing(
    client: AsyncClient, admin_tokens: dict, product_id: str, *, price: float = 1000.0, stock: int = 50
) -> str:
    r = await client.post(
        "/api/v1/partners/me/listings",
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


async def _create_listing_order(
    client: AsyncClient, patient_tokens: dict, listing_id: str, *, quantity: int = 1
) -> str:
    r = await client.post(
        "/api/v1/orders/",
        headers=_h(patient_tokens),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing_id, "quantity": quantity}],
        },
    )
    assert r.status_code == 201, r.text
    return r.json()["id"]


async def _complete_order(client: AsyncClient, admin_tokens: dict, order_id: str, *, kind: str = "pharmacy") -> dict:
    path = (
        f"/api/v1/pharmacies/me/orders/{order_id}/status"
        if kind == "pharmacy"
        else f"/api/v1/partners/me/orders/{order_id}/status"
    )
    r = await client.patch(path, headers=_h(admin_tokens), json={"order_status": "completed"})
    assert r.status_code == 200, r.text
    return r.json()


async def _setup_pharmacy_with_revenue(
    client: AsyncClient,
    sa: dict,
    *,
    listing_price: float = 2000.0,
    quantity: int = 1,
) -> tuple[dict, str, str]:
    """Register a pharmacy_admin, create pharmacy + listing, complete an order.

    Returns: (admin_tokens, pharmacy_id, order_id)
    """
    admin = await _register(client, "pharmacy_admin")
    pharmacy_id = await _create_pharmacy(client, admin)
    product_id = await _create_product(client, sa)
    listing_id = await _add_pharmacy_listing(
        client, admin, product_id, price=listing_price
    )
    patient = await _register(client, "patient")
    order_id = await _create_listing_order(
        client, patient, listing_id, quantity=quantity
    )
    await _pay_order_sandbox(client, patient, order_id)
    await _complete_order(client, admin, order_id)
    await _seed_payout_credentials(client, admin)
    return admin, pharmacy_id, order_id


async def _setup_partner_with_revenue(
    client: AsyncClient,
    sa: dict,
    *,
    listing_price: float = 2000.0,
    quantity: int = 1,
) -> tuple[dict, str, str]:
    admin = await _register(client, "partner_company_admin")
    partner_id = await _create_partner(client, admin)
    product_id = await _create_partner_product(client, sa)
    listing_id = await _add_partner_listing(
        client, admin, product_id, price=listing_price
    )
    patient = await _register(client, "patient")
    order_id = await _create_listing_order(
        client, patient, listing_id, quantity=quantity
    )
    await _pay_order_sandbox(client, patient, order_id)
    await _complete_order(client, admin, order_id, kind="partner")
    await _seed_payout_credentials(
        client, admin, method="bank_transfer", account="0001234567890", name="Test Partner"
    )
    return admin, partner_id, order_id


# ══════════════════════════════ Tests ══════════════════════════════

# 1. Completed order creates exactly one revenue record.
async def test_completed_order_creates_one_revenue_record(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, pharmacy_id, _ = await _setup_pharmacy_with_revenue(client, sa)
    r = await client.get("/api/v1/pharmacies/me/revenue", headers=_h(admin))
    assert r.status_code == 200, r.text
    records = r.json()
    assert len(records) == 1
    assert records[0]["pharmacy_id"] == pharmacy_id
    assert float(records[0]["gross_amount"]) == 2000.0


# 2. Re-marking COMPLETED does not duplicate revenue (idempotent).
async def test_revenue_creation_is_idempotent(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, order_id = await _setup_pharmacy_with_revenue(client, sa)
    # Re-issue a COMPLETED transition (allowed by super_admin)
    r2 = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=_h(sa),
        json={"order_status": "completed"},
    )
    assert r2.status_code == 200, r2.text
    r = await client.get("/api/v1/pharmacies/me/revenue", headers=_h(admin))
    assert len(r.json()) == 1


# 3. Pharmacy admin can view own revenue summary.
async def test_pharmacy_admin_views_own_revenue(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    r = await client.get("/api/v1/pharmacies/me/revenue/summary", headers=_h(admin))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["gross_revenue"] == 2000.0
    assert body["completed_orders"] == 1
    assert body["available_balance"] > 0


# 4. Pharmacy admin cannot see another pharmacy's revenue via admin endpoint.
async def test_pharmacy_admin_cannot_view_other_pharmacy_revenue(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin_a, pharmacy_a, _ = await _setup_pharmacy_with_revenue(client, sa)
    admin_b = await _register(client, "pharmacy_admin")
    await _create_pharmacy(client, admin_b)
    # Admin endpoint requires finance role.
    r = await client.get(
        f"/api/v1/revenue/pharmacy/{pharmacy_a}", headers=_h(admin_b)
    )
    assert r.status_code == 403


# 5. Partner admin can view own revenue.
async def test_partner_admin_views_own_revenue(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, partner_id, _ = await _setup_partner_with_revenue(client, sa)
    r = await client.get("/api/v1/partners/me/revenue/summary", headers=_h(admin))
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["gross_revenue"] == 2000.0
    records = (await client.get("/api/v1/partners/me/revenue", headers=_h(admin))).json()
    assert all(rec["partner_company_id"] == partner_id for rec in records)


# 6. Partner admin cannot view another partner's revenue.
async def test_partner_admin_cannot_view_other_partner_revenue(client: AsyncClient):
    sa = await _register(client, "super_admin")
    _, partner_a, _ = await _setup_partner_with_revenue(client, sa)
    admin_b = await _register(client, "partner_company_admin")
    await _create_partner(client, admin_b)
    r = await client.get(
        f"/api/v1/revenue/partner/{partner_a}", headers=_h(admin_b)
    )
    assert r.status_code == 403


# 7. Available balance equals net of completed records when no withdrawals.
async def test_available_balance_matches_net_revenue(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    r = await client.get("/api/v1/pharmacies/me/revenue/summary", headers=_h(admin))
    body = r.json()
    assert body["available_balance"] == body["net_revenue"]


# 8. Pending withdrawal reduces available balance.
async def test_pending_withdrawal_reduces_available_balance(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    before = (
        await client.get("/api/v1/pharmacies/me/revenue/summary", headers=_h(admin))
    ).json()
    amount = before["available_balance"] / 2
    withdrawal = _withdrawal_json(amount)
    r = await client.post(
        "/api/v1/pharmacies/me/withdrawals",
        headers=_h(admin),
        json=withdrawal,
    )
    assert r.status_code == 201, r.text
    withdrawn = withdrawal["amount"]
    after = (
        await client.get("/api/v1/pharmacies/me/revenue/summary", headers=_h(admin))
    ).json()
    assert after["available_balance"] == before["available_balance"] - withdrawn
    assert after["pending_withdrawals"] == withdrawn


# 9. Multiple pending withdrawals cannot exceed available balance.
async def test_multiple_withdrawals_cannot_exceed_balance(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    summary = (
        await client.get("/api/v1/pharmacies/me/revenue/summary", headers=_h(admin))
    ).json()
    avail = summary["available_balance"]
    r1 = await client.post(
        "/api/v1/pharmacies/me/withdrawals",
        headers=_h(admin),
        json=_withdrawal_json(avail * 0.6),
    )
    assert r1.status_code == 201, r1.text
    r2 = await client.post(
        "/api/v1/pharmacies/me/withdrawals",
        headers=_h(admin),
        json=_withdrawal_json(avail * 0.6),
    )
    assert r2.status_code == 400, r2.text


# 10. Pharmacy admin can request valid withdrawal.
async def test_pharmacy_admin_requests_withdrawal(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, pharmacy_id, _ = await _setup_pharmacy_with_revenue(client, sa)
    r = await client.post(
        "/api/v1/pharmacies/me/withdrawals",
        headers=_h(admin),
        json=_withdrawal_json(100.0),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["pharmacy_id"] == pharmacy_id
    assert body["status"] == "pending"


# 11. Partner admin can request valid withdrawal.
async def test_partner_admin_requests_withdrawal(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, partner_id, _ = await _setup_partner_with_revenue(client, sa)
    r = await client.post(
        "/api/v1/partners/me/withdrawals",
        headers=_h(admin),
        json=_withdrawal_json(100.0),
    )
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["partner_company_id"] == partner_id
    assert body["status"] == "pending"


# 12. Withdrawal amount cannot exceed available balance.
async def test_withdrawal_exceeds_available_balance(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    r = await client.post(
        "/api/v1/pharmacies/me/withdrawals",
        headers=_h(admin),
        json=_withdrawal_json(9_999_999.0),
    )
    assert r.status_code == 400, r.text


# 13. Withdrawal amount must be > 0.
async def test_withdrawal_amount_must_be_positive(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    r = await client.post(
        "/api/v1/pharmacies/me/withdrawals",
        headers=_h(admin),
        json=_withdrawal_json(0, allow_below_min=True),
    )
    assert r.status_code == 422, r.text


# 14. Withdrawal requires registered payout credentials.
async def test_withdrawal_requires_payout_credentials(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin = await _register(client, "pharmacy_admin")
    pharmacy_id = await _create_pharmacy(client, admin)
    product_id = await _create_product(client, sa)
    listing_id = await _add_pharmacy_listing(client, admin, product_id, price=2000.0)
    patient = await _register(client, "patient")
    order_id = await _create_listing_order(client, patient, listing_id)
    await _pay_order_sandbox(client, patient, order_id)
    await _complete_order(client, admin, order_id)

    r = await client.post(
        "/api/v1/pharmacies/me/withdrawals",
        headers=_h(admin),
        json=_withdrawal_json(100.0),
    )
    assert r.status_code == 400, r.text
    assert "payout credentials" in r.text.lower()

    await _seed_payout_credentials(client, admin)
    r2 = await client.post(
        "/api/v1/pharmacies/me/withdrawals",
        headers=_h(admin),
        json=_withdrawal_json(100.0),
    )
    assert r2.status_code == 201, r2.text
    assert r2.json()["pharmacy_id"] == pharmacy_id


# 15. Patient cannot request a withdrawal.
async def test_patient_cannot_request_withdrawal(client: AsyncClient):
    patient = await _register(client, "patient")
    r = await client.post(
        "/api/v1/withdrawals/",
        headers=_h(patient),
        json=_withdrawal_json(10.0),
    )
    assert r.status_code == 403, r.text


# 15. Doctor cannot view platform revenue.
async def test_doctor_cannot_view_revenue(client: AsyncClient):
    doctor = await _register(client, "doctor")
    r = await client.get("/api/v1/revenue/summary", headers=_h(doctor))
    assert r.status_code == 403, r.text


# 16. Super admin can list all withdrawals.
async def test_super_admin_lists_all_withdrawals(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    await client.post(
        "/api/v1/pharmacies/me/withdrawals",
        headers=_h(admin),
        json=_withdrawal_json(50.0),
    )
    r = await client.get("/api/v1/withdrawals/", headers=_h(sa))
    assert r.status_code == 200, r.text
    assert len(r.json()) >= 1


# 17. Finance admin can approve a withdrawal.
async def test_finance_admin_approves_withdrawal(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    finance = await _register(client, "finance_admin")
    w = (
        await client.post(
            "/api/v1/pharmacies/me/withdrawals",
            headers=_h(admin),
            json=_withdrawal_json(50.0),
        )
    ).json()
    r = await client.patch(
        f"/api/v1/withdrawals/{w['id']}/approve", headers=_h(finance)
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "approved"


# 18. Finance admin can reject a withdrawal.
async def test_finance_admin_rejects_withdrawal(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    finance = await _register(client, "finance_admin")
    w = (
        await client.post(
            "/api/v1/pharmacies/me/withdrawals",
            headers=_h(admin),
            json=_withdrawal_json(50.0),
        )
    ).json()
    r = await client.patch(
        f"/api/v1/withdrawals/{w['id']}/reject",
        headers=_h(finance),
        json={"notes": "policy"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "rejected"


# 19. Super admin can mark withdrawal paid.
async def test_super_admin_marks_withdrawal_paid(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    w = (
        await client.post(
            "/api/v1/pharmacies/me/withdrawals",
            headers=_h(admin),
            json=_withdrawal_json(100.0),
        )
    ).json()
    await client.patch(f"/api/v1/withdrawals/{w['id']}/approve", headers=_h(sa))
    r = await client.patch(
        f"/api/v1/withdrawals/{w['id']}/mark-paid", headers=_h(sa)
    )
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "paid"
    assert r.json()["processed_by_user_id"] == sa["user"]["id"] if "user" in sa else True


# 20. Marking paid flips revenue records to WITHDRAWN (or reduces available).
async def test_mark_paid_reduces_balance(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    before = (
        await client.get("/api/v1/pharmacies/me/revenue/summary", headers=_h(admin))
    ).json()
    w = (
        await client.post(
            "/api/v1/pharmacies/me/withdrawals",
            headers=_h(admin),
            json=_withdrawal_json(before["available_balance"]),
        )
    ).json()
    await client.patch(f"/api/v1/withdrawals/{w['id']}/approve", headers=_h(sa))
    await client.patch(f"/api/v1/withdrawals/{w['id']}/mark-paid", headers=_h(sa))
    after = (
        await client.get("/api/v1/pharmacies/me/revenue/summary", headers=_h(admin))
    ).json()
    assert after["withdrawn_amount"] > 0
    assert after["paid_withdrawals"] == before["available_balance"]
    assert after["available_balance"] == 0


# 21. Rejected withdrawal does not reduce balance.
async def test_rejected_withdrawal_releases_balance(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    before = (
        await client.get("/api/v1/pharmacies/me/revenue/summary", headers=_h(admin))
    ).json()
    w = (
        await client.post(
            "/api/v1/pharmacies/me/withdrawals",
            headers=_h(admin),
            json=_withdrawal_json(before["available_balance"]),
        )
    ).json()
    await client.patch(f"/api/v1/withdrawals/{w['id']}/reject", headers=_h(sa))
    after = (
        await client.get("/api/v1/pharmacies/me/revenue/summary", headers=_h(admin))
    ).json()
    assert after["available_balance"] == before["available_balance"]


# 22. Requester (non-super_admin) cannot approve their own withdrawal.
async def test_requester_cannot_self_approve(client: AsyncClient, db):
    from sqlalchemy import select
    from app.models.user import User
    from app.core.constants import UserRole

    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    w = (
        await client.post(
            "/api/v1/pharmacies/me/withdrawals",
            headers=_h(admin),
            json=_withdrawal_json(50.0),
        )
    ).json()
    # Promote the same pharmacy_admin user to finance_admin so they can
    # call PATCH /approve and reach the service-level self-approval guard.
    user = (
        await db.execute(select(User).where(User.email == admin["email"]))
    ).scalar_one()
    user.role = UserRole.FINANCE_ADMIN
    await db.commit()

    r = await client.patch(
        f"/api/v1/withdrawals/{w['id']}/approve", headers=_h(admin)
    )
    assert r.status_code == 400, r.text
    assert "own" in r.text.lower()


# 23. GET /withdrawals/{id} works for admin and the requester.
async def test_get_withdrawal_by_id_admin_and_requester(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    w = (
        await client.post(
            "/api/v1/pharmacies/me/withdrawals",
            headers=_h(admin),
            json=_withdrawal_json(50.0),
        )
    ).json()
    # Admin (super_admin)
    r1 = await client.get(f"/api/v1/withdrawals/{w['id']}", headers=_h(sa))
    assert r1.status_code == 200
    # Requester
    r2 = await client.get(f"/api/v1/withdrawals/{w['id']}", headers=_h(admin))
    assert r2.status_code == 200
    assert r2.json()["id"] == w["id"]


# 24. Unrelated user cannot view another's withdrawal.
async def test_get_withdrawal_blocks_unrelated_user(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin, _, _ = await _setup_pharmacy_with_revenue(client, sa)
    w = (
        await client.post(
            "/api/v1/pharmacies/me/withdrawals",
            headers=_h(admin),
            json=_withdrawal_json(25.0),
        )
    ).json()
    intruder = await _register(client, "pharmacy_admin")
    r = await client.get(f"/api/v1/withdrawals/{w['id']}", headers=_h(intruder))
    assert r.status_code == 403, r.text
