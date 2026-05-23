import pytest
from httpx import AsyncClient

from tests.conftest import unique_email

pytestmark = pytest.mark.anyio


async def _make_patient(client, email=None):
    r = await client.post("/api/v1/auth/register", json={
        "email": email or unique_email("order_patient"), "password": "Patient@12345",
        "full_name": "Order Patient", "role": "patient"
    })
    return r.json()


async def _make_pharmacy_admin(client, email=None):
    r = await client.post("/api/v1/auth/register", json={
        "email": email or unique_email("order_pharma"), "password": "Pharmacy@12345",
        "full_name": "Pharma Admin", "role": "pharmacy_admin"
    })
    return r.json()


async def test_create_order(client: AsyncClient):
    patient_tokens = await _make_patient(client)
    pharma_tokens = await _make_pharmacy_admin(client)

    patient_headers = {"Authorization": f"Bearer {patient_tokens['access_token']}"}

    # Create pharmacy
    pharma_headers = {"Authorization": f"Bearer {pharma_tokens['access_token']}"}
    pharma_resp = await client.post("/api/v1/pharmacies/", headers=pharma_headers, json={
        "name": "Test Pharmacy",
        "address": "KG 1 Ave",
        "district": "Gasabo",
    })
    pharmacy_id = pharma_resp.json()["id"]

    resp = await client.post("/api/v1/orders/", headers=patient_headers, json={
        "pharmacy_id": pharmacy_id,
        "delivery_method": "pickup",
        "items": [
            {
                "product_name": "Paracetamol 500mg",
                "quantity": 2,
                "unit_price": 500.0,
            }
        ],
    })
    assert resp.status_code == 201, resp.text
    order = resp.json()
    assert order["order_code"].startswith("FAR-")
    assert float(order["subtotal"]) == 1000.0


async def test_update_order_status(client: AsyncClient):
    patient_tokens = await _make_patient(client)
    pharma_tokens = await _make_pharmacy_admin(client)
    patient_headers = {"Authorization": f"Bearer {patient_tokens['access_token']}"}
    pharma_headers = {"Authorization": f"Bearer {pharma_tokens['access_token']}"}

    pharma_resp = await client.post("/api/v1/pharmacies/", headers=pharma_headers, json={
        "name": "Test Pharmacy 2",
        "address": "KG 2", "district": "Gasabo",
    })
    pharmacy_id = pharma_resp.json()["id"]

    order_resp = await client.post("/api/v1/orders/", headers=patient_headers, json={
        "pharmacy_id": pharmacy_id, "delivery_method": "pickup",
        "items": [{"product_name": "Paracetamol", "quantity": 1, "unit_price": 500.0}],
    })
    order_id = order_resp.json()["id"]

    status_resp = await client.patch(
        f"/api/v1/orders/{order_id}/status",
        headers=pharma_headers,
        json={"order_status": "accepted"},
    )
    assert status_resp.status_code == 200
    assert status_resp.json()["order_status"] == "accepted"
