# FARUMASI — Demo Accounts & Seed Data

> Core staff/demo accounts are created by [farumasi_api/scripts/seed.py](../farumasi_api/scripts/seed.py).
> Seed is idempotent — re-running it skips existing rows.
> **Patients are not seeded** — create them manually on the patient portal.

## Live portal URLs

| Portal | URL |
|---|---|
| Patient storefront | https://farumasi.com · https://www.farumasi.com · https://patient.farumasi.com |
| Pharmacist | https://pharmacist.farumasi.com |
| Partner pharmacy | https://pharmacy.farumasi.com |
| Super Admin | https://admin.farumasi.com |
| Rider | https://rider.farumasi.com |

## Official company email

| Address | Use |
|---|---|
| info@farumasi.com | General enquiries |
| support@farumasi.com | Customer / partner support |
| careers@farumasi.com | Hiring |
| admin@farumasi.com | Platform admin mailbox |
| emmanuel.nsaba@farumasi.com | Founder contact |

Usage:
```powershell
cd farumasi_api
python scripts/seed.py
# prompts for Neon / Postgres connection string
```

---

## 1. Accounts (current seed)

| Email | Password | Role | Portal URL | Purpose |
|---|---|---|---|---|
| admin@farumasi.com | Admin@12345 | SUPER_ADMIN | https://admin.farumasi.com | Full platform control |
| pharmacist@farumasi.com | Pharmacist@12345 | PHARMACIST | https://pharmacist.farumasi.com | Review prescriptions, write articles |
| pharmacist2@farumasi.com | Pharmacist@12345 | PHARMACIST | https://pharmacist.farumasi.com | Secondary pharmacist |
| pharmacist3@farumasi.com | Pharmacist@12345 | PHARMACIST | https://pharmacist.farumasi.com | Tertiary pharmacist |
| pharmacy_admin@farumasi.com | Pharmacy@12345 | PHARMACY_ADMIN | https://pharmacy.farumasi.com | Owner of "Kigali City Pharmacy" |
| pharmacy_admin2@farumasi.com | Pharmacy@12345 | PHARMACY_ADMIN | https://pharmacy.farumasi.com | Owner of "Remera Medicare Pharmacy" |
| partner_admin@farumasi.com | Partner@12345 | PARTNER_COMPANY_ADMIN | https://pharmacy.farumasi.com | Owner of "MediHub Rwanda" |
| rider@farumasi.com | Rider@12345 | RIDER | https://rider.farumasi.com | Primary rider |
| rider2@farumasi.com | Rider@12345 | RIDER | https://rider.farumasi.com | Secondary rider |

> **Security note:** rotate demo passwords for any shared or public environment. Do not treat seed passwords as production credentials.

---

## 2. Seeded entities

| Entity | Count | Notes |
|---|---|---|
| Users | 9 | Admin, pharmacists, pharmacy/partner admins, riders |
| Pharmacist profiles | 3 | Specializations + verified |
| Rider profiles | 2 | Motorcycle vehicle type |
| Pharmacies | 2 | Kigali City Pharmacy, Remera Medicare Pharmacy |
| Partner companies | 1 | MediHub Rwanda |
| Products (catalogue) | see seed.py | Approved catalogue items |
| Product listings | per pharmacy | Active partner listings |
| Health articles | may be separate script | `seed_health_articles.py` if run |

**Not seeded:** patients, doctors, hospital, finance/ops/compliance admins — create as needed.

---

## 3. What seed does NOT create (yet)

These are intentionally left for E2E test runs to exercise the API:
- Patient accounts (register on https://farumasi.com)
- Orders (drive via `POST /patients/me/orders`)
- Deliveries (created when an order is `READY_FOR_PICKUP`)
- Revenue records (created on order completion)
- Withdrawal requests (driven by pharmacy/partner admins)
- Notifications (created automatically by the backend on state transitions)
- Audit log entries (created automatically by services)

See [E2E_WORKFLOW_TEST_PLAN.md](./E2E_WORKFLOW_TEST_PLAN.md) for the step-by-step flow to generate these.

---

## 4. Re-seeding tips

- The script is **idempotent**: existing rows are skipped (`[skip] …`) and new ones added (`[+] …`).
- It prompts for a Neon/Postgres connection string unless you pass `--url`.
- For tests, the seed is **not** used; pytest uses a clean SQLite (`test.db`) and fixtures.
