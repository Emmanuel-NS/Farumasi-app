import pytest
from httpx import AsyncClient

from tests.bootstrap import register_for_test

pytestmark = pytest.mark.anyio


async def test_revenue_summary_empty(client: AsyncClient):
    pharma = await register_for_test(
        client,
        client._test_db,
        role="pharmacy_admin",
        email="rev_pharma@farumasi.com",
        password="Pharmacy@12345",
        full_name="Rev Pharma",
    )
    headers = {"Authorization": f"Bearer {pharma['access_token']}"}

    resp = await client.get("/api/v1/revenue/summary", headers=headers)
    assert resp.status_code == 200
    data = resp.json()
    assert data["available_balance"] == 0.0
    assert data["total_gross"] == 0.0


async def test_withdrawal_insufficient_balance(client: AsyncClient):
    pharma = await register_for_test(
        client,
        client._test_db,
        role="pharmacy_admin",
        email="rev_pharma2@farumasi.com",
        password="Pharmacy@12345",
        full_name="Rev2 Pharma",
    )
    headers = {"Authorization": f"Bearer {pharma['access_token']}"}

    resp = await client.post("/api/v1/withdrawals/", headers=headers, json={
        "amount": 999999,
        "payout_method": "mobile_money",
        "payout_details": {"account": "+250788000000", "account_name": "Rev2 Pharma"},
    })
    # pharmacy_admin with no associated pharmacy gets a validation error (400).
    # The granular "insufficient balance" path is covered by the Phase 8 suite.
    assert resp.status_code == 400
