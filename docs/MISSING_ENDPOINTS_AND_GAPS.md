# FARUMASI — Missing Endpoints & Integration Gaps

> Only **real** gaps identified during the Phase 10 audit. No speculative endpoints.

For each gap:
- **Affected portal**
- **Current workaround**
- **Priority** (P0 = blocks Phase 10 workflow, P1 = nice-to-have, P2 = future)
- **Recommended fix**
- **Backend or frontend issue**
- **Suggested phase**

---

## G1. No `/hospitals/me` shortcut for hospital admin

- **Affected portal:** farumasi_hospital_portal
- **Current workaround:** call `GET /hospitals/{hospital_id}/admins`, find the admin row matching `users/me.id`, read `hospital_id`. Or: read a future `hospital_id` claim from `/users/me`.
- **Priority:** P1
- **Recommended fix:** add `GET /hospitals/me` that resolves the hospital owned/administered by the authenticated `HOSPITAL_ADMIN`. Backend-only, ~15 lines.
- **Type:** Backend.
- **Suggested phase:** Phase 10.5 (micro-patch) — frontend can integrate hospital portal via the current workaround until then.

## G2. No paginated `/patients/me/prescriptions`

- **Affected portal:** farumasi_patient_portal (long history view)
- **Current workaround:** flat list, slice client-side.
- **Priority:** P2
- **Recommended fix:** unify to `PaginatedResponse[PrescriptionOut]` (consistency with doctor's variant).
- **Type:** Backend (additive).
- **Suggested phase:** Phase 11.

## G3. Doctor portal — medicine availability lookup not yet wired

- **Affected portal:** farumasi_doctor_portal
- **Current workaround:** N/A — endpoint exists (`GET /listings/?product_id=…&latitude=…&longitude=…`), but doctor portal hasn't wired it.
- **Priority:** P1
- **Recommended fix:** add `medicines.service.ts` calling `GET /listings/`. **Frontend only.**
- **Type:** Frontend.
- **Suggested phase:** Phase 10 portal-wiring step.

## G4. Flutter rider repositories missing

- **Affected app:** Flutter mono-app (rider screens)
- **Current workaround:** screens render mock data.
- **Priority:** P0 for rider flow
- **Recommended fix:** add `rider_repository.dart` and `delivery_repository.dart` to [lib/api/repositories/](../lib/api/repositories/). Endpoints already exist.
- **Type:** Frontend (Flutter).
- **Suggested phase:** Phase 10 Flutter step.

## G5. Flutter API client default port is 3001 (backend is 8000)

- **Affected app:** Flutter mono-app
- **Current workaround:** none — requests fail.
- **Priority:** P0
- **Recommended fix:** change default in [lib/api/api_client.dart](../lib/api/api_client.dart) to port `8000`; require `--dart-define=API_BASE_URL=...` for non-default. **Fixed in Phase 10.**
- **Type:** Frontend (Flutter).
- **Suggested phase:** Phase 10 (this commit).

## G6. Flutter refresh token endpoint uses camelCase keys

- **Affected app:** Flutter mono-app
- **Current workaround:** none — refresh fails with `KeyError`.
- **Priority:** P0 (silent — kicks user back to login on each access token expiry)
- **Recommended fix:** the refresh interceptor reads `response.data['accessToken']` but backend returns `access_token` (snake_case). Update keys.
- **Type:** Frontend (Flutter).
- **Suggested phase:** Phase 10 (this commit).

## G7. 3 portals lack any API client or `.env.local`

- **Affected portals:** hospital, partner, super-admin
- **Current workaround:** all mock.
- **Priority:** P0
- **Recommended fix:** shared TS client + per-portal `.env.local`. Shared client foundation delivered in Phase 10.
- **Type:** Frontend.
- **Suggested phase:** Phase 10 (foundation), per-portal wiring follow-up phases.

## G8. Patient + doctor + pharmacist portals each maintain their own `lib/api.ts`

- **Affected portals:** patient, doctor, pharmacist
- **Current workaround:** works, but 3× duplication; refresh logic differs between patient (heuristic trailing slash) and doctor (no heuristic).
- **Priority:** P1
- **Recommended fix:** migrate to shared client over time. Do not rewrite all at once.
- **Type:** Frontend.
- **Suggested phase:** Phase 11.

## G9. No `finance_admin / operations_admin / compliance_admin` demo accounts

- **Affected portal:** farumasi_super_admin
- **Current workaround:** test from a `SUPER_ADMIN` account only.
- **Priority:** P0 (blocks E2E withdrawal/audit testing)
- **Recommended fix:** extend seed. **Fixed in Phase 10.**
- **Type:** Backend (seed-only).
- **Suggested phase:** Phase 10 (this commit).

## G10. Order → payment is a placeholder

- **Affected portal:** patient
- **Current workaround:** `PATCH /orders/{id}/payment-status` accepts manual transitions; no MTN / Airtel / card integration yet.
- **Priority:** P2 (intentional, per spec).
- **Recommended fix:** out of scope for Phase 10.
- **Type:** Backend.
- **Suggested phase:** Phase 12 (payments).

## G11. No webhook / push notifications for rider app

- **Affected:** Flutter rider app.
- **Current workaround:** poll `GET /riders/me/deliveries/active` every 30s.
- **Priority:** P2.
- **Recommended fix:** FCM integration + WebSocket channel. Out of scope for Phase 10.
- **Type:** Backend + frontend.
- **Suggested phase:** Phase 13 (real-time).

## G12. Patient portal needs a "delivery tracking" screen wired to `/deliveries/{id}` + `/timer`

- **Affected portal:** patient.
- **Current workaround:** order details only.
- **Priority:** P1.
- **Recommended fix:** frontend-only.
- **Type:** Frontend.
- **Suggested phase:** Phase 10 portal-wiring step.

---

## Summary

| # | Severity | Type | Resolved in Phase 10? |
|---|---|---|---|
| G1 | P1 | Backend | ⏸ Deferred (workaround exists) |
| G2 | P2 | Backend | ⏸ Deferred |
| G3 | P1 | Frontend | ⏳ During patient/doctor wiring |
| G4 | P0 | Frontend (Flutter) | ⏳ During Flutter wiring |
| G5 | P0 | Frontend (Flutter) | ✅ This commit |
| G6 | P0 | Frontend (Flutter) | ✅ This commit |
| G7 | P0 | Frontend | ✅ Foundation only |
| G8 | P1 | Frontend | ⏸ Deferred |
| G9 | P0 | Backend (seed) | ✅ This commit |
| G10 | P2 | Backend | ⏸ Phase 12 |
| G11 | P2 | Backend + Frontend | ⏸ Phase 13 |
| G12 | P1 | Frontend | ⏳ Patient wiring |

**No backend business-logic changes are required for Phase 10 integration to begin.** Only seed expansion and a small Flutter port fix.
