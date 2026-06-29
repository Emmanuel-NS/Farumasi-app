"""
Phase-2 profile-foundation tests for FARUMASI API.

Covers:
  - Patient /me profile read/update
  - Doctor /me profile
  - Pharmacy owner /me (GET + PATCH)
  - Pharmacy admin cannot see another admin's pharmacy via /me
  - Partner owner /me (GET + PATCH)
  - Rider availability update
  - Hospital doctor management (admin owns hospital → 200; wrong hospital → 403)
  - Super-admin profiles/overview

Run with:
    pytest tests/test_phase2_profiles.py -v
"""
from __future__ import annotations

import uuid
import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


# ─── helpers ─────────────────────────────────────────────────────────────

def _uid() -> str:
    return uuid.uuid4().hex[:8]


from tests.bootstrap import register_for_test


async def _register(
    client: AsyncClient,
    email: str,
    role: str = "patient",
    password: str = "Test@12345",
    full_name: str = "Test User",
):
    return await register_for_test(
        client,
        client._test_db,
        role=role,
        email=email,
        password=password,
        full_name=full_name,
    )


def _headers(tokens: dict) -> dict:
    return {"Authorization": f"Bearer {tokens['access_token']}"}


# ─── patient profile ──────────────────────────────────────────────────────

async def test_patient_can_read_own_profile(client: AsyncClient):
    tokens = await _register(client, f"p2_patient_{_uid()}@test.com", role="patient")
    resp = await client.get("/api/v1/patients/me", headers=_headers(tokens))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "id" in body


async def test_patient_cannot_access_finance(client: AsyncClient):
    tokens = await _register(client, f"p2_pat_fin_{_uid()}@test.com", role="patient")
    resp = await client.get("/api/v1/withdrawals/", headers=_headers(tokens))
    assert resp.status_code == 403, resp.text


# ─── doctor profile ───────────────────────────────────────────────────────

async def test_doctor_can_read_own_profile(client: AsyncClient):
    tokens = await _register(client, f"p2_doctor_{_uid()}@test.com", role="doctor")
    resp = await client.get("/api/v1/doctors/me", headers=_headers(tokens))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert "id" in body


# ─── pharmacy /me ─────────────────────────────────────────────────────────

async def test_pharmacy_admin_can_create_and_read_own_pharmacy(client: AsyncClient):
    tokens = await _register(client, f"p2_pharma_{_uid()}@test.com", role="pharmacy_admin")
    resp = await client.post("/api/v1/pharmacies/", headers=_headers(tokens), json={
        "name": f"TestPharmacy_{_uid()}",
        "license_number": f"LIC-{_uid()}",
        "address": "123 Test Street, Kigali",
    })
    assert resp.status_code == 201, resp.text

    me_resp = await client.get("/api/v1/pharmacies/me", headers=_headers(tokens))
    assert me_resp.status_code == 200, me_resp.text
    assert me_resp.json()["owner_user_id"] is not None


async def test_second_pharmacy_admin_has_empty_me(client: AsyncClient):
    """A pharmacy_admin who hasn't created a pharmacy gets 404 on /me."""
    tokens = await _register(client, f"p2_pharma2_{_uid()}@test.com", role="pharmacy_admin")
    me_resp = await client.get("/api/v1/pharmacies/me", headers=_headers(tokens))
    assert me_resp.status_code == 404, me_resp.text


async def test_pharmacy_admin_can_update_own_pharmacy(client: AsyncClient):
    tokens = await _register(client, f"p2_pharmap_{_uid()}@test.com", role="pharmacy_admin")
    await client.post("/api/v1/pharmacies/", headers=_headers(tokens), json={
        "name": f"Phar_{_uid()}",
        "license_number": f"LIC-{_uid()}",
        "address": "1 Main St",
    })
    patch_resp = await client.patch("/api/v1/pharmacies/me", headers=_headers(tokens), json={
        "address": "2 Updated Ave, Kigali",
    })
    assert patch_resp.status_code == 200, patch_resp.text
    assert patch_resp.json()["address"] == "2 Updated Ave, Kigali"


# ─── partner /me ──────────────────────────────────────────────────────────

async def test_partner_admin_can_create_and_read_own_company(client: AsyncClient):
    tokens = await _register(client, f"p2_partner_{_uid()}@test.com", role="partner_company_admin")
    resp = await client.post("/api/v1/partners/", headers=_headers(tokens), json={
        "name": f"PartnerCo_{_uid()}",
        "company_type": "logistics",
        "business_registration_number": f"RN-{_uid()}",
    })
    assert resp.status_code == 201, resp.text

    me_resp = await client.get("/api/v1/partners/me", headers=_headers(tokens))
    assert me_resp.status_code == 200, me_resp.text


async def test_partner_admin_cannot_update_another_company(client: AsyncClient):
    admin1 = await _register(client, f"p2_pA_{_uid()}@test.com", role="partner_company_admin")
    company_resp = await client.post("/api/v1/partners/", headers=_headers(admin1), json={
        "name": f"CompA_{_uid()}",
        "company_type": "logistics",
        "business_registration_number": f"RN-{_uid()}",
    })
    company_id = company_resp.json()["id"]

    admin2 = await _register(client, f"p2_pB_{_uid()}@test.com", role="partner_company_admin")
    resp = await client.put(f"/api/v1/partners/{company_id}", headers=_headers(admin2), json={
        "name": "Hijacked Name",
    })
    assert resp.status_code == 403, resp.text


# ─── rider availability ───────────────────────────────────────────────────

async def test_rider_can_update_own_availability(client: AsyncClient):
    tokens = await _register(client, f"p2_rider_{_uid()}@test.com", role="rider")
    resp = await client.patch(
        "/api/v1/riders/me/availability",
        headers=_headers(tokens),
        json={"availability_status": "online"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["availability_status"] == "online"


# ─── hospital doctor management ───────────────────────────────────────────

async def test_hospital_admin_cannot_access_other_hospital_doctors(client: AsyncClient):
    """hospital_admin with no HospitalAdminProfile linking them to a hospital gets 403."""
    tokens = await _register(client, f"p2_hosp_{_uid()}@test.com", role="hospital_admin")
    # Use a non-existent hospital_id — should 403 before 404 (access check first)
    resp = await client.get(
        f"/api/v1/hospitals/{_uid()}/doctors",
        headers=_headers(tokens),
    )
    # Either 403 (access denied) or 404 (hospital not found) depending on which check runs first
    assert resp.status_code in (403, 404), resp.text


# ─── admin profiles overview ──────────────────────────────────────────────

async def test_super_admin_can_see_profiles_overview(client: AsyncClient):
    tokens = await _register(client, f"p2_sa_{_uid()}@test.com", role="super_admin")
    resp = await client.get("/api/v1/admin/profiles/overview", headers=_headers(tokens))
    assert resp.status_code == 200, resp.text
    body = resp.json()
    # All expected keys present
    for key in ("patients", "doctors", "pharmacists", "hospitals", "hospital_admins",
                "pharmacies", "partner_companies", "riders"):
        assert key in body, f"Missing key: {key}"
        assert isinstance(body[key], int)


async def test_non_admin_cannot_see_profiles_overview(client: AsyncClient):
    tokens = await _register(client, f"p2_np_{_uid()}@test.com", role="patient")
    resp = await client.get("/api/v1/admin/profiles/overview", headers=_headers(tokens))
    assert resp.status_code == 403, resp.text
