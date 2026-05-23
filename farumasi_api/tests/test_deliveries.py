import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


async def _setup_delivery_scenario(client: AsyncClient):
    """Create patient, pharmacy, order, and return tokens + ids."""
    # Patient
    pat = (await client.post("/api/v1/auth/register", json={
        "email": "delivery_patient@farumasi.com", "password": "Patient@12345",
        "full_name": "Del Patient", "role": "patient"
    })).json()
    # Pharmacy admin
    pharma = (await client.post("/api/v1/auth/register", json={
        "email": "delivery_pharma@farumasi.com", "password": "Pharmacy@12345",
        "full_name": "Del Pharma", "role": "pharmacy_admin"
    })).json()
    # Rider
    rider = (await client.post("/api/v1/auth/register", json={
        "email": "delivery_rider@farumasi.com", "password": "Rider@12345",
        "full_name": "Del Rider", "role": "rider"
    })).json()

    pharma_h = {"Authorization": f"Bearer {pharma['access_token']}"}
    pat_h = {"Authorization": f"Bearer {pat['access_token']}"}
    rider_h = {"Authorization": f"Bearer {rider['access_token']}"}

    pharmacy_id = (await client.post("/api/v1/pharmacies/", headers=pharma_h, json={
        "name": "Delivery Pharmacy",
        "address": "KG 3", "district": "Gasabo",
    })).json()["id"]

    order = (await client.post("/api/v1/orders/", headers=pat_h, json={
        "pharmacy_id": pharmacy_id,
        "delivery_method": "delivery",
        "delivery_address": "KG 11 Ave, Kigali",
        "delivery_latitude": "-1.950",
        "delivery_longitude": "30.060",
        "items": [{"product_name": "Amoxicillin", "quantity": 1, "unit_price": 1500.0}],
    })).json()

    return pat_h, pharma_h, rider_h, order, pharmacy_id


async def test_full_delivery_qr_flow(client: AsyncClient):
    pat_h, pharma_h, rider_h, order, _ = await _setup_delivery_scenario(client)
    order_id = order["id"]

    # Get delivery
    deliveries_resp = await client.get(f"/api/v1/orders/{order_id}", headers=pat_h)
    assert deliveries_resp.status_code == 200

    # Rider me
    rider_profile = (await client.get("/api/v1/riders/me", headers=rider_h)).json()
    rider_id = rider_profile["id"]

    # Assign delivery
    assign_resp = await client.post("/api/v1/deliveries/assign", headers=pharma_h, json={
        "order_id": order_id,
        "rider_id": rider_id,
        "delivery_fee": 1500.0,
        "rider_earning": 1200.0,
    })
    assert assign_resp.status_code == 200, assign_resp.text
    delivery = assign_resp.json()
    delivery_id = delivery["id"]
    qr_token = delivery["qr_token"]
    assert qr_token

    # QR Confirm
    confirm_resp = await client.post(
        f"/api/v1/deliveries/{delivery_id}/confirm-qr",
        headers=rider_h,
        json={"qr_token": qr_token},
    )
    assert confirm_resp.status_code == 200
    assert confirm_resp.json()["status"] == "delivered"
