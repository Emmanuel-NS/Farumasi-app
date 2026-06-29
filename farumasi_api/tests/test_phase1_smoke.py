"""
Phase-1 smoke tests for FARUMASI API.

Covers the stable contract:
  - POST /api/v1/auth/register
  - POST /api/v1/auth/login
  - GET  /api/v1/users/me                  (current authenticated user)
  - Protected route accepts correct role
  - Protected route returns 403 for wrong role

Run with:
    pytest tests/test_phase1_smoke.py -v
"""
from __future__ import annotations

import pytest
from httpx import AsyncClient

pytestmark = pytest.mark.anyio


from tests.bootstrap import register_for_test


async def _register(client: AsyncClient, email: str, role: str = "patient",
                    password: str = "Test@12345", full_name: str = "Phase One"):
    return await register_for_test(
        client,
        client._test_db,
        role=role,
        email=email,
        password=password,
        full_name=full_name,
    )


async def test_phase1_register_returns_tokens(client: AsyncClient):
    tokens = await _register(client, "phase1_reg@farumasi.com")
    assert tokens["access_token"]
    assert tokens["refresh_token"]
    assert tokens.get("token_type", "bearer").lower() == "bearer"


async def test_phase1_login_returns_tokens(client: AsyncClient):
    await _register(client, "phase1_login@farumasi.com")
    resp = await client.post("/api/v1/auth/login", json={
        "email": "phase1_login@farumasi.com",
        "password": "Test@12345",
        "role": "patient",
    })
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["access_token"]
    assert body["refresh_token"]


async def test_phase1_me_returns_current_user(client: AsyncClient):
    tokens = await _register(client, "phase1_me@farumasi.com", full_name="Me User")
    resp = await client.get(
        "/api/v1/users/me",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["email"] == "phase1_me@farumasi.com"
    assert body["role"] == "patient"
    # never leak password hash
    assert "password_hash" not in body
    assert "password" not in body


async def test_phase1_me_unauthorized_without_token(client: AsyncClient):
    resp = await client.get("/api/v1/users/me")
    assert resp.status_code == 401, resp.text


async def test_phase1_protected_route_wrong_role_returns_403(client: AsyncClient):
    """A patient must NOT be able to hit a finance-only endpoint."""
    tokens = await _register(client, "phase1_patient@farumasi.com", role="patient")
    resp = await client.get(
        "/api/v1/withdrawals/",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert resp.status_code == 403, resp.text


async def test_phase1_protected_route_correct_role_allowed(client: AsyncClient):
    """A finance_admin reaches the finance endpoint (200 OK, even if empty list)."""
    tokens = await _register(
        client,
        "phase1_finance@farumasi.com",
        role="finance_admin",
        full_name="Finance Admin",
    )
    resp = await client.get(
        "/api/v1/withdrawals/",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
    )
    assert resp.status_code == 200, resp.text
    assert isinstance(resp.json(), list)
