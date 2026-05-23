# FARUMASI — Demo Accounts & Seed Data

> All accounts are created by [farumasi_api/scripts/seed.py](../farumasi_api/scripts/seed.py).
> Seed is idempotent — re-running it skips existing rows.

Usage:
```powershell
cd farumasi_api
python scripts/seed.py
```

---

## 1. Accounts

| Email | Password | Role | Portal / App | Purpose |
|---|---|---|---|---|
| admin@farumasi.com | Admin@12345 | SUPER_ADMIN | farumasi_super_admin | Full platform control |
| finance@farumasi.com | Finance@12345 | FINANCE_ADMIN | farumasi_super_admin | Approve withdrawals, view revenue |
| operations@farumasi.com | Operations@12345 | OPERATIONS_ADMIN | farumasi_super_admin | Manage orders, deliveries, fleet ops |
| compliance@farumasi.com | Compliance@12345 | COMPLIANCE_ADMIN | farumasi_super_admin | Audit logs, verification, KYC |
| doctor@farumasi.com | Doctor@12345 | DOCTOR | farumasi_doctor_portal | Create digital prescriptions |
| doctor2@farumasi.com | Doctor@12345 | DOCTOR | farumasi_doctor_portal | Secondary doctor for testing |
| patient@farumasi.com | Patient@12345 | PATIENT | farumasi_patient_portal + Flutter | Primary patient w/ prescriptions |
| patient2@farumasi.com | Patient@12345 | PATIENT | farumasi_patient_portal | Secondary patient |
| patient3@farumasi.com | Patient@12345 | PATIENT | farumasi_patient_portal | Tertiary patient |
| pharmacist@farumasi.com | Pharmacist@12345 | PHARMACIST | farumasi_pharmacist_portal | Review prescriptions, write articles |
| pharmacist2@farumasi.com | Pharmacist@12345 | PHARMACIST | farumasi_pharmacist_portal | Secondary pharmacist |
| pharmacist3@farumasi.com | Pharmacist@12345 | PHARMACIST | farumasi_pharmacist_portal | Tertiary pharmacist |
| pharmacy_admin@farumasi.com | Pharmacy@12345 | PHARMACY_ADMIN | farumasi_partner_portal | Owner of "Kigali City Pharmacy" |
| pharmacy_admin2@farumasi.com | Pharmacy@12345 | PHARMACY_ADMIN | farumasi_partner_portal | Owner of "Remera Medicare Pharmacy" |
| partner_admin@farumasi.com | Partner@12345 | PARTNER_COMPANY_ADMIN | farumasi_partner_portal | Owner of "MediHub Rwanda" |
| rider@farumasi.com | Rider@12345 | RIDER | Flutter app | Primary rider |
| rider2@farumasi.com | Rider@12345 | RIDER | Flutter app | Secondary rider |
| hospital_admin@farumasi.com | Hospital@12345 | HOSPITAL_ADMIN | farumasi_hospital_portal | Owner of "King Faisal Hospital" |

> **Security note:** these credentials are for local dev only. Production must rotate them and never deploy with these passwords.

---

## 2. Seeded entities

| Entity | Count | Notes |
|---|---|---|
| Users | 18 | All roles covered |
| Hospital | 1 | King Faisal Hospital, Gasabo |
| Doctor profiles | 2 | Linked to King Faisal Hospital |
| Patient profiles | 3 | Each with a default Kigali address |
| Pharmacist profiles | 3 | Specializations + verified |
| Rider profiles | 2 | Motorcycle vehicle type |
| Pharmacies | 2 | Kigali City Pharmacy, Remera Medicare Pharmacy |
| Partner companies | 1 | MediHub Rwanda |
| Products (catalogue) | 10 | All APPROVED — see [seed.py](../farumasi_api/scripts/seed.py) |
| Product listings | ~20 | 10 per pharmacy |
| Prescriptions | 2 | 1 doctor-created, 1 patient-uploaded |
| Health articles | 6 | PUBLISHED, authored by pharmacist@farumasi.com |

---

## 3. What seed does NOT create (yet)

These are intentionally left for E2E test runs to exercise the API:
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
- To reset, drop the database and re-run the seed:
  ```powershell
  cd farumasi_api
  # WARNING: destructive
  Remove-Item .\app.db -ErrorAction SilentlyContinue
  alembic upgrade head
  python scripts/seed.py
  ```
- For tests, the seed is **not** used; pytest uses a clean SQLite (`test.db`) and fixtures.
