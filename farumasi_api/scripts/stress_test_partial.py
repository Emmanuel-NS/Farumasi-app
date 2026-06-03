"""
End-to-end stress-test for the partial-selling pricing model.

Tests covered:
  1.  Product list loads (HTTP 200, data present)
  2.  Product fields: allows_partial_selling + packaging_class present
  3.  Create tablets_capsules product - succeeds
  4.  Create tablets product WITHOUT unit name - rejected (422)
  5.  Pharmacist fetches own pharmacy
  6.  Create listing WITH unit_price for tablets - succeeds (201)
  7.  Create listing WITHOUT unit_price for tablets - rejected (400/422)
  8.  Create liquid_bottle product - allows_partial_selling=False
  9.  Liquid listing WITHOUT unit_price - accepted
  10. Liquid listing WITH unit_price - rejected (400/422)
  11. Order in PACK mode - sell_mode=pack, unit_price=pack_price
  12. Order in PARTIAL mode - sell_mode=partial, unit_price=unit_price
  13. Order partial qty < min_partial_quantity - rejected
  14. unit_price_from present for partial products in product list
"""
import asyncio
import sys

import httpx

BASE = "http://localhost:8000/api/v1"

PASS = "PASS"
FAIL = "FAIL"
failures = 0


def ph(label: str, ok: bool, detail: str = "") -> bool:
    global failures
    status = f"[{PASS}]" if ok else f"[{FAIL}]"
    print(f"  {status} {label}" + (f" -- {detail}" if detail else ""))
    if not ok:
        failures += 1
    return ok


async def get_token(client: httpx.AsyncClient, email: str, password: str) -> str:
    r = await client.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200, f"Login failed for {email}: {r.text}"
    return r.json()["access_token"]


async def run_tests():
    async with httpx.AsyncClient(timeout=30) as c:

        # ---------- Auth ----------
        print("\n[Auth]")
        admin_tok = await get_token(c, "admin@farumasi.com", "Admin@12345")
        ph("Admin login", True)
        pharma_tok = await get_token(c, "pharmacist3@farumasi.com", "Pharmacist@12345")
        ph("Pharmacist3 login (linked to Remera Medicare Pharmacy)", True)
        patient_tok = await get_token(c, "patient@farumasi.com", "Patient@12345")
        ph("Patient login", True)
        AH = {"Authorization": f"Bearer {admin_tok}"}
        PH = {"Authorization": f"Bearer {pharma_tok}"}
        PAH = {"Authorization": f"Bearer {patient_tok}"}

        # ---------- Test 1: products list ----------
        print("\n[Test 1] Products list")
        r = await c.get(f"{BASE}/products/", params={"limit": 5, "only_with_listings": "true"})
        ph("GET /products/ returns 200", r.status_code == 200, f"HTTP {r.status_code}")
        ph("Products list has items", r.json().get("total", 0) > 0, f"total={r.json().get('total')}")

        # ---------- Test 2: packaging fields in response ----------
        print("\n[Test 2] Packaging fields in product response")
        prods = r.json().get("items", [])
        ph("'allows_partial_selling' present in all products",
           all("allows_partial_selling" in p for p in prods))
        ph("'packaging_class' present in all products",
           all("packaging_class" in p for p in prods))

        # ---------- Test 3: create product - tablets_capsules (partial allowed) ----------
        print("\n[Test 3] Create tablets_capsules product")
        prod_data = {
            "name": "ST Amoxicillin 500mg Capsules",
            "generic_name": "Amoxicillin",
            "category": "Antibiotics",
            "product_type": "medicine",
            "dosage_form": "Capsule",
            "strength": "500mg",
            "prescription_required": False,
            "packaging_class": "tablets_capsules",
            "units_per_pack": 28,
            "min_partial_quantity": 4,
            "partial_unit_name": "capsule",
        }
        r = await c.post(f"{BASE}/products/", json=prod_data, headers=AH)
        ok3 = ph("Create tablets product (admin)", r.status_code == 201, r.text[:120] if r.status_code != 201 else "")
        tablet_prod_id = r.json().get("id") if ok3 else None

        if tablet_prod_id:
            r2 = await c.get(f"{BASE}/products/{tablet_prod_id}")
            ph("allows_partial_selling=True for tablets", r2.json().get("allows_partial_selling") is True,
               str(r2.json().get("allows_partial_selling")))

        # ---------- Test 4: tablets without partial_unit_name rejected ----------
        print("\n[Test 4] Validation: tablets without unit name rejected")
        bad_prod = {k: v for k, v in prod_data.items() if k != "partial_unit_name"}
        bad_prod["name"] = "ST Bad Tablets No UnitName"
        r = await c.post(f"{BASE}/products/", json=bad_prod, headers=AH)
        ph("tablets missing unit_name => 422", r.status_code in (400, 422),
           f"HTTP {r.status_code}: {r.text[:80]}")

        # ---------- Test 5: pharmacist fetches own pharmacy ----------
        print("\n[Test 5] Pharmacist fetches own pharmacy")
        r = await c.get(f"{BASE}/pharmacies/me", headers=PH)
        ok5 = ph("GET /pharmacies/me => 200", r.status_code == 200, r.text[:80] if r.status_code != 200 else r.json().get("name", ""))
        pharmacy_id = r.json().get("id") if ok5 else None

        if not pharmacy_id:
            print("  [SKIP] Cannot proceed with listing/order tests - no pharmacy")
        else:
            # ---------- Test 6: create listing WITH unit_price for partial product ----------
            print("\n[Test 6] Create listing WITH unit_price for tablets")
            if not tablet_prod_id:
                print("  [SKIP] No tablet product created in Test 3")
                listing_id = None
            else:
                listing_data = {
                    "product_id": tablet_prod_id,
                    "price": 5600,
                    "unit_price": 250,
                    "stock_quantity": 200,
                    "availability_status": "available",
                }
                r = await c.post(f"{BASE}/pharmacies/me/listings", json=listing_data, headers=PH)
                ok6 = ph("Create tablets listing with unit_price", r.status_code == 201,
                         r.text[:120] if r.status_code != 201 else f"listing_id={r.json().get('id')}")
                listing_id = r.json().get("id") if ok6 else None

                # ---------- Test 7: listing WITHOUT unit_price for partial product rejected ----------
                print("\n[Test 7] Validation: tablets listing without unit_price rejected")
                bad_listing = {k: v for k, v in listing_data.items() if k != "unit_price"}
                r = await c.post(f"{BASE}/pharmacies/me/listings", json=bad_listing, headers=PH)
                ph("tablets listing missing unit_price => 400/422", r.status_code in (400, 422),
                   f"HTTP {r.status_code}: {r.text[:80]}")

                # ---------- Test 8 & 9: liquid_bottle product (non-partial) ----------
                print("\n[Test 8] Create liquid_bottle product and verify non-partial")
                prod_liquid = {
                    "name": "ST Cough Syrup 200ml",
                    "category": "Respiratory",
                    "product_type": "medicine",
                    "dosage_form": "Syrup",
                    "prescription_required": False,
                    "packaging_class": "liquid_bottle",
                }
                r = await c.post(f"{BASE}/products/", json=prod_liquid, headers=AH)
                ok8 = ph("Create liquid_bottle product", r.status_code == 201,
                         r.text[:80] if r.status_code != 201 else "")
                liquid_id = r.json().get("id") if ok8 else None

                if liquid_id:
                    r2 = await c.get(f"{BASE}/products/{liquid_id}")
                    ph("allows_partial_selling=False for liquid", r2.json().get("allows_partial_selling") is False)

                    print("\n[Test 9] Liquid listing: without unit_price accepted; with unit_price rejected")
                    r3 = await c.post(f"{BASE}/pharmacies/me/listings", json={
                        "product_id": liquid_id,
                        "price": 4500,
                        "stock_quantity": 50,
                        "availability_status": "available",
                    }, headers=PH)
                    ph("Liquid listing without unit_price => 201", r3.status_code == 201,
                       r3.text[:80] if r3.status_code != 201 else "")

                    r4 = await c.post(f"{BASE}/pharmacies/me/listings", json={
                        "product_id": liquid_id,
                        "price": 4500,
                        "unit_price": 200,
                        "stock_quantity": 30,
                        "availability_status": "available",
                    }, headers=PH)
                    ph("Liquid listing with unit_price => 400/422", r4.status_code in (400, 422),
                       f"HTTP {r4.status_code}")

                # ---------- Tests 10-13: ordering ----------
                if listing_id:
                    print("\n[Test 10] Order in PACK mode")
                    r = await c.post(f"{BASE}/patients/me/orders", json={
                        "delivery_method": "pickup",
                        "items": [{"product_listing_id": listing_id, "quantity": 2, "sell_mode": "pack"}],
                    }, headers=PAH)
                    ok10 = ph("Place order pack x2 => 201", r.status_code == 201,
                              r.text[:120] if r.status_code != 201 else f"order_id={r.json().get('id')}")
                    if ok10:
                        item = r.json()["items"][0]
                        ph("  sell_mode=pack in response", item.get("sell_mode") == "pack",
                           str(item.get("sell_mode")))
                        ph("  unit_price=5600 (pack price)", abs(float(item.get("unit_price", 0)) - 5600) < 1,
                           str(item.get("unit_price")))

                    print("\n[Test 11] Order in PARTIAL mode")
                    r = await c.post(f"{BASE}/patients/me/orders", json={
                        "delivery_method": "pickup",
                        "items": [{"product_listing_id": listing_id, "quantity": 8, "sell_mode": "partial"}],
                    }, headers=PAH)
                    ok11 = ph("Place order partial x8 capsules => 201", r.status_code == 201,
                              r.text[:120] if r.status_code != 201 else "")
                    if ok11:
                        item = r.json()["items"][0]
                        ph("  sell_mode=partial in response", item.get("sell_mode") == "partial")
                        ph("  unit_price=250 (per-unit price)", abs(float(item.get("unit_price", 0)) - 250) < 1,
                           str(item.get("unit_price")))

                    print("\n[Test 12] Order partial qty < min_partial_quantity=4 rejected")
                    r = await c.post(f"{BASE}/patients/me/orders", json={
                        "delivery_method": "pickup",
                        "items": [{"product_listing_id": listing_id, "quantity": 2, "sell_mode": "partial"}],
                    }, headers=PAH)
                    ph("qty=2 < min=4 => 400/422", r.status_code in (400, 422),
                       f"HTTP {r.status_code}: {str(r.json().get('detail',''))[:80]}")

                    print("\n[Test 13] Partial order with sell_mode omitted defaults to pack")
                    r = await c.post(f"{BASE}/patients/me/orders", json={
                        "delivery_method": "pickup",
                        "items": [{"product_listing_id": listing_id, "quantity": 1}],
                    }, headers=PAH)
                    ok13 = ph("Order without sell_mode => 201", r.status_code == 201,
                              r.text[:80] if r.status_code != 201 else "")
                    if ok13:
                        item = r.json()["items"][0]
                        ph("  defaults to sell_mode=pack", item.get("sell_mode") == "pack",
                           str(item.get("sell_mode")))

        # ---------- Test 14: unit_price_from in product list ----------
        print("\n[Test 14] unit_price_from in product list for partial products")
        r = await c.get(f"{BASE}/products/", params={"limit": 50, "only_with_listings": "true"})
        prods = r.json().get("items", [])
        partial_prods = [p for p in prods if p.get("allows_partial_selling")]
        if partial_prods:
            sample = next((p for p in partial_prods if p.get("unit_price_from") is not None), None)
            ph("Partial product has unit_price_from populated",
               sample is not None,
               f"{sample['name']} unit_price_from={sample.get('unit_price_from')}" if sample else "none found")
        else:
            ph("No listed partial products yet (OK if freshly seeded)", True, "unit_price_from N/A")

    # Summary
    print(f"\n{'='*50}")
    if failures == 0:
        print("  ALL TESTS PASSED")
    else:
        print(f"  {failures} TEST(S) FAILED")
    print(f"{'='*50}\n")
    return failures


if __name__ == "__main__":
    code = asyncio.run(run_tests())
    sys.exit(code)
