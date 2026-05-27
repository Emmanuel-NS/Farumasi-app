"""
Full Farumasi database seed.
Creates pharmacy admin users + pharmacies, partner company admins + partner companies,
and product listings linking them all to the existing 24 catalogue products.

Run AFTER seed_products.py (products must already exist).
Usage:  python seed_full.py
"""
import sys
import random
import requests

BASE = "http://localhost:8000/api/v1"
PASSWORD = "Test1234!"

# ── helpers ──────────────────────────────────────────────────────────────────

def login(email: str) -> str:
    r = requests.post(f"{BASE}/auth/login", json={"email": email, "password": PASSWORD})
    r.raise_for_status()
    return r.json()["access_token"]

def register(full_name: str, email: str, role: str, phone: str | None = None) -> str:
    payload = {"full_name": full_name, "email": email, "password": PASSWORD, "role": role}
    if phone:
        payload["phone"] = phone
    r = requests.post(f"{BASE}/auth/register", json=payload)
    if r.status_code == 409:
        # already exists – just login
        return login(email)
    r.raise_for_status()
    return r.json()["access_token"]

def h(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}

def admin_token() -> str:
    return login("admin@test.com")

# ── Pharmacy data ─────────────────────────────────────────────────────────────

PHARMACIES = [
    {
        "user": {"full_name": "Amina Uwase", "email": "amina.pharmacy@test.com", "phone": "+250788100001"},
        "pharmacy": {
            "name": "Amina Pharmacy",
            "email": "amina.pharmacy@test.com",
            "phone": "+250788100001",
            "address": "KG 7 Ave, Kacyiru, Kigali",
            "district": "Gasabo",
            "latitude": -1.9441,
            "longitude": 30.0619,
            "license_number": "RW-PHARM-001",
            "accepts_delivery": True,
        },
    },
    {
        "user": {"full_name": "Jean-Pierre Habimana", "email": "jp.medplus@test.com", "phone": "+250788100002"},
        "pharmacy": {
            "name": "MedPlus Pharmacy",
            "email": "jp.medplus@test.com",
            "phone": "+250788100002",
            "address": "KN 4 Ave, Nyarugenge, Kigali",
            "district": "Nyarugenge",
            "latitude": -1.9500,
            "longitude": 30.0588,
            "license_number": "RW-PHARM-002",
            "accepts_delivery": True,
        },
    },
    {
        "user": {"full_name": "Claudine Mukagatare", "email": "claudine.healthcity@test.com", "phone": "+250788100003"},
        "pharmacy": {
            "name": "HealthCity Pharmacy",
            "email": "claudine.healthcity@test.com",
            "phone": "+250788100003",
            "address": "KK 15 Rd, Kicukiro, Kigali",
            "district": "Kicukiro",
            "latitude": -1.9706,
            "longitude": 30.0863,
            "license_number": "RW-PHARM-003",
            "accepts_delivery": True,
        },
    },
    {
        "user": {"full_name": "Emmanuel Niyonzima", "email": "emmanuel.greenleaf@test.com", "phone": "+250788100004"},
        "pharmacy": {
            "name": "Green Leaf Pharmacy",
            "email": "emmanuel.greenleaf@test.com",
            "phone": "+250788100004",
            "address": "Main Street, Musanze",
            "district": "Musanze",
            "latitude": -1.4996,
            "longitude": 29.6343,
            "license_number": "RW-PHARM-004",
            "accepts_delivery": False,
        },
    },
    {
        "user": {"full_name": "Odette Nyiransabimana", "email": "odette.vitalcare@test.com", "phone": "+250788100005"},
        "pharmacy": {
            "name": "VitalCare Pharmacy",
            "email": "odette.vitalcare@test.com",
            "phone": "+250788100005",
            "address": "Muhima Rd, Nyarugenge",
            "district": "Nyarugenge",
            "latitude": -1.9537,
            "longitude": 30.0605,
            "license_number": "RW-PHARM-005",
            "accepts_delivery": True,
        },
    },
    {
        "user": {"full_name": "Théoneste Hakizimana", "email": "theo.carepoint@test.com", "phone": "+250788100006"},
        "pharmacy": {
            "name": "CarePoint Pharmacy",
            "email": "theo.carepoint@test.com",
            "phone": "+250788100006",
            "address": "Avenue de Butare, Huye",
            "district": "Huye",
            "latitude": -2.5963,
            "longitude": 29.7386,
            "license_number": "RW-PHARM-006",
            "accepts_delivery": True,
        },
    },
]

# ── Partner company data ───────────────────────────────────────────────────────

PARTNERS = [
    {
        "user": {"full_name": "Patrick Karenzi", "email": "patrick.rwandameds@test.com", "phone": "+250788200001"},
        "company": {
            "name": "Rwanda MedSupply Ltd",
            "company_type": "medical_distributor",
            "email": "info@rwandameds.test.com",
            "phone": "+250788200001",
            "address": "KG 15 Ave, Kacyiru, Kigali",
            "district": "Gasabo",
            "latitude": -1.9380,
            "longitude": 30.0693,
            "business_registration_number": "RW-BRN-2024-001",
        },
    },
    {
        "user": {"full_name": "Solange Umubyeyi", "email": "solange.afrihealth@test.com", "phone": "+250788200002"},
        "company": {
            "name": "AfriHealth Solutions",
            "company_type": "health_retailer",
            "email": "info@afrihealth.test.com",
            "phone": "+250788200002",
            "address": "KN 82 St, Nyarugenge, Kigali",
            "district": "Nyarugenge",
            "latitude": -1.9522,
            "longitude": 30.0577,
            "business_registration_number": "RW-BRN-2024-002",
        },
    },
]

# ── Price tables per product name (RWF) ───────────────────────────────────────
# Base prices in RWF; each seller adds a small variation

PRODUCT_BASE_PRICES = {
    "Paracetamol":              1500,
    "Ibuprofen":                2000,
    "Diclofenac Gel":           4500,
    "Amoxicillin":              5000,
    "Azithromycin":             7500,
    "Metronidazole":            3500,
    "Vitamin C":                2500,
    "Vitamin D3":               3500,
    "Multivitamin Complex":     4000,
    "Cetirizine":               2000,
    "Loratadine Syrup":         3000,
    "Artemether/Lumefantrine":  6500,
    "Quinine Sulphate":         8000,
    "Omeprazole":               3500,
    "ORS Sachets":              1000,
    "Amlodipine":               4500,
    "Metformin":                3000,
    "Atorvastatin":             5500,
    "Hydrocortisone Cream":     3000,
    "Clotrimazole Cream":       3500,
    "Povidone Iodine":          2500,
    "Sterile Gauze Swabs":      1500,
    "Folic Acid":               1500,
    "Iron + Folic Acid":        2000,
}

# Which products each pharmacy index stocks (0-indexed from PHARMACIES list)
# Each pharmacy stocks most products; a few are missing to simulate realistic gaps
PHARMACY_STOCK_SKIP = {
    0: [],                      # Amina: stocks everything
    1: ["Diclofenac Gel", "Quinine Sulphate", "Atorvastatin"],  # MedPlus: missing 3
    2: ["Sterile Gauze Swabs", "Loratadine Syrup"],             # HealthCity: missing 2
    3: ["Amoxicillin", "Azithromycin", "Metronidazole", "Atorvastatin", "Amlodipine",
        "Artemether/Lumefantrine", "Quinine Sulphate"],          # Musanze: no Rx heavy
    4: ["Multivitamin Complex", "Vitamin D3"],                   # VitalCare: missing 2
    5: ["Clotrimazole Cream", "Hydrocortisone Cream"],           # CarePoint: missing 2
}

# Partner stock skips
PARTNER_STOCK_SKIP = {
    0: ["Artemether/Lumefantrine", "Quinine Sulphate"],  # RwandaMedSupply skips malaria
    1: ["Amoxicillin", "Azithromycin", "Metronidazole"], # AfriHealth skips antibiotics
}

# Availability overrides: make some things low_stock for realism
LOW_STOCK_PRODUCTS = {
    "Artemether/Lumefantrine",
    "Quinine Sulphate",
    "Atorvastatin",
    "Amlodipine",
    "Metformin",
}

def availability_for(product_name: str, qty: int) -> str:
    if qty <= 5:
        return "low_stock"
    if product_name in LOW_STOCK_PRODUCTS:
        return "low_stock"
    return "available"


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    random.seed(42)
    print("=== Farumasi Full Seed ===\n")

    # 1. Fetch existing approved products
    print("Fetching product catalogue...")
    admin_tok = admin_token()
    resp = requests.get(
        f"{BASE}/products/?limit=100&only_with_listings=false&include_unapproved=false",
        headers=h(admin_tok),
    )
    resp.raise_for_status()
    products = {p["name"]: p["id"] for p in resp.json()["items"]}
    print(f"  Found {len(products)} approved products\n")

    if not products:
        print("ERROR: No approved products found. Run seed_products.py first.")
        sys.exit(1)

    # 2. Create pharmacy admin users + pharmacies
    print("Creating pharmacies...")
    pharmacy_ids: list[str] = []
    for i, entry in enumerate(PHARMACIES):
        u = entry["user"]
        tok = register(u["full_name"], u["email"], "pharmacy_admin", u.get("phone"))
        # Create pharmacy
        pharm_data = entry["pharmacy"]
        r = requests.post(f"{BASE}/pharmacies/", json=pharm_data, headers=h(tok))
        if r.status_code in (200, 201):
            pid = r.json()["id"]
            pharmacy_ids.append(pid)
            print(f"  ✓ {pharm_data['name']} [{pid[:8]}...]")
        elif r.status_code == 409 or "already" in r.text.lower():
            # Pharmacy may already exist – fetch it
            r2 = requests.get(f"{BASE}/pharmacies/me", headers=h(tok))
            if r2.status_code == 200:
                pid = r2.json()["id"]
                pharmacy_ids.append(pid)
                print(f"  ~ {pharm_data['name']} already exists [{pid[:8]}...]")
            else:
                print(f"  ✗ Could not fetch pharmacy for {u['email']}: {r2.text[:80]}")
                pharmacy_ids.append(None)
        else:
            print(f"  ✗ {pharm_data['name']}: {r.status_code} {r.text[:80]}")
            pharmacy_ids.append(None)

    print()

    # 3. Create partner company admin users + companies
    print("Creating partner companies...")
    partner_ids: list[str] = []
    partner_tokens: list[str] = []
    for i, entry in enumerate(PARTNERS):
        u = entry["user"]
        tok = register(u["full_name"], u["email"], "partner_company_admin", u.get("phone"))
        partner_tokens.append(tok)
        co_data = entry["company"]
        r = requests.post(f"{BASE}/partners/", json=co_data, headers=h(tok))
        if r.status_code in (200, 201):
            cid = r.json()["id"]
            partner_ids.append(cid)
            print(f"  ✓ {co_data['name']} [{cid[:8]}...]")
        elif r.status_code == 409 or "already" in r.text.lower():
            r2 = requests.get(f"{BASE}/partners/me", headers=h(tok))
            if r2.status_code == 200:
                cid = r2.json()["id"]
                partner_ids.append(cid)
                print(f"  ~ {co_data['name']} already exists [{cid[:8]}...]")
            else:
                print(f"  ✗ Could not fetch partner for {u['email']}: {r2.text[:80]}")
                partner_ids.append(None)
        else:
            print(f"  ✗ {co_data['name']}: {r.status_code} {r.text[:80]}")
            partner_ids.append(None)

    print()

    # 4. Create product listings for pharmacies
    print("Creating pharmacy product listings...")
    listing_ok = 0
    listing_skip = 0
    listing_fail = 0

    for i, (pharm_id, entry) in enumerate(zip(pharmacy_ids, PHARMACIES)):
        if pharm_id is None:
            continue
        tok = register(  # re-login / get token
            entry["user"]["full_name"], entry["user"]["email"], "pharmacy_admin"
        )
        skip_set = set(PHARMACY_STOCK_SKIP.get(i, []))
        pharm_name = entry["pharmacy"]["name"]

        for prod_name, prod_id in products.items():
            if prod_name in skip_set:
                continue
            base = PRODUCT_BASE_PRICES.get(prod_name, 3000)
            # Vary price ±15%
            price = round(base * random.uniform(0.90, 1.15) / 100) * 100
            qty = random.randint(3, 80)
            avail = availability_for(prod_name, qty)

            payload = {
                "product_id": prod_id,
                "pharmacy_id": pharm_id,
                "price": float(price),
                "stock_quantity": qty,
                "availability_status": avail,
                "fulfillment_time_minutes": random.choice([30, 45, 60, 90]),
                "delivery_options": ["delivery", "pickup"] if entry["pharmacy"]["accepts_delivery"] else ["pickup"],
                "location_latitude": entry["pharmacy"]["latitude"],
                "location_longitude": entry["pharmacy"]["longitude"],
            }
            r = requests.post(f"{BASE}/listings/", json=payload, headers=h(tok))
            if r.status_code in (200, 201):
                listing_ok += 1
            elif r.status_code == 409:
                listing_skip += 1
            else:
                listing_fail += 1
                if listing_fail <= 5:
                    print(f"    ✗ {pharm_name}/{prod_name}: {r.status_code} {r.text[:120]}")

        print(f"  ✓ {pharm_name}: {len(products) - len(skip_set)} listings")

    print()

    # 5. Create product listings for partner companies
    print("Creating partner product listings...")
    for i, (partner_id, entry) in enumerate(zip(partner_ids, PARTNERS)):
        if partner_id is None:
            continue
        tok = partner_tokens[i]
        skip_set = set(PARTNER_STOCK_SKIP.get(i, []))
        co_name = entry["company"]["name"]

        for prod_name, prod_id in products.items():
            if prod_name in skip_set:
                continue
            base = PRODUCT_BASE_PRICES.get(prod_name, 3000)
            # Partners typically 5-10% cheaper (bulk supply)
            price = round(base * random.uniform(0.88, 1.05) / 100) * 100
            qty = random.randint(10, 200)
            avail = availability_for(prod_name, qty)

            payload = {
                "product_id": prod_id,
                "partner_company_id": partner_id,
                "price": float(price),
                "stock_quantity": qty,
                "availability_status": avail,
                "fulfillment_time_minutes": random.choice([60, 90, 120]),
                "delivery_options": ["delivery"],
                "location_latitude": entry["company"]["latitude"],
                "location_longitude": entry["company"]["longitude"],
            }
            r = requests.post(f"{BASE}/listings/", json=payload, headers=h(tok))
            if r.status_code in (200, 201):
                listing_ok += 1
            elif r.status_code == 409:
                listing_skip += 1
            else:
                listing_fail += 1
                if listing_fail <= 5:
                    print(f"    ✗ {co_name}/{prod_name}: {r.status_code} {r.text[:120]}")

        print(f"  ✓ {co_name}: {len(products) - len(skip_set)} listings")

    print()
    print("=== Summary ===")
    print(f"  Pharmacies:          {len([x for x in pharmacy_ids if x])}")
    print(f"  Partner companies:   {len([x for x in partner_ids if x])}")
    print(f"  Listings created:    {listing_ok}")
    print(f"  Listings skipped:    {listing_skip} (duplicates)")
    print(f"  Listing failures:    {listing_fail}")

    # Verify
    print("\nVerifying patient-facing store...")
    r = requests.get(f"{BASE}/products/?limit=100&only_with_listings=true")
    r.raise_for_status()
    data = r.json()
    print(f"  Products visible to guests: {data['total']}")
    for p in data["items"][:5]:
        price_str = f"RWF {p['price_from']:,.0f}" if p.get("price_from") else "no price"
        listings_str = f"{p.get('listing_count', 0)} seller(s)"
        print(f"    - {p['name']}: {price_str} | {listings_str}")

    print("\nDone! The Farumasi store is now live with real pharmacy data.")
    print("\nPharmacy login credentials (all password: Test1234!):")
    for entry in PHARMACIES:
        print(f"  {entry['user']['email']} — {entry['pharmacy']['name']}")
    print("\nPartner login credentials:")
    for entry in PARTNERS:
        print(f"  {entry['user']['email']} — {entry['company']['name']}")


if __name__ == "__main__":
    main()
