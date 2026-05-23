# FARUMASI — End-to-End Workflow Test Plan

> Full happy-path covering every persona, ending with revenue settlement.
> Run against a freshly-seeded local dev environment (see [DEMO_ACCOUNTS.md](./DEMO_ACCOUNTS.md)).

Base URL: `http://localhost:8000/api/v1` (override with `$base`).

---

## 0. Preconditions

```powershell
cd farumasi_api
alembic upgrade head
python scripts/seed.py
uvicorn app.main:app --reload --port 8000
```

In each step below, `${X_token}` denotes the access token retrieved from `POST /auth/login`. Save it in your client (Postman / curl / shared client).

---

## Step 1 — Login as super admin
```http
POST /auth/login  { "email": "admin@farumasi.com", "password": "Admin@12345" }
→ TokenResponse → ${admin_token}
```
**Verify:** `GET /users/me` returns `role: SUPER_ADMIN`.

## Step 2 — Approve / create a product
Seed already has 10 APPROVED products. To add a new one:
```http
POST /products/                    Authorization: Bearer ${admin_token}
{ "name": "Doxycycline 100mg", "generic_name": "Doxycycline", "dosage_form": "Capsule",
  "strength": "100mg", "prescription_required": true, "category": "Antibiotics" }
```
Optionally:
```http
PATCH /products/{id}/status   { "status": "APPROVED" }
```
**Verify:** `GET /products/?status=APPROVED` includes new product.

## Step 3 — Login as pharmacy admin
```http
POST /auth/login  { "email": "pharmacy_admin@farumasi.com", "password": "Pharmacy@12345" }
→ ${pharm_token}
```
**Verify:** `GET /pharmacies/me` returns "Kigali City Pharmacy".

## Step 4 — Create a product listing
```http
POST /pharmacies/me/listings    Authorization: Bearer ${pharm_token}
{ "product_id": "<doxy_id>", "price": 2500, "stock_quantity": 50,
  "expiry_date": "2027-01-01", "availability_status": "AVAILABLE" }
```
**Verify:** `GET /pharmacies/me/listings` shows the new listing.

## Step 5 — Login as doctor
```http
POST /auth/login  { "email": "doctor@farumasi.com", "password": "Doctor@12345" }
→ ${doctor_token}
```

## Step 6 — Create a digital prescription
Find the patient id (admin):
```http
GET /users/?role=PATIENT   Authorization: Bearer ${admin_token}
```
Find the patient profile id:
```http
GET /patients/me   (logged in as patient — see step 7)
```
Then doctor creates:
```http
POST /doctors/me/prescriptions    Authorization: Bearer ${doctor_token}
{
  "patient_id": "<patient_profile_id>",
  "diagnosis_notes": "Bacterial chest infection",
  "items": [{ "medicine_name": "Doxycycline 100mg", "dosage": "100mg",
              "frequency": "Twice daily", "duration": "7 days", "quantity": 14 }]
}
```
**Verify:** `GET /doctors/me/prescriptions` lists it.

## Step 7 — Login as patient
```http
POST /auth/login  { "email": "patient@farumasi.com", "password": "Patient@12345" }
→ ${patient_token}
```

## Step 8 — View prescription
```http
GET /patients/me/prescriptions    Authorization: Bearer ${patient_token}
```
**Verify:** contains both the doctor-created prescription and any uploaded ones.

## Step 9 — Get top-3 pharmacy recommendations
```http
POST /patients/me/recommendations   Authorization: Bearer ${patient_token}
{ "prescription_id": "<rx_id>", "latitude": -1.95, "longitude": 30.06, "max_results": 3 }
```
**Verify:** response has up to 3 pharmacies with `score`, `score_breakdown`, and `available_items`.

## Step 10 — Create an order
```http
POST /patients/me/orders     Authorization: Bearer ${patient_token}
{
  "pharmacy_id": "<reco[0].pharmacy.id>",
  "prescription_id": "<rx_id>",
  "delivery_address_id": "<addr_id from GET /patients/me/addresses>",
  "payment_method": "MTN_MOMO",
  "items": [{ "product_id": "<doxy_id>", "quantity": 14, "unit_price": 2500 }]
}
```
**Verify:** `GET /patients/me/orders` shows status `PENDING`.

## Step 11 — Login as pharmacy/partner
Already have `${pharm_token}` from step 3.

## Step 12 — Accept the order
```http
GET  /pharmacies/me/orders                                 Authorization: Bearer ${pharm_token}
PATCH /pharmacies/me/orders/{order_id}/status              { "status": "ACCEPTED" }
PATCH /pharmacies/me/orders/{order_id}/status              { "status": "PREPARING" }
PATCH /pharmacies/me/orders/{order_id}/status              { "status": "READY_FOR_PICKUP" }
```
**Verify:** order status transitions persist; a notification is created for the patient.

## Step 13 — Login as rider
```http
POST /auth/login  { "email": "rider@farumasi.com", "password": "Rider@12345" }
→ ${rider_token}
```
Toggle availability:
```http
PATCH /riders/me/availability  { "is_available": true }
```

## Step 14 — Accept a delivery
Operations admin (or auto-assignment) assigns the rider:
```http
POST /auth/login  { "email": "operations@farumasi.com", "password": "Operations@12345" }
→ ${ops_token}
POST /deliveries/assign     { "order_id": "<order_id>", "rider_id": "<rider_user_id>" }   Authorization: Bearer ${ops_token}
```
Then rider accepts:
```http
GET   /riders/me/deliveries                                   Authorization: Bearer ${rider_token}
PATCH /riders/me/deliveries/{delivery_id}/accept
```

## Step 15 — Progress the delivery
```http
PATCH /riders/me/deliveries/{delivery_id}/status   { "status": "PICKED_UP" }
PATCH /riders/me/deliveries/{delivery_id}/status   { "status": "IN_TRANSIT" }
```

## Step 16 — Confirm QR
```http
POST  /riders/me/deliveries/{delivery_id}/confirm-qr   { "qr_code": "<the order's QR>" }
```
**Verify:** delivery status becomes `DELIVERED`; order moves to `COMPLETED`; revenue record is created.

## Step 17 — Check revenue
```http
GET /pharmacies/me/revenue          Authorization: Bearer ${pharm_token}
GET /pharmacies/me/revenue/summary
```
**Verify:** entries reflect the completed order minus platform commission (10%).

## Step 18 — Request a withdrawal
```http
POST /pharmacies/me/withdrawals
{ "amount": 25000, "payout_method": "BANK", "payout_details": { "bank": "BK", "account_number": "0000123" } }
```

## Step 19 — Approve the withdrawal as finance admin
```http
POST /auth/login  { "email": "finance@farumasi.com", "password": "Finance@12345" }
→ ${fin_token}

GET   /withdrawals/?status=PENDING     Authorization: Bearer ${fin_token}
PATCH /withdrawals/{id}/approve
PATCH /withdrawals/{id}/mark-paid
```
**Verify:** withdrawal status becomes `PAID`; notification fired to the pharmacy admin.

## Step 20 — Read a health article
```http
GET /articles/                  (public)
GET /articles/slug/malaria-prevention-rwanda
```
**Verify:** article body returned with `status: PUBLISHED`.

## Step 21 — Check notifications
Each persona checks their inbox:
```http
GET /notifications/?status=UNREAD          Authorization: Bearer <persona token>
GET /notifications/unread-count
PATCH /notifications/{id}/read
```
**Verify:** expected events fired (order received, ready for pickup, delivered, withdrawal paid, etc.).

## Step 22 — Check audit logs
```http
POST /auth/login  { "email": "compliance@farumasi.com", "password": "Compliance@12345" }
→ ${comp_token}

GET /admin/audit-logs/?entity_type=Order              Authorization: Bearer ${comp_token}
GET /admin/audit-logs/?entity_type=Withdrawal
GET /admin/audit-logs/?actor_user_id=<finance user_id>
```
**Verify:** events for product approval, order status, withdrawal approval all appear.

---

## Pass criteria

- All 22 steps complete with HTTP 2xx (200/201/204).
- Backend `pytest -q` still passes (161+).
- Audit log captures: product create, order status changes, withdrawal approve, withdrawal mark-paid.
- Revenue record total equals order subtotal minus commission.
- Notification count > 0 for each persona that participated.
