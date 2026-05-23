# FARUMASI — Phase 10 Integration Readiness Audit

**Date:** 2026-05-23  
**Author:** Integration Architect  
**Scope:** Read-only audit. No code changed.  
**Goal:** Determine whether FARUMASI is ready for full frontend ↔ backend integration and produce a safe execution plan for Phase 10.

---

## 0. Executive summary

| Area | Status | Verdict |
|---|---|---|
| Backend API surface | 176 routes, 122 OpenAPI paths, 161 tests passing | ✅ Ready |
| Backend auth & RBAC | JWT access+refresh, 11 roles, `require_*` deps | ✅ Ready |
| Seed / demo accounts | `scripts/seed.py` exists, covers all roles | ⚠ Partial — needs finance/operations/compliance admin |
| Next.js portals (6) | All scaffolded, all use `axios`, all have mock data | ⚠ Mixed — patient + doctor + pharmacist have API client stubs; partner, hospital, super-admin do NOT |
| Flutter patient/rider app | Single `lib/` mono-app, Dio + Riverpod, 5 repositories | ⚠ Partial — base URL hard-coded to `localhost:3001`, must match FastAPI port |
| Cross-portal API client | None shared. Each Next.js portal has its own copy of `api.ts` | ⚠ Duplication risk |
| API contract docs | None present at `docs/` (no `docs/` folder) | ❌ Missing |
| Mock-data replacement plan | None | ❌ Missing |
| E2E workflow test plan | None | ❌ Missing |
| Backend regression | All 161 tests green (24 phase-9 + 137 prior) | ✅ Green |

**Conclusion:** The backend is integration-ready. The bottleneck is **frontend gaps** (3 portals have no API client, no shared contract docs, no mock-replacement map). Phase 10 should focus 80% on frontend wiring and documentation, **not** on new backend features.

---

## 1. Backend API readiness

### 1.1 Boot & contract
- Entry: [farumasi_api/app/main.py](farumasi_api/app/main.py) — `create_application()` wires CORS, exception handlers, lifespan DB ping.
- Router: [farumasi_api/app/api/v1/router.py](farumasi_api/app/api/v1/router.py) — Phase 1 marked STABLE; Phase 2+ marked `(experimental)`.
- OpenAPI: `/api/v1/openapi.json`, Swagger UI: `/api/v1/docs`, ReDoc: `/api/v1/redoc`.
- Counts: **176 routes**, **122 OpenAPI paths**.

### 1.2 Endpoint groups (audited from [farumasi_api/app/api/v1/endpoints/](farumasi_api/app/api/v1/endpoints/))

| Group | File | Notes |
|---|---|---|
| Auth | [auth.py](farumasi_api/app/api/v1/endpoints/auth.py) | `/auth/register`, `/auth/login`, `/auth/refresh` |
| Users | [users.py](farumasi_api/app/api/v1/endpoints/users.py) | `/users/me`, `/users/{id}`, list (super-admin) |
| Patients | [patients.py](farumasi_api/app/api/v1/endpoints/patients.py) | `/me`, addresses, prescriptions, orders, recommendations |
| Doctors | [doctors.py](farumasi_api/app/api/v1/endpoints/doctors.py) | `/me`, `/me/prescriptions`, `/me/patients` |
| Hospitals | [hospitals.py](farumasi_api/app/api/v1/endpoints/hospitals.py) | CRUD, departments, doctors-of-hospital, status |
| Pharmacists | [pharmacists.py](farumasi_api/app/api/v1/endpoints/pharmacists.py) | `/me`, prescription review, reviews |
| Pharmacies | [pharmacies.py](farumasi_api/app/api/v1/endpoints/pharmacies.py) | `/me`, listings, orders, revenue, withdrawals |
| Partners | [partners.py](farumasi_api/app/api/v1/endpoints/partners.py) | Symmetric to pharmacies |
| Riders | [riders.py](farumasi_api/app/api/v1/endpoints/riders.py) | `/me`, deliveries, availability, earnings, QR confirm |
| Products | [products.py](farumasi_api/app/api/v1/endpoints/products.py) | Catalogue CRUD, approval status |
| Product Requests | [product_requests.py](farumasi_api/app/api/v1/endpoints/product_requests.py) | Submit / review flow |
| Listings | [listings.py](farumasi_api/app/api/v1/endpoints/listings.py) | Public + admin |
| Insurance | [insurance.py](farumasi_api/app/api/v1/endpoints/insurance.py) | Insurance providers |
| Prescriptions | [prescriptions.py](farumasi_api/app/api/v1/endpoints/prescriptions.py) | Create, items, review |
| Recommendations | [recommendations.py](farumasi_api/app/api/v1/endpoints/recommendations.py) | Top-3 pharmacies, explainability |
| Orders | [orders.py](farumasi_api/app/api/v1/endpoints/orders.py) | CRUD + status + payment placeholder |
| Deliveries | [deliveries.py](farumasi_api/app/api/v1/endpoints/deliveries.py) | Assign, accept/reject, status, QR confirm, timer |
| Revenue | [revenue.py](farumasi_api/app/api/v1/endpoints/revenue.py) | Summary, list, scoped views |
| Withdrawals | [withdrawals.py](farumasi_api/app/api/v1/endpoints/withdrawals.py) | Request, approve, reject, mark-paid |
| Articles | [articles.py](farumasi_api/app/api/v1/endpoints/articles.py) | Public read, admin manage (Phase 9.2) |
| Notifications | [notifications.py](farumasi_api/app/api/v1/endpoints/notifications.py) | List, read, unread-count, admin broadcast |
| Audit | [admin.py](farumasi_api/app/api/v1/endpoints/admin.py) | Audit log read (Phase 9.1) |
| Analytics | [analytics.py](farumasi_api/app/api/v1/endpoints/analytics.py) | Admin summary, pharmacy stats |
| Uploads | [uploads.py](farumasi_api/app/api/v1/endpoints/uploads.py) | image, document, prescription |
| Consultations | [consultations.py](farumasi_api/app/api/v1/endpoints/consultations.py) | Doctor-patient chat |

### 1.3 RBAC
- Constants: `UserRole` ∈ {SUPER_ADMIN, OPERATIONS_ADMIN, FINANCE_ADMIN, COMPLIANCE_ADMIN, PHARMACIST, PHARMACY_ADMIN, PARTNER_COMPANY_ADMIN, PATIENT, DOCTOR, RIDER, HOSPITAL_ADMIN}.
- Dependencies in [farumasi_api/app/dependencies/roles.py](farumasi_api/app/dependencies/roles.py): `require_super_admin`, `require_finance`, `require_audit_reader`, `require_roles(...)`.

### 1.4 Env & config
- [farumasi_api/.env.example](farumasi_api/.env.example) — covers DB, JWT, CORS, Redis, commission rate, file storage.
- CORS allows ports `3000–3005` (sufficient for 6 Next.js portals).

### 1.5 Tests
- 161 passing, 0 failing, ~5 min full suite.
- Coverage: phases 1–9 all green.

**Verdict: Backend is contract-stable. Safe to wire frontends.**

---

## 2. Frontend project readiness

### 2.1 Workspace map

| Workspace | Port (dev) | Tech | Notes |
|---|---|---|---|
| [farumasi_patient_portal/](farumasi_patient_portal/) | 3002 | Next.js 16 + TS + axios + zustand | Most advanced |
| [farumasi_doctor_portal/](farumasi_doctor_portal/) | n/a | Next.js + TS | Has `lib/api.ts` + 3 services |
| [farumasi_hospital_portal/](farumasi_hospital_portal/) | n/a | Next.js | **No API client** |
| [farumasi_pharmacist_portal/](farumasi_pharmacist_portal/) | n/a | Next.js | Has `lib/api.ts` + auth.service only |
| [farumasi_partner_portal/](farumasi_partner_portal/) | n/a | Next.js | **No API client** (only `toast.ts`, `utils.ts`) |
| [farumasi_super_admin/](farumasi_super_admin/) | n/a | Next.js | **No API client** (only `utils.ts`); ~40 mock routes |
| [lib/](lib/) (Flutter mono-app) | n/a | Flutter + Dio + Riverpod | Patient + Rider screens in same app |
| [farumasi_shared/](farumasi_shared/) | n/a | TS package | Mock data + shared types only — no API code |

### 2.2 Existing API client coverage (Next.js)

| Portal | `lib/api.ts` | Service modules | Auth refresh | Token key |
|---|---|---|---|---|
| patient | ✅ axios + interceptors + refresh + redirect-slash heuristics | 7 services | ✅ | `farumasi_access_token` |
| doctor | ✅ axios + interceptors + refresh | 3 services (`auth`, `patients`, `prescriptions`) | ✅ | `farumasi_doctor_token` |
| pharmacist | ✅ axios | 1 service (`auth`) | partial | `farumasi_pharmacist_token` (assumed) |
| hospital | ❌ | — | — | — |
| partner | ❌ | — | — | — |
| super-admin | ❌ | — | — | — |

**Gap:** 3 of 6 portals have zero API integration. Patient + doctor + pharmacist have inconsistent token-key naming and duplicated logic.

### 2.3 Mock data inventory

| Portal | Mock file(s) | Approx scope |
|---|---|---|
| patient | [farumasi_patient_portal/src/data/mock.ts](farumasi_patient_portal/src/data/mock.ts), [mock-i18n.ts](farumasi_patient_portal/src/data/mock-i18n.ts) | prescriptions, pharmacies, orders |
| doctor | [farumasi_doctor_portal/src/data/mock/index.ts](farumasi_doctor_portal/src/data/mock/index.ts) | doctor, patients, medicines, pharmacies, notes |
| hospital | [farumasi_hospital_portal/src/data/mock/index.ts](farumasi_hospital_portal/src/data/mock/index.ts) | doctors, departments, oversight |
| pharmacist | [farumasi_pharmacist_portal/src/data/mock.ts](farumasi_pharmacist_portal/src/data/mock.ts) | prescriptions, product requests, articles |
| partner | [farumasi_partner_portal/src/data/mock/index.ts](farumasi_partner_portal/src/data/mock/index.ts) | business, products, listings, orders, revenue |
| super-admin | [farumasi_super_admin/src/data/mock.ts](farumasi_super_admin/src/data/mock.ts) | ~40 admin sections |
| shared | [farumasi_shared/data/](farumasi_shared/data/) | recommendation engine demo, services |

### 2.4 Env files
- patient has `.env.local` (`NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`).
- doctor has `.env.local`.
- pharmacist has `.env.local`.
- hospital, partner, super-admin **do NOT have `.env.local`**.

### 2.5 Auth-protected layouts
All 6 portals use route groups like `(portal)`, `(patient)`, `(pharmacist)` with a `layout.tsx` — good shell for adding a single auth guard.

### 2.6 Flutter app
- Single mono-app at [lib/](lib/) hosting both patient and rider screens ([lib/screens/](lib/screens/) + [lib/screens/rider/](lib/screens/rider/)).
- API: [lib/api/api_client.dart](lib/api/api_client.dart) — Dio singleton, JWT + refresh interceptor, base URL `http://localhost:3001/api/v1` for web / `http://10.0.2.2:3001` for Android.
- Repositories: 5 (auth, medicine, order, prescription, pharmacy).
- **Issue:** Base URL points to **port 3001**, but FastAPI defaults to **port 8000**. Must be reconciled (likely via `--dart-define=API_BASE_URL=http://localhost:8000/api/v1`).

---

## 3. Auth integration gaps

| Item | Status |
|---|---|
| Backend `/auth/login` returns `{access_token, refresh_token, token_type}` | ✅ |
| Backend `/users/me` for current user | ✅ |
| Token refresh endpoint | ✅ |
| Patient portal stores tokens in `localStorage` | ✅ |
| Doctor portal uses different token key (`farumasi_doctor_token`) | ⚠ Per-portal namespacing OK but no shared logic |
| Role-based redirect after login | ❌ Not documented, not implemented uniformly |
| Protected route guard (Next.js middleware or HOC) | ❌ Missing in all portals |
| Handling 403 / account suspended | ❌ |
| Single sign-on across portals (same browser) | ⚠ Each portal isolated by token-key namespace (acceptable choice) |
| Flutter token via `shared_preferences` | ✅ |

---

## 4. Portal-by-portal integration gaps

Brief table per portal. Detailed mapping deferred to `docs/PORTAL_INTEGRATION_MAP.md` (Phase 10 deliverable).

| Portal | Has API client | Has auth | Has services | Mock files | Estimated integration effort |
|---|---|---|---|---|---|
| Patient | ✅ | ✅ | 7 | 2 | **Low** — finish wiring remaining screens |
| Doctor | ✅ | ✅ | 3 | 1 | Medium — needs recommendation, articles |
| Pharmacist | ✅ | partial | 1 | 1 | Medium — needs prescription review, product requests, articles services |
| Hospital | ❌ | ❌ | 0 | 1 | **High** — full stack |
| Partner | ❌ | ❌ | 0 | 1 | **High** — full stack |
| Super-admin | ❌ | ❌ | 0 | 1 | **Highest** — 40+ subroutes, audit, analytics |
| Flutter (Patient + Rider) | ✅ | ✅ | 5 repos | n/a | Low — fix base URL, wire rider features |

---

## 5. Missing endpoint / gap report (preliminary)

Verified against the audit. **No critical backend gap blocks integration.** Minor observations:

| Observation | Impact | Recommendation |
|---|---|---|
| No `GET /auth/me` alias — currently use `/users/me` | Cosmetic | Document `/users/me` as canonical |
| Articles route `GET /admin/all` requires PHARMACIST or SUPER_ADMIN — partner/pharmacy admins can't see articles in their portal | Low — these portals don't list articles in spec | None |
| Rider earnings is placeholder | Spec-confirmed | None |
| Payment is placeholder | Spec-confirmed | Document payment_status transition contract |
| No `GET /hospitals/me` for hospital admin convenience | Medium | Could add `/hospitals/me` shortcut in a future micro-patch; for now hospital admin uses `/hospitals/{id}` with the id from their profile |
| Doctor portal needs **medicine availability lookup** before prescribing | Already covered by `GET /listings/?product_id=…` + recommendations | None |
| Patient `/me/prescriptions` returns non-paginated list while doctor's variant is paginated | Inconsistent | Cosmetic — document both; consider unifying in a later pass |
| Some withdrawal endpoints accept both POST and PATCH | Intentional for backward compat | Document PATCH as canonical |

**No new backend feature work is required to start Phase 10.**

---

## 6. Environment / config gaps

- [ ] hospital, partner, super-admin portals lack `.env.local`.
- [ ] No central `.env.example` for portals.
- [ ] Flutter base URL hard-coded to `localhost:3001`, FastAPI default `8000`.
- [ ] No documented dev startup sequence (which ports, which order).
- [ ] CORS allows 3000–3005 but no portal-to-port mapping is documented.

---

## 7. Recommended Phase 10 deliverables (in order)

| # | Deliverable | Type | Owner | Blocks |
|---|---|---|---|---|
| 1 | `docs/API_CONTRACT.md` | Doc | Architect | Nothing |
| 2 | `docs/PORTAL_INTEGRATION_MAP.md` | Doc | Architect | Nothing |
| 3 | `docs/MOCK_DATA_REPLACEMENT_PLAN.md` | Doc | Architect | (4)–(7) |
| 4 | `docs/DEMO_ACCOUNTS.md` | Doc | Architect | (8) |
| 5 | `docs/E2E_WORKFLOW_TEST_PLAN.md` | Doc | QA | (8) |
| 6 | `docs/MISSING_ENDPOINTS_AND_GAPS.md` | Doc | Architect | — |
| 7 | `docs/AUTH_INTEGRATION_PLAN.md` | Doc | Architect | (9) |
| 8 | Seed expansion: add `finance_admin`, `operations_admin`, `compliance_admin` | Code (seed only) | Backend | (10) |
| 9 | `farumasi_shared/lib/api/` — shared TS client (axios + auth) | Code (no UI) | Frontend | (11)+ |
| 10 | Wire **patient portal** completely (auth → profile → prescriptions → reco → orders → articles) | Code (no UI) | Frontend | None |
| 11 | Add `.env.local` + API client to **partner**, **hospital**, **super-admin** | Code (no UI) | Frontend | (12) |
| 12 | Wire **doctor** + **pharmacist** remaining services | Code (no UI) | Frontend | — |
| 13 | Wire **Flutter rider** delivery flow (base URL fix, accept/reject, QR confirm) | Code (no UI) | Mobile | — |

---

## 8. Recommended shared client architecture

To eliminate the 3× duplication of `api.ts` (patient, doctor, pharmacist) and to unblock hospital/partner/super-admin, propose **one shared TypeScript client** in [farumasi_shared/lib/api/](farumasi_shared/lib/api/) consumed by all 6 portals.

Proposed layout (no UI changes, no portal restructure):

```
farumasi_shared/lib/api/
  client.ts           # axios factory, interceptors, refresh, token storage abstraction
  auth.ts             # login / register / refresh / me
  patients.ts
  doctors.ts
  hospitals.ts
  pharmacists.ts
  pharmacies.ts
  partners.ts
  riders.ts
  products.ts
  listings.ts
  insurance.ts
  prescriptions.ts
  recommendations.ts
  orders.ts
  deliveries.ts
  revenue.ts
  withdrawals.ts
  notifications.ts
  articles.ts
  admin.ts            # audit logs, analytics, profiles overview
  uploads.ts
  consultations.ts
  types.ts            # response/request DTO types matching backend Pydantic schemas
  storage.ts          # per-portal token-key namespace
```

Each portal imports `import { authApi, patientsApi, ... } from "@farumasi/shared/lib/api"` and passes its own `tokenKeyPrefix` (e.g. `farumasi_doctor_`).

Until the shared package is wired, **per-portal `lib/api.ts` is acceptable** as long as we don't add more divergence.

---

## 9. Safe implementation plan (post-approval)

If implementation is approved after this audit:

1. **Step 0 — Write all 6 docs in `docs/`** (no code).
2. **Step 1 — Extend seed** to include the 3 missing admin sub-roles; verify backend tests still pass.
3. **Step 2 — Build shared API client** in `farumasi_shared/`; do NOT touch any portal yet; export typed methods.
4. **Step 3 — Wire patient portal auth** (login, refresh, role-redirect, protected route guard). Verify build + lint + manual smoke test of login.
5. **Step 4 — Wire patient portal first integrated workflow:** login → `/users/me` → `/patients/me/prescriptions` → `POST /patients/me/recommendations` → `POST /patients/me/orders`. Keep mock data in place until each screen is verified.
6. **Step 5 — Add `.env.local` to missing portals** and copy the shared auth guard.
7. **Step 6 — Wire each remaining portal one at a time** in this priority: pharmacy/partner → pharmacist → doctor → hospital → super-admin.
8. **Step 7 — Fix Flutter base URL** via `--dart-define`; verify rider QR confirm flow against backend.
9. **Step 8 — Remove mock data per screen** only after each screen's endpoint is verified end-to-end.
10. **Step 9 — Run backend test suite** after every backend touch (we expect zero backend changes in steps 4–9).

---

## 10. Done-criteria checklist (Phase 10)

- [ ] `docs/API_CONTRACT.md` exists
- [ ] `docs/PORTAL_INTEGRATION_MAP.md` exists
- [ ] `docs/MOCK_DATA_REPLACEMENT_PLAN.md` exists
- [ ] `docs/E2E_WORKFLOW_TEST_PLAN.md` exists
- [ ] `docs/MISSING_ENDPOINTS_AND_GAPS.md` exists
- [ ] `docs/AUTH_INTEGRATION_PLAN.md` exists
- [ ] `docs/DEMO_ACCOUNTS.md` exists
- [ ] Shared Next.js API client exists (in `farumasi_shared/lib/api/`)
- [ ] Flutter API client documented and base-URL fixed
- [ ] At least the patient portal has a safe, partial, verified integration
- [ ] No UI redesign performed
- [ ] No backend regression (`pytest -q` still 161 passed)
- [ ] Backend boots and OpenAPI loads

---

## 11. Decisions required from product owner before Step 1

1. **Token namespace:** keep per-portal token keys (current) or migrate to single SSO cookie?  
   → Recommendation: keep per-portal keys; simpler and matches current behavior.

2. **Shared client location:** [farumasi_shared/](farumasi_shared/) (TS package) vs. duplicate in each portal?  
   → Recommendation: shared package — eliminates current 3× duplication and unblocks 3 portals at once.

3. **Mock-data removal policy:** delete-on-wire vs. keep-as-fallback?  
   → Recommendation: keep mocks behind a `NEXT_PUBLIC_USE_MOCK=true` flag during transition; delete after Phase 10 sign-off.

4. **Demo seed scope:** add 3 admin sub-roles + 1 finance/operations/compliance admin each, or full demo dataset (hospital → doctor → patient → prescription → order → delivery → revenue)?  
   → Recommendation: full demo dataset — required for E2E test plan in §7 (#5).

5. **Flutter:** keep mono-app (patient + rider) or split into two apps?  
   → Recommendation: keep mono-app for Phase 10. Split is out of scope.

---

## Audit conclusion

**Backend:** ready.  
**Frontend:** half-ready. 3 of 6 portals have no integration code at all.  
**Docs:** completely missing.  
**Risk:** low — no backend changes required; integration can proceed without disrupting passing tests.  
**Recommended next action:** approve §7 deliverable list and proceed with **Step 0 (write 6 docs in `docs/`)** before any code.

No code has been modified in this audit.
