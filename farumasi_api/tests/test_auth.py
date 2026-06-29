import pytest
from httpx import AsyncClient

from tests.bootstrap import register_via_api

pytestmark = pytest.mark.anyio


async def test_register_and_login(client: AsyncClient, db):
    tokens = await register_via_api(
        client,
        db,
        email="test_auth@farumasi.com",
        password="Test@12345",
        full_name="Test User",
    )
    assert tokens["access_token"]
    assert tokens["refresh_token"]

    login_resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "test_auth@farumasi.com", "password": "Test@12345", "role": "patient"},
    )
    assert login_resp.status_code == 200
    login_tokens = login_resp.json()
    assert login_tokens["access_token"]

    refresh_resp = await client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": login_tokens["refresh_token"]},
    )
    assert refresh_resp.status_code == 200
    assert refresh_resp.json()["access_token"]


async def test_register_duplicate_email(client: AsyncClient, db):
    payload = {
        "email": "dup@farumasi.com",
        "password": "Test@12345",
        "full_name": "A B",
        "role": "patient",
    }
    resp1 = await client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    # Same email while still pending with a different password is rejected.
    resp2 = await client.post(
        "/api/v1/auth/register",
        json={**payload, "password": "Other@12345"},
    )
    assert resp2.status_code == 409


async def test_login_wrong_password(client: AsyncClient, db):
    await register_via_api(
        client,
        db,
        email="wrongpass@farumasi.com",
        password="Correct@12345",
        full_name="X Y",
    )
    resp = await client.post(
        "/api/v1/auth/login",
        json={"email": "wrongpass@farumasi.com", "password": "Wrong@99999", "role": "patient"},
    )
    assert resp.status_code == 401
