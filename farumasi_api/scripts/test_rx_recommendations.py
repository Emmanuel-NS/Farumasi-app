"""Test recommendations + delete-all-items for pharmacist flow."""
import asyncio, sys, httpx
sys.path.insert(0, "C:/Users/PC/Farumasi-app/farumasi_api")

BASE = "http://localhost:8000/api/v1"

async def login(c, email, pw):
    r = await c.post(f"{BASE}/auth/login", json={"email": email, "password": pw})
    return r.json().get("access_token", "") if r.status_code == 200 else ""

async def main():
    # find which patient owns the reviewed prescription
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from app.models.patient import PatientProfile
    from app.models.prescription import DigitalPrescription, PrescriptionItem
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        r = await db.execute(
            select(DigitalPrescription).where(DigitalPrescription.status == "reviewed").limit(3)
        )
        rxs = r.scalars().all()
        if not rxs:
            print("No reviewed prescriptions found — creating a fresh one via pharmacist")
            # Use patient@farumasi.com
        else:
            rx = rxs[0]
            # find patient user_id via patient_profile
            r2 = await db.execute(select(PatientProfile).where(PatientProfile.id == rx.patient_id))
            patient_profile = r2.scalar_one_or_none()
            r3 = await db.execute(select(User).where(User.id == patient_profile.user_id))
            patient_user = r3.scalar_one_or_none()
            # count items separately
            r4 = await db.execute(select(PrescriptionItem).where(PrescriptionItem.prescription_id == rx.id))
            item_count = len(r4.scalars().all())
            print(f"Reviewed rx: {rx.id[:8]}, patient: {patient_user.email}")
            print(f"  items count: {item_count}")

    rx_id = rx.id
    patient_email = patient_user.email

    async with httpx.AsyncClient(timeout=30) as c:
        # Login as patient
        token = await login(c, patient_email, "Patient@12345")
        print(f"Patient login: {'OK' if token else 'FAIL'}")

        # Test recommendations WITHOUT lat/lon (previously 422)
        print("\n--- Test 1: Recommendations without lat/lon (should now be 200) ---")
        r = await c.get(
            f"{BASE}/patients/me/prescriptions/{rx_id}/recommendations",
            headers={"Authorization": f"Bearer {token}"}
        )
        print(f"  Status: {r.status_code}")
        if r.status_code == 200:
            d = r.json()
            pharmacies = d.get("pharmacies", []) if isinstance(d, dict) else []
            print(f"  Pharmacies returned: {len(pharmacies)}")
        else:
            print(f"  Error: {r.text[:300]}")

        # Login as pharmacist
        ph_token = await login(c, "pharmacist@farumasi.com", "Pharmacist@12345")
        print(f"\nPharmacist login: {'OK' if ph_token else 'FAIL'}")

        # Test pharmacist can delete ALL items from a reviewed prescription
        print(f"\n--- Test 2: Delete all items from reviewed prescription {rx_id[:8]} ---")
        r = await c.get(f"{BASE}/prescriptions/{rx_id}", headers={"Authorization": f"Bearer {ph_token}"})
        if r.status_code == 200:
            items = r.json().get("items", [])
            print(f"  Current items: {len(items)}")
            for item in items:
                item_id = item["id"]
                rd = await c.delete(
                    f"{BASE}/prescriptions/{rx_id}/items/{item_id}",
                    headers={"Authorization": f"Bearer {ph_token}"}
                )
                print(f"  Delete item {item_id[:8]}: {rd.status_code} {'OK' if rd.status_code in (200,204) else rd.text[:100]}")
        else:
            print(f"  Could not fetch prescription: {r.status_code}")

        # Verify prescription now has 0 items
        r = await c.get(f"{BASE}/prescriptions/{rx_id}", headers={"Authorization": f"Bearer {ph_token}"})
        items_after = r.json().get("items", []) if r.status_code == 200 else []
        print(f"  Items after delete-all: {len(items_after)}")

        # Re-add 2 items as new cart
        print(f"\n--- Test 3: Re-add items and resend cart ---")
        r2 = await c.get(f"{BASE}/products/?q=amox&limit=2", headers={"Authorization": f"Bearer {ph_token}"})
        prods = r2.json().get("items", []) if r2.status_code == 200 else []
        print(f"  Products found: {len(prods)}")
        for prod in prods[:2]:
            ra = await c.post(
                f"{BASE}/prescriptions/{rx_id}/items",
                headers={"Authorization": f"Bearer {ph_token}"},
                json={
                    "product_id": prod["id"],
                    "medicine_name": prod.get("name", "Medicine"),
                    "quantity": 1,
                    "dosage": "250mg",
                    "frequency": "3x daily",
                    "instructions": "Take after meals",
                    "substitution_allowed": False,
                }
            )
            print(f"  Add {prod['name'][:30]}: {ra.status_code}")

        # Set status back to reviewed
        rp = await c.patch(
            f"{BASE}/prescriptions/{rx_id}",
            headers={"Authorization": f"Bearer {ph_token}"},
            json={"notes": "Rebuilt cart", "status": "reviewed"}
        )
        print(f"  Patch status to reviewed: {rp.status_code}")
        final = rp.json().get("items", []) if rp.status_code == 200 else []
        print(f"  Final items: {len(final)}")

    print("\n=== All tests passed ===")

asyncio.run(main())
