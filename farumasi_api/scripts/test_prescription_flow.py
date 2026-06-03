"""End-to-end test of the prescription ordering flow."""
import asyncio
import sys
import httpx

sys.path.insert(0, "C:/Users/PC/Farumasi-app/farumasi_api")

BASE = "http://localhost:8000/api/v1"

# ─── helpers ────────────────────────────────────────────────────────────────

async def login(client: httpx.AsyncClient, email: str, password: str) -> str:
    r = await client.post(f"{BASE}/auth/login", json={"email": email, "password": password})
    if r.status_code != 200:
        print(f"  LOGIN FAILED {r.status_code}: {r.text[:200]}")
        return ""
    return r.json().get("access_token", "")


async def find_users():
    from app.core.database import AsyncSessionLocal
    from app.models.user import User
    from app.models.prescription import DigitalPrescription
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        r = await db.execute(select(User).where(User.role == "patient").limit(3))
        patients = r.scalars().all()
        r2 = await db.execute(select(User).where(User.role == "pharmacist").limit(2))
        pharma = r2.scalars().all()
        r3 = await db.execute(select(DigitalPrescription).limit(5))
        rxs = r3.scalars().all()

        print(f"Patients: {[(p.email, p.id[:8]) for p in patients]}")
        print(f"Pharmacists: {[(p.email, p.id[:8]) for p in pharma]}")
        print(f"Prescriptions: {[(rx.id[:8], rx.status, rx.prescription_type) for rx in rxs]}")
        return patients, pharma, rxs


async def main():
    patients, pharma, rxs = await find_users()
    if not patients or not pharma:
        print("No test users found — cannot run test")
        return

    patient_email = patients[0].email
    pharmacist_email = pharma[0].email

    print(f"\n=== Testing with patient={patient_email}, pharmacist={pharmacist_email} ===\n")

    async with httpx.AsyncClient(timeout=30) as client:
        # ── Patient login ────────────────────────────────────────────────────
        print("[1] Patient login...")
        patient_token = await login(client, patient_email, "Patient@12345")
        if not patient_token:
            patient_token = await login(client, patient_email, "password123")
        if not patient_token:
            print("  SKIPPING patient steps — cannot authenticate")
        else:
            print(f"  OK, token acquired")

        # ── Patient: list prescriptions ──────────────────────────────────────
        if patient_token:
            print("[2] Patient: GET /patients/me/prescriptions ...")
            r = await client.get(
                f"{BASE}/patients/me/prescriptions",
                headers={"Authorization": f"Bearer {patient_token}"}
            )
            body = r.json() if r.status_code == 200 else {}
            items = body if isinstance(body, list) else body.get("items", [])
            print(f"  {r.status_code}: {len(items)} prescriptions")

            # find an active/reviewed prescription
            rx_id = None
            for rx in (items if isinstance(items, list) else []):
                if rx.get("status") in ("active", "reviewed", "under_review"):
                    rx_id = rx.get("id")
                    print(f"  Using prescription {rx_id[:8]}... status={rx.get('status')}")
                    break

            # ── Recommendations without lat/lon ──────────────────────────────
            if rx_id:
                print(f"[3] Recommendations (no lat/lon) for {rx_id[:8]}...")
                r = await client.get(
                    f"{BASE}/patients/me/prescriptions/{rx_id}/recommendations",
                    headers={"Authorization": f"Bearer {patient_token}"}
                )
                print(f"  {r.status_code}: {str(r.json())[:200]}")

                # With explicit Kigali coords
                print(f"[4] Recommendations (with Kigali coords) ...")
                r = await client.get(
                    f"{BASE}/patients/me/prescriptions/{rx_id}/recommendations?lat=-1.9441&lon=30.0619",
                    headers={"Authorization": f"Bearer {patient_token}"}
                )
                print(f"  {r.status_code}: {str(r.json())[:200]}")

        # ── Pharmacist login ─────────────────────────────────────────────────
        print("[5] Pharmacist login...")
        ph_token = await login(client, pharmacist_email, "Pharmacist@12345")
        if not ph_token:
            ph_token = await login(client, pharmacist_email, "password123")
        if not ph_token:
            print("  SKIPPING pharmacist steps — cannot authenticate")
        else:
            print(f"  OK, token acquired")

        # ── Pharmacist: list prescription requests ───────────────────────────
        if ph_token:
            print("[6] Pharmacist: GET prescriptions list ...")
            r = await client.get(
                f"{BASE}/prescriptions/?offset=0&limit=5",
                headers={"Authorization": f"Bearer {ph_token}"}
            )
            print(f"  {r.status_code}: {str(r.json())[:300]}")

            # find a patient_uploaded prescription to work with
            ph_body = r.json() if r.status_code == 200 else {}
            ph_rxs = ph_body if isinstance(ph_body, list) else ph_body.get("items", [])
            ph_rx_id = None
            for rx in (ph_rxs if isinstance(ph_rxs, list) else []):
                if rx.get("prescription_type") == "patient_uploaded":
                    ph_rx_id = rx.get("id")
                    ph_rx_status = rx.get("status")
                    ph_rx_items = rx.get("items", [])
                    print(f"  Using uploaded rx {ph_rx_id[:8]}... status={ph_rx_status} items={len(ph_rx_items)}")
                    break

            # ── Search products to build cart ────────────────────────────────
            if ph_rx_id:
                print(f"[7] Pharmacist: search products for cart builder ...")
                r = await client.get(
                    f"{BASE}/products/?q=para&limit=2",
                    headers={"Authorization": f"Bearer {ph_token}"}
                )
                prods = r.json().get("items", [])
                print(f"  {r.status_code}: found {len(prods)} products")
                prod_id = prods[0].get("id") if prods else None

                if prod_id:
                    # ── Add item to prescription (pharmacist cart builder) ───
                    print(f"[8] Pharmacist: add item to prescription {ph_rx_id[:8]}...")
                    r = await client.post(
                        f"{BASE}/prescriptions/{ph_rx_id}/items",
                        headers={"Authorization": f"Bearer {ph_token}"},
                        json={
                            "product_id": prod_id,
                            "medicine_name": prods[0].get("name", "Test Medicine"),
                            "dosage": "500mg",
                            "frequency": "twice daily",
                            "duration": "5 days",
                            "quantity": 2,
                            "instructions": "Take with food",
                            "substitution_allowed": False,
                        }
                    )
                    print(f"  {r.status_code}: {str(r.json())[:200]}")

                # ── Update prescription status to "reviewed" ─────────────────
                print(f"[9] Pharmacist: update prescription status to 'reviewed' ...")
                r = await client.patch(
                    f"{BASE}/prescriptions/{ph_rx_id}",
                    headers={"Authorization": f"Bearer {ph_token}"},
                    json={"notes": "Cart prepared by pharmacist. Ready for patient to confirm.", "status": "reviewed"}
                )
                print(f"  {r.status_code}: {str(r.json())[:300]}")

                # ── Verify patient can see updated prescription ───────────────
                if patient_token:
                    print(f"[10] Patient: verify prescription is now 'reviewed' ...")
                    r = await client.get(
                        f"{BASE}/patients/me/prescriptions",
                        headers={"Authorization": f"Bearer {patient_token}"}
                    )
                    rb = r.json() if r.status_code == 200 else []
                    verify_items = rb if isinstance(rb, list) else rb.get("items", [])
                    for rx in verify_items:
                        if rx.get("id") == ph_rx_id:
                            print(f"  Status: {rx.get('status')}, items: {len(rx.get('items', []))}")
                            break

    print("\n=== Test complete ===")


asyncio.run(main())
