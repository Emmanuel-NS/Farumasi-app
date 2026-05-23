# FARUMASI — API Contract

> Canonical reference for every frontend (Next.js portals + Flutter app) integrating with the FARUMASI FastAPI backend.
> Source of truth: live `GET /api/v1/openapi.json`. This document highlights the conventions and the most-used routes.

---

## 1. Base URL

| Environment | Base URL |
|---|---|
| Local dev | `http://localhost:8000/api/v1` |
| Docker | `http://farumasi_api:8000/api/v1` |
| Staging | `https://staging-api.farumasi.rw/api/v1` *(TBD)* |
| Production | `https://api.farumasi.rw/api/v1` *(TBD)* |

Next.js portals read this from `NEXT_PUBLIC_API_URL`.  
Flutter reads it from `--dart-define=API_BASE_URL=…` (see §11).

**Trailing slash:** the backend runs with `redirect_slashes=False`. List-style endpoints (e.g. `GET /products/`, `GET /listings/`) require a trailing `/`. Item endpoints (`GET /products/{id}`) and action endpoints (`/login`, `/me`, `/approve`, `/confirm-qr`, …) must NOT end with `/`. The shared client (§ shared client docs) handles this automatically.

---

## 2. Auth flow

### 2.1 Register
```
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "StrongP@ss1",
  "full_name": "Jane Doe",
  "role": "PATIENT",
  "phone": "+250788000000"
}
```
**Response 201 →** `TokenResponse`
```json
{
  "access_token": "eyJhbGc...",
  "refresh_token": "eyJhbGc...",
  "token_type": "bearer"
}
```

### 2.2 Login
```
POST /auth/login
Content-Type: application/json

{ "email": "...", "password": "..." }
```
**Response 200 →** `TokenResponse`.

### 2.3 Refresh
```
POST /auth/refresh
Content-Type: application/json

{ "refresh_token": "<refresh JWT>" }
```
**Response 200 →** `TokenResponse` (new access + refresh).

### 2.4 Current user
```
GET /users/me
Authorization: Bearer <access JWT>
```

---

## 3. Token handling

- Access token TTL: `30 minutes`.
- Refresh token TTL: `7 days`.
- Algorithm: `HS256`.
- `Authorization: Bearer <access>` header is required on all protected routes.
- On `401 Unauthorized`, clients SHOULD attempt a single refresh, then retry; on second failure clear tokens and route to login.
- Storage (web): `localStorage` with **per-portal key prefix** to keep portals isolated:
  - `farumasi_patient_access_token`, `farumasi_patient_refresh_token`
  - `farumasi_doctor_…`, `farumasi_pharmacist_…`, `farumasi_pharmacy_…`, `farumasi_partner_…`, `farumasi_hospital_…`, `farumasi_admin_…`
  > **Note:** existing portals use legacy keys (e.g. `farumasi_access_token` for patient, `farumasi_doctor_token` for doctor). The shared client supports a configurable `tokenKeyPrefix` so portals migrate without breakage.
- Storage (Flutter): `shared_preferences` (`farumasi_access_token`, `farumasi_refresh_token`).

---

## 4. Roles

| Role | Portal/App |
|---|---|
| `SUPER_ADMIN` | farumasi_super_admin |
| `OPERATIONS_ADMIN` | farumasi_super_admin |
| `FINANCE_ADMIN` | farumasi_super_admin |
| `COMPLIANCE_ADMIN` | farumasi_super_admin |
| `PATIENT` | farumasi_patient_portal + Flutter (patient screens) |
| `DOCTOR` | farumasi_doctor_portal |
| `HOSPITAL_ADMIN` | farumasi_hospital_portal |
| `PHARMACIST` | farumasi_pharmacist_portal |
| `PHARMACY_ADMIN` | farumasi_partner_portal (pharmacy mode) |
| `PARTNER_COMPANY_ADMIN` | farumasi_partner_portal (partner mode) |
| `RIDER` | Flutter (rider screens) |

After login, the frontend SHOULD call `GET /users/me`, read `role`, and redirect to the role's portal home.

---

## 5. Pagination

Endpoints returning lists use `PaginatedResponse<T>`:

```json
{
  "items": [ /* T */ ],
  "total": 137,
  "page": 1,
  "page_size": 20,
  "pages": 7
}
```

Query: `?page=1&page_size=20`. `page_size` cap is enforced server-side.

Some endpoints (e.g. `GET /patients/me/addresses`, `GET /riders/me/deliveries`) return a flat list intentionally.

---

## 6. Error response format

Validation errors (FastAPI default):
```json
{ "detail": [{ "loc": ["body","email"], "msg": "field required", "type": "missing" }] }
```

Domain errors:
```json
{ "detail": "Pharmacist profile not found." }
```

Standard codes:
- `400` invalid request payload
- `401` missing/invalid/expired token
- `403` role-forbidden or resource-not-owned
- `404` resource not found
- `409` conflict (e.g. duplicate slug, duplicate listing)
- `422` Pydantic validation
- `500` unexpected server error

---

## 7. Upload format

```
POST /uploads/image
POST /uploads/document
POST /uploads/prescription
Content-Type: multipart/form-data

file=<binary>
```

**Response 200 →**
```json
{ "url": "https://…/static/uploads/<uuid>.jpg" }
```

Frontends should use `FormData` (browser) or `MultipartFile` (Dio).

---

## 8. Endpoint groups (summary)

### 8.1 Auth (`/auth`)
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`

### 8.2 Users & profiles (`/users`, `/patients/me`, `/doctors/me`, `/pharmacists/me`, `/pharmacies/me`, `/partners/me`, `/riders/me`)
- `GET /users/me`, `PUT /users/me`
- Patient: `GET|PUT /patients/me`; addresses CRUD under `/patients/me/addresses`
- Doctor / Pharmacist / Rider: each exposes `GET|PUT /<role>/me`
- Pharmacy / Partner: `POST /pharmacies/` to create (owner), then `GET|PATCH /pharmacies/me`
- Hospital: managed by SUPER_ADMIN via `POST /hospitals/`; hospital admin reads their own via `GET /hospitals/{id}` and `GET /hospitals/{id}/doctors`

### 8.3 Products / Listings / Insurance
- Public catalogue: `GET /products/?status=APPROVED&q=…`
- Admin/Pharmacist catalogue: `POST /products/`, `PATCH /products/{id}`, `PATCH /products/{id}/status`
- Listings (search by location/insurance): `GET /listings/?product_id=…&latitude=…&longitude=…&radius_km=…&insurance_id=…`
- Pharmacy/partner listings (owner scope): `GET|POST|PATCH|DELETE /pharmacies/me/listings`, parallel `/partners/me/listings`
- Insurance providers: `GET /insurance-providers/`, admin CRUD

### 8.4 Prescriptions
- Doctor creates: `POST /doctors/me/prescriptions`
- Patient uploads: `POST /patients/me/prescriptions` (multipart with image)
- Patient lists: `GET /patients/me/prescriptions`
- Pharmacist review queue: `GET /prescriptions/?status=PENDING_REVIEW` then `PATCH /prescriptions/{id}` to approve/reject/clarify

### 8.5 Recommendations
```
POST /patients/me/recommendations
{
  "prescription_id": "...",
  "latitude": -1.95,
  "longitude": 30.06,
  "insurance_provider_id": "...",   // optional
  "max_results": 3
}
```
Returns the top-3 pharmacies with score breakdown.

### 8.6 Orders
- Patient creates: `POST /patients/me/orders`
- Patient lists own: `GET /patients/me/orders`
- Pharmacy/partner view assigned: `GET /pharmacies/me/orders`, `GET /partners/me/orders`
- Status: `PATCH /pharmacies/me/orders/{order_id}/status`
- Payment: `PATCH /orders/{order_id}/payment-status`, `PATCH /orders/{order_id}/payment`
- Admin (finance): `GET /orders/pharmacy/all`

### 8.7 Deliveries
- Created automatically when order moves to `READY_FOR_PICKUP` (system) **OR** via `POST /deliveries/`.
- Assign rider: `POST /deliveries/assign` or `PATCH /deliveries/{id}/assign`
- Rider scope: `GET /riders/me/deliveries`, `GET /riders/me/deliveries/active`
- Accept/reject: `PATCH /riders/me/deliveries/{id}/accept`, `…/reject`
- Status updates: `PATCH /riders/me/deliveries/{id}/status` (PICKED_UP → IN_TRANSIT → DELIVERED)
- QR confirm: `POST /deliveries/{id}/confirm-qr` (rider-side) and `POST /riders/me/deliveries/{id}/confirm-qr`
- Timer: `GET /deliveries/{id}/timer`

### 8.8 Revenue & withdrawals
- Pharmacy / partner: `GET /pharmacies/me/revenue`, `…/summary`; `GET /pharmacies/me/withdrawals`; `POST /pharmacies/me/withdrawals`
- Symmetric `/partners/me/…`
- Finance admin: `GET /revenue/`, `GET /revenue/summary`; `GET /withdrawals/`; `POST|PATCH /withdrawals/{id}/approve|reject|mark-paid`
- Rider earnings: `GET /riders/me/earnings`

### 8.9 Notifications
- `GET /notifications/?status=UNREAD`
- `GET /notifications/unread-count`
- `PATCH /notifications/{id}/read`
- `PATCH /notifications/read-all` (or `POST /notifications/mark-all-read`)
- Admin broadcast: `POST /notifications/admin/broadcast` (super-admin)

### 8.10 Audit logs (Phase 9.1)
- `GET /admin/audit-logs/?actor_user_id=…&entity_type=…`
- `GET /admin/audit-logs/{id}`
- Requires `SUPER_ADMIN`, `COMPLIANCE_ADMIN` or `OPERATIONS_ADMIN`.

### 8.11 Health articles (Phase 9.2)
- Public:
  - `GET /articles/?page=1&page_size=20`
  - `GET /articles/slug/{slug}`
- Author (PHARMACIST or SUPER_ADMIN):
  - `GET /articles/admin/all`
  - `POST /articles/`
  - `PATCH /articles/{id}`
  - `PATCH /articles/{id}/publish`
  - `PATCH /articles/{id}/archive`
  - `DELETE /articles/{id}`

### 8.12 Admin & analytics
- `GET /analytics/admin` (super-admin)
- `GET /analytics/pharmacy/{id}` (pharmacy owner / super-admin)
- `GET /admin/profiles/overview` (super-admin)

### 8.13 Consultations (doctor ↔ patient chat)
- `POST /consultations/`
- `GET /consultations/?role=doctor` (auto-scoped to caller)
- `GET /consultations/{id}` + `/messages` endpoints

---

## 9. Request examples

### 9.1 Create a doctor prescription
```http
POST /api/v1/doctors/me/prescriptions
Authorization: Bearer <doctor JWT>
Content-Type: application/json

{
  "patient_id": "550e8400-e29b-41d4-a716-446655440000",
  "diagnosis_notes": "Bacterial chest infection",
  "notes": "Follow up in 1 week",
  "items": [
    {
      "medicine_name": "Amoxicillin 500mg",
      "dosage": "500mg",
      "frequency": "3 times daily",
      "duration": "7 days",
      "quantity": 21,
      "instructions": "Take with water"
    }
  ]
}
```
**Response 201** → `PrescriptionOut`.

### 9.2 Get top-3 pharmacies for a prescription
```http
POST /api/v1/patients/me/recommendations
Authorization: Bearer <patient JWT>

{
  "prescription_id": "…",
  "latitude": -1.95,
  "longitude": 30.06,
  "max_results": 3
}
```
**Response 200**
```json
{
  "recommendations": [
    {
      "pharmacy": { "id": "…", "name": "Kigali City Pharmacy", "distance_km": 2.4, "rating": 4.6 },
      "score": 0.91,
      "score_breakdown": { "distance": 0.4, "rating": 0.3, "stock": 0.21 },
      "available_items": [ /* item-by-item availability */ ]
    }
  ]
}
```

### 9.3 Create an order from a recommendation
```http
POST /api/v1/patients/me/orders
Authorization: Bearer <patient JWT>

{
  "pharmacy_id": "…",
  "prescription_id": "…",
  "delivery_address_id": "…",
  "payment_method": "MTN_MOMO",
  "items": [
    { "product_id": "…", "quantity": 21, "unit_price": 1500 }
  ],
  "notes": "Call before delivery"
}
```

---

## 10. Response examples

### 10.1 `OrderOut`
```json
{
  "id": "…",
  "patient_id": "…",
  "pharmacy_id": "…",
  "prescription_id": "…",
  "status": "PENDING",
  "payment_status": "UNPAID",
  "subtotal": 31500,
  "delivery_fee": 1000,
  "total_amount": 32500,
  "items": [
    { "product_id": "…", "medicine_name": "Amoxicillin 500mg", "quantity": 21, "unit_price": 1500, "subtotal": 31500 }
  ],
  "created_at": "2026-05-23T10:30:00Z"
}
```

### 10.2 `NotificationOut`
```json
{
  "id": "…",
  "user_id": "…",
  "category": "ORDER",
  "title": "Order received",
  "body": "Your order ORD-1234 has been received by Kigali City Pharmacy.",
  "data": { "order_id": "…" },
  "status": "UNREAD",
  "created_at": "..."
}
```

---

## 11. Portal usage notes

| Portal | Key endpoints | Special notes |
|---|---|---|
| Patient | `/auth/*`, `/users/me`, `/patients/me/*`, `/recommendations`, `/orders`, `/notifications`, `/articles` | Most complete portal today. Has trailing-slash logic. |
| Doctor | `/auth`, `/doctors/me`, `/doctors/me/prescriptions`, `/doctors/me/patients`, `/listings/?product_id=…` for availability lookup | Should not call pharmacy-owner endpoints |
| Hospital | `/auth`, `/hospitals/{id}`, `/hospitals/{id}/doctors`, `/hospitals/{id}/departments` | Hospital admin's profile points to one hospital; reads via id |
| Pharmacist | `/auth`, `/pharmacists/me`, `/prescriptions/?status=PENDING_REVIEW`, `/product-requests/*`, `/articles/admin/all` | Required role for article authorship |
| Pharmacy | `/pharmacies/me/*` (listings, orders, revenue, withdrawals) | Owner-scoped automatically by `pharmacy_admin@…` user |
| Partner | symmetric `/partners/me/*` | Partner companies behave like pharmacies for listings/orders |
| Super-admin | `/admin/*`, `/analytics/admin`, `/users/`, `/products/`, `/hospitals/`, `/withdrawals/`, `/revenue/` | Most endpoints are SUPER_ADMIN-gated |
| Rider (Flutter) | `/riders/me*`, `/deliveries/*` | Use Dio; tokens in shared_preferences |

---

## 12. Versioning

- All routes are prefixed `/api/v1/`.
- Breaking changes will go to `/api/v2/` if/when introduced.
- Until then, contract is additive only.
