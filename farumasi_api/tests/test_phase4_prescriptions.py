"""Phase 4 — Digital Prescriptions & Prescription Upload.

Covers:
- Doctor-created prescription happy path (no async lazy-load errors)
- Patient upload happy path
- Item add / update / delete
- Generic update (notes / status)
- Access-control: patient/doctor/pharmacist/other
- Pharmacist review create + update; status cascade
- Product linking: approved required, unapproved rejected
"""
from __future__ import annotations

import uuid

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


def _uid() -> str:
    return uuid.uuid4().hex[:8]


async def _register(client: AsyncClient, role: str, email: str | None = None) -> dict:
    email = email or f"{role}_{_uid()}@farumasi.com"
    r = await client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Pass@12345",
            "full_name": f"{role.title()} {_uid()}",
            "role": role,
        },
    )
    assert r.status_code in (200, 201), r.text
    data = r.json()
    data["email"] = email
    return data


def _h(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


async def _get_patient_profile_id(client: AsyncClient, patient_tokens: dict) -> str:
    me = await client.get("/api/v1/patients/me", headers=_h(patient_tokens))
    assert me.status_code == 200, me.text
    return me.json()["id"]


# ──────────────────────────────────────────────────────────────────────────
# Creation
# ──────────────────────────────────────────────────────────────────────────
async def test_doctor_creates_prescription_with_patient_serialized(client: AsyncClient):
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)

    resp = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "notes": "Take with food",
            "items": [
                {
                    "medicine_name": "Amoxicillin",
                    "dosage": "500mg",
                    "frequency": "3x daily",
                    "duration": "7 days",
                    "quantity": 21,
                }
            ],
        },
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    # PrescriptionOut should serialize without async lazy-load failures
    assert body["id"]
    assert body["prescription_type"] == "doctor_created"
    assert body["status"] == "active"
    assert len(body["items"]) == 1
    assert body["patient"]["id"] == patient_id
    assert body["patient"]["user"]["email"] == patient["email"]


async def test_patient_cannot_create_prescription(client: AsyncClient):
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)

    resp = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(patient),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "X"}],
        },
    )
    assert resp.status_code == 403, resp.text


async def test_create_prescription_requires_items(client: AsyncClient):
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)

    resp = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [],
        },
    )
    assert resp.status_code == 422, resp.text


# ──────────────────────────────────────────────────────────────────────────
# Patient upload
# ──────────────────────────────────────────────────────────────────────────
async def test_patient_uploads_prescription(client: AsyncClient):
    patient = await _register(client, "patient")
    resp = await client.post(
        "/api/v1/patients/me/prescriptions/upload",
        headers=_h(patient),
        json={"uploaded_file_url": "https://files/test/rx.png", "notes": "front"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["prescription_type"] == "patient_uploaded"
    assert body["uploaded_file_url"] == "https://files/test/rx.png"
    assert body["items"] == []
    assert body["patient"]["user"]["email"] == patient["email"]


async def test_non_patient_cannot_upload(client: AsyncClient):
    doctor = await _register(client, "doctor")
    # Doctor has no patient profile so upload route 404s when looked up by user_id
    # but the endpoint is /patients/me/* so doctor's call also fails because no patient profile
    resp = await client.post(
        "/api/v1/patients/me/prescriptions/upload",
        headers=_h(doctor),
        json={"uploaded_file_url": "https://x/y.png"},
    )
    assert resp.status_code in (403, 404), resp.text


# ──────────────────────────────────────────────────────────────────────────
# Read / access control
# ──────────────────────────────────────────────────────────────────────────
async def test_get_prescription_by_owner_and_creator(client: AsyncClient):
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)

    create = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "Paracetamol", "quantity": 6}],
        },
    )
    rx_id = create.json()["id"]

    # Doctor (creator) can read
    r_doc = await client.get(f"/api/v1/prescriptions/{rx_id}", headers=_h(doctor))
    assert r_doc.status_code == 200
    # Patient (owner) can read
    r_pat = await client.get(f"/api/v1/prescriptions/{rx_id}", headers=_h(patient))
    assert r_pat.status_code == 200


async def test_unrelated_patient_cannot_read(client: AsyncClient):
    doctor = await _register(client, "doctor")
    owner = await _register(client, "patient")
    intruder = await _register(client, "patient")
    owner_id = await _get_patient_profile_id(client, owner)

    create = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": owner_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "A"}],
        },
    )
    rx_id = create.json()["id"]

    r = await client.get(f"/api/v1/prescriptions/{rx_id}", headers=_h(intruder))
    assert r.status_code == 403


async def test_unrelated_doctor_cannot_read(client: AsyncClient):
    creator = await _register(client, "doctor")
    other_doc = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)

    create = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(creator),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "A"}],
        },
    )
    rx_id = create.json()["id"]

    r = await client.get(f"/api/v1/prescriptions/{rx_id}", headers=_h(other_doc))
    assert r.status_code == 403


async def test_patient_lists_only_own_prescriptions(client: AsyncClient):
    doctor = await _register(client, "doctor")
    p1 = await _register(client, "patient")
    p2 = await _register(client, "patient")
    p1_id = await _get_patient_profile_id(client, p1)
    p2_id = await _get_patient_profile_id(client, p2)

    for pid in (p1_id, p2_id):
        await client.post(
            "/api/v1/prescriptions/",
            headers=_h(doctor),
            json={
                "patient_id": pid,
                "prescription_type": "doctor_created",
                "items": [{"medicine_name": "X"}],
            },
        )

    r = await client.get("/api/v1/patients/me/prescriptions", headers=_h(p1))
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1
    assert items[0]["patient_id"] == p1_id


async def test_doctor_me_prescriptions_returns_own(client: AsyncClient):
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)

    await client.post(
        "/api/v1/doctors/me/prescriptions",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "Q"}],
        },
    )

    r = await client.get("/api/v1/doctors/me/prescriptions", headers=_h(doctor))
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1


# ──────────────────────────────────────────────────────────────────────────
# Update / items
# ──────────────────────────────────────────────────────────────────────────
async def test_doctor_updates_own_prescription_notes(client: AsyncClient):
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)

    create = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "A"}],
        },
    )
    rx_id = create.json()["id"]

    r = await client.patch(
        f"/api/v1/prescriptions/{rx_id}",
        headers=_h(doctor),
        json={"notes": "Updated"},
    )
    assert r.status_code == 200
    assert r.json()["notes"] == "Updated"


async def test_other_doctor_cannot_update(client: AsyncClient):
    creator = await _register(client, "doctor")
    other = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)
    create = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(creator),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "A"}],
        },
    )
    rx_id = create.json()["id"]

    r = await client.patch(
        f"/api/v1/prescriptions/{rx_id}",
        headers=_h(other),
        json={"notes": "hack"},
    )
    assert r.status_code == 403


async def test_add_and_update_and_delete_item(client: AsyncClient):
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)
    create = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [
                {"medicine_name": "Keep"},
                {"medicine_name": "Remove"},
            ],
        },
    )
    rx_id = create.json()["id"]

    # Add a third item
    add = await client.post(
        f"/api/v1/prescriptions/{rx_id}/items",
        headers=_h(doctor),
        json={"medicine_name": "Added", "quantity": 3},
    )
    assert add.status_code == 201, add.text
    new_item_id = add.json()["id"]

    # Update it
    upd = await client.patch(
        f"/api/v1/prescriptions/{rx_id}/items/{new_item_id}",
        headers=_h(doctor),
        json={"quantity": 9, "instructions": "after meals"},
    )
    assert upd.status_code == 200, upd.text
    assert upd.json()["quantity"] == 9
    assert upd.json()["instructions"] == "after meals"

    # Delete it
    rm = await client.delete(
        f"/api/v1/prescriptions/{rx_id}/items/{new_item_id}",
        headers=_h(doctor),
    )
    assert rm.status_code == 204, rm.text


async def test_cannot_delete_last_item(client: AsyncClient):
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)
    create = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "Only"}],
        },
    )
    rx_id = create.json()["id"]
    item_id = create.json()["items"][0]["id"]

    rm = await client.delete(
        f"/api/v1/prescriptions/{rx_id}/items/{item_id}",
        headers=_h(doctor),
    )
    assert rm.status_code == 400


# ──────────────────────────────────────────────────────────────────────────
# Pharmacist review
# ──────────────────────────────────────────────────────────────────────────
async def _make_active_prescription(client: AsyncClient) -> tuple[str, dict, dict]:
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)
    create = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "Test"}],
        },
    )
    return create.json()["id"], doctor, patient


async def test_pharmacist_can_create_review_and_status_cascades(client: AsyncClient):
    pharm = await _register(client, "pharmacist")
    rx_id, _doctor, _patient = await _make_active_prescription(client)

    r = await client.post(
        "/api/v1/pharmacists/prescription-reviews",
        headers=_h(pharm),
        json={
            "prescription_id": rx_id,
            "review_status": "approved",
            "review_notes": "looks good",
        },
    )
    assert r.status_code == 201, r.text
    review_id = r.json()["id"]
    assert r.json()["review_status"] == "approved"

    # Prescription status should be 'reviewed' now
    g = await client.get(f"/api/v1/prescriptions/{rx_id}", headers=_h(pharm))
    assert g.status_code == 200
    assert g.json()["status"] == "reviewed"

    # Update review -> clarification_needed -> cascade to under_review
    u = await client.patch(
        f"/api/v1/pharmacists/prescription-reviews/{review_id}",
        headers=_h(pharm),
        json={"review_status": "clarification_needed"},
    )
    assert u.status_code == 200, u.text
    g2 = await client.get(f"/api/v1/prescriptions/{rx_id}", headers=_h(pharm))
    assert g2.json()["status"] == "under_review"


async def test_non_pharmacist_cannot_review(client: AsyncClient):
    doctor = await _register(client, "doctor")
    rx_id, _, _ = await _make_active_prescription(client)
    r = await client.post(
        "/api/v1/pharmacists/prescription-reviews",
        headers=_h(doctor),
        json={"prescription_id": rx_id, "review_status": "approved"},
    )
    assert r.status_code == 403


async def test_pharmacist_review_uses_real_profile_id(client: AsyncClient):
    """Regression: pharmacist_id must be the PharmacistProfile id, never actor.id."""
    pharm = await _register(client, "pharmacist")
    rx_id, _, _ = await _make_active_prescription(client)

    r = await client.post(
        "/api/v1/pharmacists/prescription-reviews",
        headers=_h(pharm),
        json={"prescription_id": rx_id, "review_status": "approved"},
    )
    assert r.status_code == 201

    me = await client.get("/api/v1/pharmacists/me", headers=_h(pharm))
    pharmacist_profile_id = me.json()["id"]
    assert r.json()["pharmacist_id"] == pharmacist_profile_id
    # And NOT the user id
    user_id = pharm.get("user_id") or pharm.get("user", {}).get("id")
    if user_id:
        assert r.json()["pharmacist_id"] != user_id


async def test_pharmacist_lists_reviews_filtered_to_self(client: AsyncClient):
    p1 = await _register(client, "pharmacist")
    p2 = await _register(client, "pharmacist")
    rx_id, _, _ = await _make_active_prescription(client)
    await client.post(
        "/api/v1/pharmacists/prescription-reviews",
        headers=_h(p1),
        json={"prescription_id": rx_id, "review_status": "approved"},
    )
    rx_id2, _, _ = await _make_active_prescription(client)
    await client.post(
        "/api/v1/pharmacists/prescription-reviews",
        headers=_h(p2),
        json={"prescription_id": rx_id2, "review_status": "approved"},
    )

    # mine=true should only show p1's review
    r = await client.get(
        "/api/v1/pharmacists/prescription-reviews?mine=true",
        headers=_h(p1),
    )
    assert r.status_code == 200
    assert r.json()["total"] >= 1
    assert all(
        item["prescription_id"] == rx_id for item in r.json()["items"]
    )


# ──────────────────────────────────────────────────────────────────────────
# Product linking
# ──────────────────────────────────────────────────────────────────────────
async def test_cannot_link_unapproved_product(client: AsyncClient):
    """Items linking an unapproved product must be rejected (400)."""
    # Pharmacist-created products default to PENDING_REVIEW (super_admin auto-approves)
    pharm = await _register(client, "pharmacist")
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)

    create_prod = await client.post(
        "/api/v1/products/",
        headers=_h(pharm),
        json={
            "name": "DraftMed",
            "generic_name": "DraftMed",
            "product_type": "medicine",
            "manufacturer": "X",
        },
    )
    assert create_prod.status_code in (200, 201), create_prod.text
    prod_id = create_prod.json()["id"]

    resp = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "X", "product_id": prod_id}],
        },
    )
    assert resp.status_code == 400, resp.text


async def test_link_approved_product_succeeds(client: AsyncClient):
    super_admin = await _register(client, "super_admin")
    doctor = await _register(client, "doctor")
    patient = await _register(client, "patient")
    patient_id = await _get_patient_profile_id(client, patient)

    create_prod = await client.post(
        "/api/v1/products/",
        headers=_h(super_admin),
        json={
            "name": "GoodMed",
            "generic_name": "GoodMed",
            "product_type": "medicine",
            "manufacturer": "X",
        },
    )
    prod_id = create_prod.json()["id"]
    await client.patch(
        f"/api/v1/products/{prod_id}/status",
        headers=_h(super_admin),
        json={"approval_status": "approved"},
    )

    resp = await client.post(
        "/api/v1/prescriptions/",
        headers=_h(doctor),
        json={
            "patient_id": patient_id,
            "prescription_type": "doctor_created",
            "items": [{"medicine_name": "GoodMed", "product_id": prod_id}],
        },
    )
    assert resp.status_code == 201, resp.text
    assert resp.json()["items"][0]["product_id"] == prod_id


# ──────────────────────────────────────────────────────────────────────────
# Upload endpoint
# ──────────────────────────────────────────────────────────────────────────
async def test_upload_prescription_endpoint(client: AsyncClient):
    patient = await _register(client, "patient")
    files = {"file": ("rx.png", b"\x89PNG\r\n\x1a\nfake", "image/png")}
    r = await client.post(
        "/api/v1/uploads/prescription",
        headers=_h(patient),
        files=files,
    )
    assert r.status_code == 200, r.text
    body = r.json()
    assert "url" in body and body["url"]
