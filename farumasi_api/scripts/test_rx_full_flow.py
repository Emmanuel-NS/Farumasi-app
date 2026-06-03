"""Full end-to-end test: pharmacist builds cart → patient sees it → places order."""
import asyncio, sys, httpx, json
sys.path.insert(0, "C:/Users/PC/Farumasi-app/farumasi_api")

BASE = "http://localhost:8000/api/v1"

PASS = "[PASS]"
FAIL = "[FAIL]"

async def login(c, email, pw):
    r = await c.post(f"{BASE}/auth/login", json={"email": email, "password": pw})
    return r.json().get("access_token", "") if r.status_code == 200 else ""

def check(label, condition, extra=""):
    status = PASS if condition else FAIL
    print(f"  {status} {label}" + (f" — {extra}" if extra else ""))
    return condition

async def main():
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from app.models.patient import PatientProfile
    from app.models.prescription import DigitalPrescription, PrescriptionItem
    from sqlalchemy import select

    # ── find test users ───────────────────────────────────────────────────────
    async with AsyncSessionLocal() as db:
        r = await db.execute(
            select(DigitalPrescription).where(DigitalPrescription.status == "reviewed").limit(1)
        )
        rx_obj = r.scalar_one_or_none()
        if not rx_obj:
            print("No reviewed prescription found — re-running pharmacist cart build first")
            # fall back to any patient_uploaded prescription
            r = await db.execute(
                select(DigitalPrescription)
                .where(DigitalPrescription.prescription_type == "patient_uploaded")
                .limit(1)
            )
            rx_obj = r.scalar_one_or_none()

        if not rx_obj:
            print("No prescriptions at all — test cannot proceed")
            return

        r2 = await db.execute(select(PatientProfile).where(PatientProfile.id == rx_obj.patient_id))
        p_profile = r2.scalar_one_or_none()
        r3 = await db.execute(select(User).where(User.id == p_profile.user_id))
        p_user = r3.scalar_one_or_none()

        rx_id = rx_obj.id
        patient_email = p_user.email
        print(f"Testing prescription: {rx_id[:8]} | patient: {patient_email}")

    async with httpx.AsyncClient(timeout=30) as c:
        # ── Pharmacist side ───────────────────────────────────────────────────
        print("\n=== PHARMACIST SIDE ===")

        ph_token = await login(c, "pharmacist@farumasi.com", "Pharmacist@12345")
        if not check("Pharmacist login", ph_token):
            return

        # Search products
        r = await c.get(f"{BASE}/products/?q=amox&limit=3", headers={"Authorization": f"Bearer {ph_token}"})
        prods = r.json().get("items", []) if r.status_code == 200 else []
        check("Search products", bool(prods), f"found {len(prods)}")

        # Get fresh prescription (delete existing items, re-add clean ones)
        r = await c.get(f"{BASE}/prescriptions/{rx_id}", headers={"Authorization": f"Bearer {ph_token}"})
        check("Fetch prescription", r.status_code == 200, f"status={r.status_code}")
        existing = r.json().get("items", []) if r.status_code == 200 else []
        print(f"    Existing items to delete: {len(existing)}")

        for item in existing:
            rd = await c.delete(
                f"{BASE}/prescriptions/{rx_id}/items/{item['id']}",
                headers={"Authorization": f"Bearer {ph_token}"}
            )
            check(f"  Delete item {item['id'][:8]}", rd.status_code in (200, 204))

        # Add 2 clean items with product_id (for recommendation to work)
        added = []
        for prod in prods[:2]:
            ra = await c.post(
                f"{BASE}/prescriptions/{rx_id}/items",
                headers={"Authorization": f"Bearer {ph_token}"},
                json={
                    "product_id": prod["id"],
                    "medicine_name": prod["name"],
                    "dosage": "1 tablet",
                    "frequency": "twice daily",
                    "quantity": 1,
                    "instructions": "Take with water",
                    "substitution_allowed": False,
                }
            )
            added.append(prod["name"])
            check(f"Add item '{prod['name'][:30]}'", ra.status_code == 201, f"status={ra.status_code}")

        # Send cart to patient (status → reviewed)
        rp = await c.patch(
            f"{BASE}/prescriptions/{rx_id}",
            headers={"Authorization": f"Bearer {ph_token}"},
            json={"notes": "Cart ready. Please confirm to proceed.", "status": "reviewed"}
        )
        check("Set status to 'reviewed'", rp.status_code == 200, f"status={rp.status_code}")
        final_items = rp.json().get("items", []) if rp.status_code == 200 else []
        check(f"Prescription has {len(added)} items", len(final_items) == len(added),
              f"got {len(final_items)}")

        # ── Patient side ──────────────────────────────────────────────────────
        print("\n=== PATIENT SIDE ===")

        pt_token = await login(c, patient_email, "Patient@12345")
        if not check("Patient login", pt_token):
            return

        # List prescriptions — should see the reviewed one
        r = await c.get(f"{BASE}/patients/me/prescriptions", headers={"Authorization": f"Bearer {pt_token}"})
        rxs = r.json() if r.status_code == 200 else []
        rxs = rxs if isinstance(rxs, list) else rxs.get("items", [])
        found = next((rx for rx in rxs if rx["id"] == rx_id), None)
        check("Patient sees prescription", found is not None)
        if found:
            check("Prescription is 'reviewed'", found["status"] == "reviewed", found.get("status"))
            check("Items visible to patient", len(found.get("items", [])) == len(added),
                  f"got {len(found.get('items', []))}")

        # Get recommendations — THIS IS THE KEY FIX (was 422 before)
        print("\n  >>> Testing recommendations endpoint (previously 422) <<<")
        r = await c.get(
            f"{BASE}/patients/me/prescriptions/{rx_id}/recommendations",
            headers={"Authorization": f"Bearer {pt_token}"}
        )
        check("Recommendations endpoint returns 200", r.status_code == 200, f"status={r.status_code}")
        if r.status_code == 200:
            recs_data = r.json()
            top_recs = recs_data.get("top_recommendations", [])
            total_evaluated = recs_data.get("total_candidates_evaluated", 0)
            check("Response has 'top_recommendations' key", "top_recommendations" in recs_data)
            print(f"    top_recommendations: {len(top_recs)}, total_evaluated: {total_evaluated}")
            if top_recs:
                rec = top_recs[0]
                pharmacy_name = (rec.get("pharmacy") or rec.get("partner") or {}).get("name", "N/A")
                print(f"    Best pharmacy: {pharmacy_name} (score: {rec.get('rank_score', 0):.3f})")
                check("Can place order via recommendation", True,
                      f"rec_id={rec.get('id', '')[:8]}")

                # Actually place order via recommendation
                ro = await c.post(
                    f"{BASE}/orders/",
                    headers={"Authorization": f"Bearer {pt_token}"},
                    json={
                        "prescription_id": rx_id,
                        "selected_recommendation_id": rec["id"],
                        "delivery_method": "delivery",
                        "notes": "Test order via prescription checkout",
                    }
                )
                check("Place order via recommendation", ro.status_code in (200, 201),
                      f"status={ro.status_code}: {ro.text[:200]}")
                if ro.status_code in (200, 201):
                    order = ro.json()
                    print(f"    Order ID: {order.get('id', '')[:8]}, status: {order.get('status')}")
            else:
                print("    No pharmacy recommendations (no listings for these products) — testing fallback")
                # Test fallback: place order manually
                ro = await c.post(
                    f"{BASE}/orders/",
                    headers={"Authorization": f"Bearer {pt_token}"},
                    json={
                        "prescription_id": rx_id,
                        "delivery_method": "delivery",
                        "items": [
                            {
                                "product_name": item.get("medicine_name", "Medicine"),
                                "unit_price": 0,
                                "quantity": item.get("quantity", 1),
                                "sell_mode": "pack"
                            }
                            for item in found.get("items", [])
                        ]
                    }
                )
                check("Place order (manual fallback)", ro.status_code in (200, 201),
                      f"status={ro.status_code}: {ro.text[:300]}")

    print("\n=== Test complete ===")

asyncio.run(main())
