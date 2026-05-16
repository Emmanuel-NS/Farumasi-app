# FARUMASI — Technical Architecture & Engineering Strategy

> **Status:** Pre-MVP | Version 0.1  
> **Lead:** AI Engineering Lead  
> **Date:** May 2026

---

## 1. Codebase Audit Summary

### What exists and is worth preserving

| Area | Status | Assessment |
|---|---|---|
| Flutter patient UI | ✅ Solid | Home, store, cart, checkout, orders, tracking, prescription upload, pharmacy search, chat, profile, settings |
| Flutter pharmacist dashboard | ✅ Solid | Overview, requests, orders, inventory, fleet, audit logs, settings — responsive sidebar |
| Flutter rider dashboard | ✅ Good | Bottom nav: dashboard, earnings, history, account |
| Domain models (`models.dart`) | ✅ Rich | Medicine, PrescriptionOrder, OrderStatus enum, CartItem, MarketingPharmacy, AgeDosage — well-structured |
| Healthcare theme | ✅ Keep | Green `#1E9E68` + white — clean, calm, on-brand |
| Responsive wrapper | ✅ Keep | `responsive_web_wrapper.dart` already exists |
| Notification service | ✅ Keep | `flutter_local_notifications` already wired |
| Flutter packages | ✅ Good | `fl_chart`, `flutter_map`, `geolocator`, `flutter_quill`, `table_calendar`, `intl` |

### Critical Weaknesses Found

| Weakness | Severity | Fix |
|---|---|---|
| All data is hardcoded in `dummy_data.dart` and `pharmacist_service.dart` | 🔴 Critical | Replace with real API service layer |
| Auth is hardcoded role-switching with plain text credentials | 🔴 Critical | Supabase Auth + JWT + RBAC |
| SSL bypass active in `main.dart` (security vulnerability) | 🔴 Critical | Remove for production, use proper certs |
| No router — raw `Navigator.push` throughout | 🟠 High | Add `go_router` |
| State management is bare ChangeNotifier singletons — no DI | 🟠 High | Migrate to Riverpod |
| No API abstraction layer | 🟠 High | Add repository pattern + Dio interceptors |
| React marketing site is buried in `lib/screens/pharmacist/epharma/` | 🟠 High | Move to `farumasi_landing/` at repo root |
| All models in one file (`models.dart`) | 🟡 Medium | Split into domain model files |
| No environment configuration | 🟡 Medium | Add `--dart-define` env config |
| `farumasi_web_app/` sub-project is essentially empty | 🟡 Medium | Merge into main app or remove |

---

## 2. Architecture Decision: Flutter Web vs Next.js

**Decision: Stay Flutter for all client apps at MVP stage.**

Rationale:
- Pharmacist dashboard is already substantially built in Flutter with a working responsive sidebar
- Pharmacist portal is B2B — not SEO-critical, so SSR/Next.js gains are minimal
- Rebuilding in Next.js would waste 3–4 weeks of existing momentum
- Flutter web is sufficient for a B2B dashboard with `ConstrainedBox(maxWidth: 1100)`

**Single exception: Marketing site**  
The React/Vite/Tailwind site (`epharma/`) is already built and should remain React. Move it to `farumasi_landing/` at the repo root.

**Future (post-MVP):** If the admin analytics dashboard needs heavy SEO or public-facing content, Next.js can be introduced as a new package — the NestJS API will serve both.

---

## 3. Monorepo Structure

```
farumasi/                          ← Git repository root
│
├── farumasi_app/                  ← Flutter: Patient + Pharmacist + Rider apps (existing)
│   ├── lib/
│   │   ├── core/                  ← NEW: router, theme, env, DI
│   │   ├── features/              ← NEW: feature-first organization
│   │   │   ├── auth/
│   │   │   ├── patient/
│   │   │   ├── pharmacist/
│   │   │   ├── rider/
│   │   │   └── shared/
│   │   ├── data/                  ← models + repositories + API clients
│   │   └── main.dart
│   └── pubspec.yaml
│
├── farumasi_backend/              ← NEW: NestJS API
│   ├── src/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── medicines/
│   │   ├── pharmacies/
│   │   ├── prescriptions/
│   │   ├── orders/
│   │   ├── riders/
│   │   ├── recommendations/       ← Phase 1 smart matching
│   │   ├── notifications/
│   │   └── admin/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── farumasi_landing/              ← MOVED: React/Vite marketing site
│   ├── src/
│   └── package.json
│
└── docs/                          ← Architecture docs, API specs
    └── ARCHITECTURE.md
```

---

## 4. Backend Architecture (NestJS)

### Stack
- **Runtime:** Node.js 20 LTS
- **Framework:** NestJS 10
- **ORM:** Prisma 5
- **Database:** PostgreSQL 16
- **Auth:** Supabase Auth (email/password + phone OTP for Rwanda)
- **Storage:** Supabase Storage (prescription images, profile photos)
- **Cache:** Redis (for pharmacy recommendation scoring cache)
- **Queue:** BullMQ (for order notifications, async matching)
- **Validation:** class-validator + class-transformer

### Module Map

```
auth/          → JWT guards, Supabase Auth sync, RBAC decorators
users/         → User CRUD, role management
patients/      → Patient profile, medical history, insurance
doctors/       → Doctor profile, license verification
pharmacies/    → Pharmacy CRUD, verification, operating hours, location
pharmacists/   → Pharmacist profiles linked to pharmacies
medicines/     → Medicine catalog, categories
inventory/     → Pharmacy ↔ Medicine stock, prices, expiry tracking
prescriptions/ → Prescription lifecycle, digital + image upload
orders/        → Order state machine (8-stage workflow)
riders/        → Rider profiles, availability, assigned deliveries
deliveries/    → Delivery tracking, GPS updates
recommendations/ → Smart pharmacy matching engine (Phase 1 AI)
notifications/ → Push notifications (FCM), in-app
admin/         → System management, analytics
```

### API Design
- REST for all CRUD
- WebSocket (Socket.IO) for real-time order tracking and chat
- Versioned: `/api/v1/...`
- Auth header: `Authorization: Bearer <jwt>`

---

## 5. PostgreSQL Schema (Prisma)

### Core tables

```
users           → id, supabase_id, email, phone, role, name, avatar_url, created_at
patients        → id, user_id, national_id, date_of_birth, blood_type, insurance_provider, insurance_number
doctors         → id, user_id, license_number, specialty, hospital_affiliation, is_verified
pharmacies      → id, name, address, city, latitude, longitude, phone, email, operating_hours, insurance_accepted[], is_verified, is_active
pharmacists     → id, user_id, pharmacy_id, license_number, is_admin
medicines       → id, name, generic_name, description, category, requires_prescription, image_url, manufacturer
inventory       → id, pharmacy_id, medicine_id, quantity, price, expiry_date, is_published, updated_at
prescriptions   → id, patient_id, doctor_id (nullable), image_url, digital_data (JSON), status, issued_at, expires_at
prescription_items → id, prescription_id, medicine_name, quantity, dosage_instructions, age_range
orders          → id, patient_id, prescription_id (nullable), pharmacy_id, rider_id, status, pharmacy_price, delivery_fee, payment_id, created_at
order_items     → id, order_id, medicine_id, medicine_name, quantity, unit_price
riders          → id, user_id, vehicle_type, license_plate, is_available, current_latitude, current_longitude
deliveries      → id, order_id, rider_id, pickup_address, delivery_address, status, started_at, delivered_at
notifications   → id, user_id, title, body, type, data (JSON), is_read, created_at
health_posts    → id, pharmacist_id, title, content, image_url, published_at
```

### Key relationships
- `users` → `patients` / `doctors` / `pharmacists` / `riders` (1:1 per role)
- `pharmacists` → `pharmacies` (many:1)
- `inventory` = junction of `pharmacies` × `medicines` with stock data
- `orders` → full lifecycle with prescription, pharmacy, rider refs
- `prescriptions` can be digital (doctor-issued) or image-upload (patient-uploaded)

---

## 6. Authentication & RBAC

### Roles
```
PATIENT          → can browse, order, upload prescriptions, track
DOCTOR           → can write digital prescriptions, view medicine availability
PHARMACIST       → can manage inventory, fulfill orders, manage delivery
PHARMACY_ADMIN   → full pharmacy management + pharmacist management
RIDER            → can view/update assigned deliveries
SUPER_ADMIN      → full system access
```

### Flow
1. User registers/logs in via Supabase Auth → gets Supabase JWT
2. Flutter sends JWT to NestJS `/auth/sync` → NestJS creates/updates user record
3. NestJS returns its own signed JWT with `{ userId, role, pharmacyId? }`
4. All subsequent API calls use NestJS JWT
5. NestJS guards check role before each protected route

---

## 7. Phase 1 AI: Smart Pharmacy Matching

**Goal:** Recommend the best pharmacy for a prescription/order.

### Scoring algorithm (weighted)

```
total_score = (
  availability_score  × 0.40   // does pharmacy have all items in stock?
  + distance_score    × 0.30   // normalized 0–1 from max distance
  + insurance_score   × 0.20   // RSSB/MMI/MUTUELLE accepted?
  + delivery_score    × 0.10   // has available rider?
)
```

### Implementation
- Computed server-side in `recommendations/` module
- Input: `{ medicines[], patientLat, patientLng, insuranceProvider }`
- Output: ranked list of pharmacies with scores + reasons
- Cached in Redis for 5 minutes per medicine set + location cell (geohash)
- No ML at this stage — pure weighted scoring

---

## 8. Flutter App Refactoring Plan

### What to preserve (touch only to upgrade)
- All screen widgets — keep UI as-is
- `AppTheme` — extend but do not redesign
- Medicine, PrescriptionOrder, OrderStatus models — add `fromJson`/`toJson`
- `flutter_quill`, `fl_chart`, `flutter_map` dependencies — keep

### What to add
1. **`go_router`** — replace raw `Navigator.push`, add named routes, deep-linking
2. **Riverpod** — replace ChangeNotifier singletons; providers per feature
3. **Dio + interceptors** — HTTP client with JWT auto-attach, refresh, error handling
4. **Repository pattern** — `AuthRepository`, `MedicineRepository`, `OrderRepository`, etc.
5. **`flutter_secure_storage`** — store JWT token securely
6. **`--dart-define`** — environment variables (API URL, Supabase keys)
7. **Feature-first structure** — `features/auth/`, `features/patient/`, `features/pharmacist/`

### What to remove/fix
- SSL bypass in `main.dart` — remove for production builds
- Hardcoded credentials in `auth_screen.dart` — replace with real auth
- `dummy_data.dart` as primary data source — keep as offline fallback only, not primary
- Single `models.dart` file — split per domain

---

## 9. PWA Support

- Flutter web already supports PWA out of the box
- `web/manifest.json` exists — update with FARUMASI branding and icons
- `web/index.html` — add service worker registration
- Add `offline_first` caching strategy for medicine catalog and past orders

---

## 10. MVP Roadmap (4 Weeks)

### Week 1 — Backend Foundation
- [ ] Initialize NestJS project (`farumasi_backend/`)
- [ ] Set up Prisma + PostgreSQL (local Docker + Supabase for production)
- [ ] Create full schema migration
- [ ] Auth module: Supabase Auth sync, JWT issuance, RBAC guards
- [ ] Users module: profile CRUD
- [ ] Medicines module: catalog CRUD + search
- [ ] Pharmacies module: CRUD + geo search

### Week 2 — Core Workflow APIs
- [ ] Inventory module: stock management, expiry tracking
- [ ] Prescriptions module: upload to Supabase Storage, status lifecycle
- [ ] Orders module: full 8-stage state machine
- [ ] Recommendations module: pharmacy matching scoring
- [ ] Notifications: FCM integration

### Week 3 — Flutter Integration
- [ ] Add `go_router` + named routes
- [ ] Add Riverpod + feature-first structure
- [ ] Add Dio service with JWT interceptors
- [ ] Replace mock auth with real Supabase Auth
- [ ] Connect prescription upload to real Supabase Storage
- [ ] Connect medicine store to real API
- [ ] Connect pharmacist dashboard to real orders API
- [ ] Connect rider dashboard to real delivery API

### Week 4 — Polish & Launch Prep
- [ ] Order tracking with WebSocket
- [ ] Push notifications end-to-end
- [ ] PWA manifest + service worker
- [ ] Environment configs (dev / staging / prod)
- [ ] Move React landing site to `farumasi_landing/`
- [ ] Basic CI/CD (GitHub Actions)
- [ ] Deployment: Railway or Render for backend, Supabase for DB/Auth/Storage

---

## 11. Infrastructure (Startup-friendly)

| Service | Provider | Reason |
|---|---|---|
| Backend hosting | Railway or Render | Zero-ops, Git deploy, free tier available |
| Database | Supabase PostgreSQL | Managed, generous free tier, integrates with Auth |
| Auth | Supabase Auth | Phone OTP (critical for Rwanda), email, social |
| Storage | Supabase Storage | Prescription images, profile photos |
| Flutter Web hosting | Firebase Hosting or Vercel | Fast CDN, simple deploy |
| Push notifications | Firebase Cloud Messaging | Free, cross-platform |
| Monitoring | Sentry | Free tier, Flutter + Node SDKs |

---

## 12. Security Considerations (OWASP)

- Remove SSL bypass before any production build
- All secrets via environment variables — never commit to Git
- Rate limiting on auth endpoints (NestJS `@nestjs/throttler`)
- Input validation with `class-validator` on all DTOs
- SQL injection protected by Prisma ORM (parameterized queries)
- JWT short expiry (15min) + refresh token rotation
- Supabase RLS policies as a secondary defense layer
- Prescription images stored in private Supabase Storage bucket (signed URLs only)

---

*This document is a living artifact. Update as decisions evolve.*
