import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


async def test_register_and_login(client: AsyncClient):
    # Register
    resp = await client.post("/api/v1/auth/register", json={
        "email": "test_auth@farumasi.com",
        "password": "Test@12345",
        "full_name": "Test User",
        "role": "patient",
    })
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert "access_token" in data
    assert "refresh_token" in data

    # Login
    login_resp = await client.post("/api/v1/auth/login", json={
        "email": "test_auth@farumasi.com",
        "password": "Test@12345",
    })
    assert login_resp.status_code == 200
    tokens = login_resp.json()
    assert tokens["access_token"]

    # Refresh
    refresh_resp = await client.post("/api/v1/auth/refresh", json={
        "refresh_token": tokens["refresh_token"]
    })
    assert refresh_resp.status_code == 200
    assert refresh_resp.json()["access_token"]


async def test_register_duplicate_email(client: AsyncClient):
    payload = {
        "email": "dup@farumasi.com",
        "password": "Test@12345",
        "full_name": "A B",
        "role": "patient",
    }
    resp1 = await client.post("/api/v1/auth/register", json=payload)
    assert resp1.status_code == 201

    resp2 = await client.post("/api/v1/auth/register", json=payload)
    assert resp2.status_code == 409


async def test_login_wrong_password(client: AsyncClient):
    await client.post("/api/v1/auth/register", json={
        "email": "wrongpass@farumasi.com",
        "password": "Correct@12345",
        "full_name": "X Y",
        "role": "patient",
    })
    resp = await client.post("/api/v1/auth/login", json={
        "email": "wrongpass@farumasi.com",
        "password": "Wrong@99999",
    })
    assert resp.status_code == 401
