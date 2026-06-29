import pytest
from httpx import AsyncClient

from tests.bootstrap import register_for_test

pytestmark = pytest.mark.anyio


async def _register_doctor(client: AsyncClient) -> dict:
    return await register_for_test(
        client,
        client._test_db,
        role="doctor",
        email="doctor_test@farumasi.com",
        password="Doctor@12345",
        full_name="Dr Test",
    )


async def _register_patient(client: AsyncClient, email: str = "patient_rx@farumasi.com") -> dict:
    return await register_for_test(
        client,
        client._test_db,
        role="patient",
        email=email,
        password="Patient@12345",
        full_name="Pat Rx",
    )


async def test_create_prescription(client: AsyncClient):
    doc_tokens = await _register_doctor(client)
    pat_tokens = await _register_patient(client)

    # Get patient profile
    headers_patient = {"Authorization": f"Bearer {pat_tokens['access_token']}"}
    me = (await client.get("/api/v1/patients/me", headers=headers_patient)).json()
    patient_id = me["id"]

    headers_doc = {"Authorization": f"Bearer {doc_tokens['access_token']}"}
    resp = await client.post("/api/v1/prescriptions/", headers=headers_doc, json={
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
                "substitution_allowed": False,
            }
        ],
    })
    assert resp.status_code == 201, resp.text
    rx = resp.json()
    assert rx["id"]
    assert len(rx["items"]) == 1


async def test_get_prescription(client: AsyncClient):
    doc_tokens = await _register_doctor(client)
    pat_tokens = await _register_patient(client, "patient_rx2@farumasi.com")

    headers_patient = {"Authorization": f"Bearer {pat_tokens['access_token']}"}
    me = (await client.get("/api/v1/patients/me", headers=headers_patient)).json()
    patient_id = me["id"]

    headers_doc = {"Authorization": f"Bearer {doc_tokens['access_token']}"}
    create_resp = await client.post("/api/v1/prescriptions/", headers=headers_doc, json={
        "patient_id": patient_id,
        "prescription_type": "doctor_created",
        "items": [{"medicine_name": "Paracetamol", "dosage": "500mg", "frequency": "2x daily", "duration": "3 days", "quantity": 6}],
    })
    rx_id = create_resp.json()["id"]

    get_resp = await client.get(f"/api/v1/prescriptions/{rx_id}", headers=headers_doc)
    assert get_resp.status_code == 200
    assert get_resp.json()["id"] == rx_id
