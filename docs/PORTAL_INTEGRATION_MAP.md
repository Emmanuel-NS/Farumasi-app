# FARUMASI — Portal Integration Map

> Per-portal mapping of UI surface → backend endpoint.
> Use this map together with `API_CONTRACT.md` and the shared API client at [farumasi_shared/lib/api/](../farumasi_shared/lib/api/).

Legend
- ✅ wired
- ⚠ partially wired
- ❌ not wired (uses mock)
- 🔁 currently has its own copy of `lib/api.ts` (planned migration to shared client)

---

## 1. Patient portal — [farumasi_patient_portal/](../farumasi_patient_portal/)

Storage prefix: `farumasi_patient_` (legacy: `farumasi_access_token`, `farumasi_refresh_token`).  
Status: 🔁 local `lib/api.ts`, most services already wired.

| UI surface | Endpoint | Status |
|---|---|---|
| Auth (login/register) | `POST /auth/login`, `POST /auth/register`, `POST /auth/refresh` | ✅ |
| Profile (read/update) | `GET|PUT /patients/me` + `GET /users/me` | ✅ |
| Addresses | `GET|POST /patients/me/addresses`, `PATCH|DELETE /patients/me/addresses/{id}` | ✅ |
| List prescriptions | `GET /patients/me/prescriptions` | ✅ |
| Upload prescription | `POST /patients/me/prescriptions` (multipart) | ⚠ (verify upload component) |
| Get recommendations | `POST /patients/me/recommendations` | ✅ |
| Create order | `POST /patients/me/orders` | ✅ |
| List my orders | `GET /patients/me/orders` | ✅ |
| Track delivery (QR / status) | `GET /deliveries/{id}` + `GET /deliveries/{id}/timer` | ⚠ |
| Notifications list / read | `GET /notifications`, `PATCH /notifications/{id}/read`, `PATCH /notifications/read-all` | ✅ |
| Unread badge | `GET /notifications/unread-count` | ✅ |
| Health articles (public) | `GET /articles/`, `GET /articles/slug/{slug}` | ⚠ (article reader exists; ensure backend URL) |
| Insurance providers (dropdown) | `GET /insurance-providers/` | ⚠ |

---

## 2. Doctor portal — [farumasi_doctor_portal/](../farumasi_doctor_portal/)

Storage prefix: `farumasi_doctor_`.  
Status: 🔁 local `lib/api.ts`, 3 services (`auth`, `patients`, `prescriptions`).

| UI surface | Endpoint | Status |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh` | ✅ |
| Doctor profile | `GET|PUT /doctors/me` | ✅ |
| Patients lookup | `GET /doctors/me/patients` *(or by id)* | ⚠ |
| Create digital prescription | `POST /doctors/me/prescriptions` | ✅ |
| My prescriptions | `GET /doctors/me/prescriptions` | ✅ |
| Medicine availability (before prescribing) | `GET /listings/?product_id=…&latitude=…&longitude=…` | ❌ |
| Product catalogue search | `GET /products/?q=…&status=APPROVED` | ❌ |
| Patient recommendations (for handoff link) | `POST /patients/me/recommendations` *(server-side via doctor → patient flow)* | ❌ (not needed if doctor only generates prescription) |
| Notifications | `GET /notifications`, badge | ❌ |
| Consultations (chat) | `/consultations/*` | ❌ |

---

## 3. Hospital portal — [farumasi_hospital_portal/](../farumasi_hospital_portal/)

Storage prefix: `farumasi_hospital_`.  
Status: ❌ NO API client today. All mock.

| UI surface | Endpoint | Status |
|---|---|---|
| Auth | `POST /auth/login` | ❌ |
| Hospital profile (read) | `GET /hospitals/{id}` | ❌ |
| List doctors | `GET /hospitals/{id}/doctors` | ❌ |
| Invite/create doctor | `POST /hospitals/{id}/doctors` | ❌ |
| Toggle doctor status (activate/suspend) | `PATCH /hospitals/{id}/doctors/{doctor_id}/status` | ❌ |
| Departments | `GET|POST /hospitals/{id}/departments` | ❌ |
| Hospital admins | `GET /hospitals/{id}/admins` | ❌ |
| Notifications | `/notifications/*` | ❌ |

*Convention:* hospital admin's `User` row exposes `hospital_id` via `/users/me` extra field or `/hospitals/{id}/admins` lookup. Until a dedicated `/hospitals/me` shortcut is added, frontends resolve hospital id from `/users/me` profile claim or by listing `/hospitals/{hospital_id}/admins` matching the current user.

---

## 4. Pharmacist portal — [farumasi_pharmacist_portal/](../farumasi_pharmacist_portal/)

Storage prefix: `farumasi_pharmacist_`.  
Status: 🔁 local `lib/api.ts` + auth service only.

| UI surface | Endpoint | Status |
|---|---|---|
| Auth | `POST /auth/login`, `POST /auth/refresh` | ✅ |
| Pharmacist profile | `GET|PUT /pharmacists/me` | ⚠ |
| Prescription review queue | `GET /prescriptions/?status=PENDING_REVIEW` | ❌ |
| Approve / reject / clarify | `PATCH /prescriptions/{id}` | ❌ |
| Product catalogue browse | `GET /products/` | ❌ |
| Product requests (propose new product) | `GET|POST /product-requests/`, `PATCH /product-requests/{id}/submit` | ❌ |
| Health articles (author) | `GET /articles/admin/all`, `POST /articles/`, `PATCH /articles/{id}`, publish/archive/delete | ❌ |
| Notifications | `/notifications/*` | ❌ |

---

## 5. Pharmacy / Partner portal — [farumasi_partner_portal/](../farumasi_partner_portal/)

This single Next.js app serves both `PHARMACY_ADMIN` and `PARTNER_COMPANY_ADMIN` roles; the active mode is selected by user role at login.

Storage prefix: `farumasi_pharmacy_` (or `farumasi_partner_`).  
Status: ❌ NO API client today.

Pharmacy mode (`/pharmacies/me/*`):
| UI surface | Endpoint | Status |
|---|---|---|
| Auth | `POST /auth/login` | ❌ |
| Business profile | `GET|PATCH /pharmacies/me` (create via `POST /pharmacies/`) | ❌ |
| Listings | `GET|POST /pharmacies/me/listings`, `PATCH /listings/{id}`, `PATCH /listings/{id}/availability`, `DELETE /listings/{id}` | ❌ |
| Product requests | `GET|POST /product-requests/`, `PATCH /product-requests/{id}` | ❌ |
| Orders inbox | `GET /pharmacies/me/orders` | ❌ |
| Update order status | `PATCH /pharmacies/me/orders/{id}/status` | ❌ |
| Revenue list + summary | `GET /pharmacies/me/revenue`, `GET /pharmacies/me/revenue/summary` | ❌ |
| Withdrawals | `GET|POST /pharmacies/me/withdrawals` | ❌ |
| Notifications | `/notifications/*` | ❌ |

Partner mode mirrors the above under `/partners/me/*`.

---

## 6. Rider (Flutter mono-app) — [lib/](../lib/)

Storage: `shared_preferences` keys `farumasi_access_token` / `farumasi_refresh_token`.  
Status: ✅ base API client present (`FarumasiApiClient`). Repositories exist for auth/medicine/order/prescription/pharmacy — **rider/delivery repository missing.**

| UI surface | Endpoint | Status |
|---|---|---|
| Auth | `POST /auth/login` | ✅ |
| Rider profile | `GET|PUT /riders/me` | ❌ |
| Availability toggle | `PATCH /riders/me/availability` | ❌ |
| Assigned deliveries | `GET /riders/me/deliveries`, `GET /riders/me/deliveries/active` | ❌ |
| Accept / reject | `PATCH /riders/me/deliveries/{id}/accept`, `…/reject` | ❌ |
| Status updates (picked_up / in_transit / delivered) | `PATCH /riders/me/deliveries/{id}/status` | ❌ |
| QR confirmation | `POST /riders/me/deliveries/{id}/confirm-qr` | ❌ |
| Earnings | `GET /riders/me/earnings` | ❌ |

**Action item:** add `RiderRepository` and `DeliveryRepository` to [lib/api/repositories/](../lib/api/repositories/) (see Flutter section in Phase 10 implementation plan).

---

## 7. Super-admin portal — [farumasi_super_admin/](../farumasi_super_admin/)

Storage prefix: `farumasi_admin_`.  
Status: ❌ NO API client today. ~40 subroutes all mock.

Mapping per route group (top priorities highlighted):
| Route | Endpoint | Priority |
|---|---|---|
| `/dashboard` | `GET /analytics/admin`, `GET /admin/profiles/overview` | P0 |
| `/users` | `GET /users/`, `PATCH /users/{id}/status` | P0 |
| `/products`, `/catalogue` | `GET|POST|PATCH /products/`, `PATCH /products/{id}/status` | P0 |
| `/pharmacists`, `/pharmacies`, `/hospitals`, `/doctors` | role-list endpoints | P0 |
| `/orders` | `GET /orders/pharmacy/all` | P1 |
| `/payouts`, `/withdrawals` | `GET /withdrawals/`, `POST|PATCH /withdrawals/{id}/approve|reject|mark-paid` | P1 |
| `/revenue`, `/financial-analytics`, `/commissions` | `GET /revenue/`, `GET /revenue/summary` | P1 |
| `/listings` | `GET /listings/` | P1 |
| `/notifications` | `/notifications/*` + `POST /notifications/admin/broadcast` | P1 |
| `/audit` | `GET /admin/audit-logs/*` | P1 |
| `/product-requests`, `/verification`, `/compliance` | `GET /product-requests/`, `PATCH /product-requests/{id}/review` | P1 |
| `/insurance` | `GET|POST|PATCH /insurance-providers/` | P1 |
| `/integrations`, `/forecasting`, `/predictions`, `/ai-insights`, `/bi`, `/feature-flags`, `/intelligence`, `/system-monitoring`, etc. | not backed by API yet → keep mock | P2 |

---

## 8. Cross-portal patterns

- **Auth provider** — each portal mounts a thin auth context that calls `/users/me` after login and stores `{ user, role }`. Role drives sidebar/navigation visibility.
- **Layout guards** — `(portal)/layout.tsx` in each portal calls `/users/me` server- or client-side and redirects to `/login` if 401.
- **Error toasts** — surface `error.response.data.detail` (string or list). The shared client normalizes both shapes (see [client.ts](../farumasi_shared/lib/api/client.ts)).
- **Mock fallback** — wrap each service in a check: `if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return mockX;` (See `MOCK_DATA_REPLACEMENT_PLAN.md`).
