"""Phase 9 — Notifications, Audit & Health Articles.

Covers (23 scenarios):
1.  List own notifications
2.  Cannot read another user's notification
3.  Mark own notification as read
4.  Mark all own notifications read
5.  Unread count works
6.  Super admin can create system notification
7.  Super admin can view audit logs
8.  Compliance admin can view audit logs
9.  Patient cannot view audit logs
10. Sensitive action creates audit log
11. Pharmacist can create draft article
12. Pharmacist can publish article
13. Published article appears in public list
14. Draft article does not appear in public list
15. Patient can read published article by slug
16. Patient cannot read archived/draft article by slug
17. Super admin can manage any article
18. Unauthorized role cannot create article
19. Doctor-created prescription creates patient notification
20. Product request review creates requester notification
21. Order status change creates notification
22. Delivery QR confirmation creates notification (service-level)
23. Withdrawal approval creates requester notification
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


from tests.bootstrap import register_for_test, mark_pharmacy_verified, mark_order_paid
from tests.conftest import TEST_MEDICINE_INFO_URL


async def _register(client: AsyncClient, role: str) -> dict:
    return await register_for_test(client, client._test_db, role=role)


async def _patient_profile_id(client: AsyncClient, patient: dict) -> str:
    r = await client.get("/api/v1/patients/me", headers=_h(patient))
    assert r.status_code == 200, r.text
    return r.json()["id"]


async def _user_id(client: AsyncClient, tokens: dict) -> str:
    r = await client.get("/api/v1/users/me", headers=_h(tokens))
    assert r.status_code == 200, r.text
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


async def _seed_notification_for(client: AsyncClient, sa: dict, target_user_id: str) -> str:
    r = await client.post(
        "/api/v1/notifications/",
        headers=_h(sa),
        json={
            "user_id": target_user_id,
            "title": "Hello",
            "message": "World",
        },
    )
    assert r.status_code in (200, 201), r.text
    return r.json()["id"]


async def _list_notifications(client: AsyncClient, tokens: dict) -> list[dict]:
    r = await client.get("/api/v1/notifications/", headers=_h(tokens))
    assert r.status_code == 200, r.text
    return r.json()["items"]


# ════════════════════════════ Notifications ════════════════════════════

async def test_user_can_list_own_notifications(client: AsyncClient):
    sa = await _register(client, "super_admin")
    patient = await _register(client, "patient")
    pid = await _user_id(client, patient)
    await _seed_notification_for(client, sa, pid)
    items = await _list_notifications(client, patient)
    assert any(n["title"] == "Hello" for n in items)


async def test_user_cannot_mark_other_users_notification(client: AsyncClient):
    sa = await _register(client, "super_admin")
    p1 = await _register(client, "patient")
    p2 = await _register(client, "patient")
    pid1 = await _user_id(client, p1)
    nid = await _seed_notification_for(client, sa, pid1)
    r = await client.patch(f"/api/v1/notifications/{nid}/read", headers=_h(p2))
    assert r.status_code == 403


async def test_user_marks_own_notification_read(client: AsyncClient):
    sa = await _register(client, "super_admin")
    patient = await _register(client, "patient")
    pid = await _user_id(client, patient)
    nid = await _seed_notification_for(client, sa, pid)
    r = await client.patch(f"/api/v1/notifications/{nid}/read", headers=_h(patient))
    assert r.status_code == 200, r.text
    assert r.json()["read_status"] is True


async def test_user_marks_all_read(client: AsyncClient):
    sa = await _register(client, "super_admin")
    patient = await _register(client, "patient")
    pid = await _user_id(client, patient)
    for _ in range(3):
        await _seed_notification_for(client, sa, pid)
    r = await client.post("/api/v1/notifications/mark-all-read", headers=_h(patient))
    assert r.status_code == 204
    count = await client.get("/api/v1/notifications/unread-count", headers=_h(patient))
    assert count.json()["unread"] == 0


async def test_unread_count_works(client: AsyncClient):
    sa = await _register(client, "super_admin")
    patient = await _register(client, "patient")
    pid = await _user_id(client, patient)
    await _seed_notification_for(client, sa, pid)
    await _seed_notification_for(client, sa, pid)
    r = await client.get("/api/v1/notifications/unread-count", headers=_h(patient))
    assert r.status_code == 200
    assert r.json()["unread"] >= 2


async def test_super_admin_creates_system_notification(client: AsyncClient):
    sa = await _register(client, "super_admin")
    patient = await _register(client, "patient")
    pid = await _user_id(client, patient)
    r = await client.post(
        "/api/v1/notifications/",
        headers=_h(sa),
        json={
            "user_id": pid,
            "title": "System",
            "message": "Heads up",
            "category": "system",
        },
    )
    assert r.status_code in (200, 201), r.text
    items = await _list_notifications(client, patient)
    assert any(n["title"] == "System" for n in items)


async def test_patient_cannot_create_system_notification(client: AsyncClient):
    patient = await _register(client, "patient")
    pid = await _user_id(client, patient)
    r = await client.post(
        "/api/v1/notifications/",
        headers=_h(patient),
        json={
            "user_id": pid,
            "title": "X",
            "message": "Y",
        },
    )
    assert r.status_code == 403


# ════════════════════════════ Audit logs ════════════════════════════

async def test_super_admin_can_view_audit_logs(client: AsyncClient):
    sa = await _register(client, "super_admin")
    r = await client.get("/api/v1/admin/audit-logs", headers=_h(sa))
    assert r.status_code == 200, r.text
    assert "items" in r.json()


async def test_compliance_admin_can_view_audit_logs(client: AsyncClient):
    ca = await _register(client, "compliance_admin")
    r = await client.get("/api/v1/admin/audit-logs", headers=_h(ca))
    assert r.status_code == 200, r.text


async def test_patient_cannot_view_audit_logs(client: AsyncClient):
    patient = await _register(client, "patient")
    r = await client.get("/api/v1/admin/audit-logs", headers=_h(patient))
    assert r.status_code == 403


async def test_sensitive_action_creates_audit_log(client: AsyncClient):
    """Creating a doctor prescription should produce an audit log row."""
    sa = await _register(client, "super_admin")
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _patient_profile_id(client, patient)

    create = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "notes": "audit-test",
            "items": [
                {
                    "medicine_name": "Paracetamol",
                    "dosage": "500mg",
                    "frequency": "2x daily",
                    "duration": "3 days",
                    "quantity": 6,
                }
            ],
        },
    )
    assert create.status_code == 201, create.text
    rx_id = create.json()["id"]

    logs = await client.get(
        f"/api/v1/admin/audit-logs/entity/DigitalPrescription/{rx_id}",
        headers=_h(sa),
    )
    assert logs.status_code == 200, logs.text
    items = logs.json()["items"]
    assert any(item["action"] == "prescription.created" for item in items)


# ════════════════════════════ Health Articles ════════════════════════════

async def _create_article(client: AsyncClient, tokens: dict, **overrides) -> dict:
    payload = {
        "title": overrides.get("title", f"Healthy Living {_uid()}"),
        "summary": "Short summary",
        "content": "Full article body content goes here.",
        "category": overrides.get("category", "wellness"),
    }
    r = await client.post("/api/v1/articles/", headers=_h(tokens), json=payload)
    assert r.status_code == 201, r.text
    return r.json()


async def test_pharmacist_creates_draft_article(client: AsyncClient):
    pharmacist = await _register(client, "pharmacist")
    art = await _create_article(client, pharmacist)
    assert art["status"] == "draft"
    assert art["slug"]
    assert art["published_at"] is None


async def test_pharmacist_publishes_article(client: AsyncClient):
    pharmacist = await _register(client, "pharmacist")
    art = await _create_article(client, pharmacist)
    r = await client.patch(f"/api/v1/articles/{art['id']}/publish", headers=_h(pharmacist))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "published"
    assert r.json()["published_at"] is not None


async def test_published_article_in_public_list(client: AsyncClient):
    pharmacist = await _register(client, "pharmacist")
    art = await _create_article(client, pharmacist)
    await client.patch(f"/api/v1/articles/{art['id']}/publish", headers=_h(pharmacist))
    r = await client.get("/api/v1/articles/")
    assert r.status_code == 200, r.text
    assert any(a["id"] == art["id"] for a in r.json()["items"])


async def test_draft_article_hidden_from_public_list(client: AsyncClient):
    pharmacist = await _register(client, "pharmacist")
    art = await _create_article(client, pharmacist)  # remains draft
    r = await client.get("/api/v1/articles/")
    assert r.status_code == 200
    assert not any(a["id"] == art["id"] for a in r.json()["items"])


async def test_patient_reads_published_article_by_slug(client: AsyncClient):
    pharmacist = await _register(client, "pharmacist")
    art = await _create_article(client, pharmacist)
    await client.patch(f"/api/v1/articles/{art['id']}/publish", headers=_h(pharmacist))
    r = await client.get(f"/api/v1/articles/slug/{art['slug']}")
    assert r.status_code == 200, r.text
    assert r.json()["title"] == art["title"]


async def test_patient_cannot_read_draft_or_archived_article_by_slug(client: AsyncClient):
    pharmacist = await _register(client, "pharmacist")
    art = await _create_article(client, pharmacist)
    # draft → 404
    r = await client.get(f"/api/v1/articles/slug/{art['slug']}")
    assert r.status_code == 404
    # publish then archive → 404
    await client.patch(f"/api/v1/articles/{art['id']}/publish", headers=_h(pharmacist))
    await client.patch(f"/api/v1/articles/{art['id']}/archive", headers=_h(pharmacist))
    r2 = await client.get(f"/api/v1/articles/slug/{art['slug']}")
    assert r2.status_code == 404


async def test_super_admin_can_manage_any_article(client: AsyncClient):
    pharmacist = await _register(client, "pharmacist")
    sa = await _register(client, "super_admin")
    art = await _create_article(client, pharmacist)
    r = await client.patch(
        f"/api/v1/articles/{art['id']}",
        headers=_h(sa),
        json={"title": "Updated by SA"},
    )
    assert r.status_code == 200, r.text
    assert r.json()["title"] == "Updated by SA"
    # SA can delete
    d = await client.delete(f"/api/v1/articles/{art['id']}", headers=_h(sa))
    assert d.status_code == 204


async def test_patient_cannot_create_article(client: AsyncClient):
    patient = await _register(client, "patient")
    r = await client.post(
        "/api/v1/articles/",
        headers=_h(patient),
        json={"title": "Hi", "content": "Body"},
    )
    assert r.status_code == 403


# ══════════════════════════ Notification triggers ══════════════════════════

async def test_doctor_prescription_creates_patient_notification(client: AsyncClient):
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _patient_profile_id(client, patient)
    r = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [
                {
                    "medicine_name": "Ibuprofen",
                    "dosage": "200mg",
                    "frequency": "1x daily",
                    "duration": "5 days",
                    "quantity": 5,
                }
            ],
        },
    )
    assert r.status_code == 201, r.text
    items = await _list_notifications(client, patient)
    assert any("prescription" in (n["category"] or "").lower() or "prescription" in n["title"].lower()
               for n in items), items


async def test_product_request_review_creates_requester_notification(client: AsyncClient):
    sa = await _register(client, "super_admin")
    pharm_admin = await _register(client, "pharmacy_admin")
    await _create_pharmacy(client, pharm_admin)
    # Create request as pharmacy admin
    create = await client.post(
        "/api/v1/product-requests/",
        headers=_h(pharm_admin),
        json={
            "product_name": f"NewDrug_{_uid()}",
            "category": "antibiotic",
            "product_type": "medicine",
            "description": "Test request",
        },
    )
    assert create.status_code == 201, create.text
    req_id = create.json()["id"]
    # Submit
    sub = await client.patch(
        f"/api/v1/product-requests/{req_id}/submit", headers=_h(pharm_admin)
    )
    assert sub.status_code == 200, sub.text
    # Review (approve) by super admin
    rev = await client.patch(
        f"/api/v1/product-requests/{req_id}/review",
        headers=_h(sa),
        json={"status": "approved"},
    )
    assert rev.status_code == 200, rev.text

    items = await _list_notifications(client, pharm_admin)
    assert any("product" in (n["category"] or "").lower() or "request" in n["title"].lower()
               for n in items), items


async def test_order_status_change_creates_patient_notification(client: AsyncClient):
    sa = await _register(client, "super_admin")
    admin = await _register(client, "pharmacy_admin")
    await _create_pharmacy(client, admin)
    prod = await client.post(
        "/api/v1/products/",
        headers=_h(sa),
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
    assert prod.status_code == 201, prod.text
    listing = await client.post(
        "/api/v1/pharmacies/me/listings",
        headers=_h(admin),
        json={
            "product_id": prod.json()["id"],
            "price": 1000.0,
            "stock_quantity": 10,
            "availability_status": "available",
        },
    )
    assert listing.status_code == 201, listing.text
    patient = await _register(client, "patient")
    order = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing.json()["id"], "quantity": 1}],
        },
    )
    assert order.status_code == 201, order.text
    await mark_order_paid(client._test_db, order.json()["id"])
    # Pharmacy admin transitions to completed (notif fires)
    upd = await client.patch(
        f"/api/v1/pharmacies/me/orders/{order.json()['id']}/status",
        headers=_h(admin),
        json={"order_status": "completed"},
    )
    assert upd.status_code == 200, upd.text

    items = await _list_notifications(client, patient)
    assert any("order" in (n["category"] or "").lower() or "order" in n["title"].lower()
               for n in items), items


async def test_delivery_completed_notification_helper(client: AsyncClient, db):
    """Service-level: the delivery_completed helper inserts a patient notification."""
    from app.services.notification_service import NotificationService

    patient = await _register(client, "patient")
    pid = await _user_id(client, patient)
    await NotificationService(db).delivery_completed(
        pid, "order-test-id", order_code="ORD-TEST-123"
    )
    await db.commit()

    items = await _list_notifications(client, patient)
    assert any("ORD-TEST-123" in n["message"] or "delivery" in (n["category"] or "").lower()
               for n in items), items


async def test_withdrawal_approval_creates_requester_notification(client: AsyncClient):
    from tests.bootstrap import mark_order_paid

    sa = await _register(client, "super_admin")
    admin = await _register(client, "pharmacy_admin")
    await _create_pharmacy(client, admin)
    prod = await client.post(
        "/api/v1/products/",
        headers=_h(sa),
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
    listing = await client.post(
        "/api/v1/pharmacies/me/listings",
        headers=_h(admin),
        json={
            "product_id": prod.json()["id"],
            "price": 5000.0,
            "stock_quantity": 10,
            "availability_status": "available",
        },
    )
    patient = await _register(client, "patient")
    order = await client.post(
        "/api/v1/orders/",
        headers=_h(patient),
        json={
            "delivery_method": "pickup",
            "items": [{"product_listing_id": listing.json()["id"], "quantity": 1}],
        },
    )
    order_id = order.json()["id"]
    await mark_order_paid(client._test_db, order_id)
    await client.patch(
        f"/api/v1/pharmacies/me/orders/{order_id}/status",
        headers=_h(admin),
        json={"order_status": "completed"},
    )
    await client.put(
        "/api/v1/sellers/me/payout-credentials",
        headers=_h(admin),
        json={
            "payout_method": "mobile_money",
            "payout_details": {"account": "+250788000000", "account_name": "Test Owner"},
        },
    )
    wr = await client.post(
        "/api/v1/pharmacies/me/withdrawals",
        headers=_h(admin),
        json={"amount": 1000.0},
    )
    assert wr.status_code == 201, wr.text
    wid = wr.json()["id"]
    # Approve as super_admin
    ap = await client.patch(
        f"/api/v1/withdrawals/{wid}/approve",
        headers=_h(sa),
    )
    assert ap.status_code == 200, ap.text

    items = await _list_notifications(client, admin)
    assert any("withdrawal" in (n["category"] or "").lower() or "withdrawal" in n["title"].lower()
               for n in items), items
