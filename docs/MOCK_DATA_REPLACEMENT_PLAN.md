# FARUMASI — Mock Data Replacement Plan

> Step-by-step plan to retire mock data and route every screen to the real backend, without breaking the UI.

---

## 1. Strategy

1. Introduce a single env flag: **`NEXT_PUBLIC_USE_MOCK`** (Next.js portals) / **`USE_MOCK`** (Flutter via `--dart-define`).
2. Every service layer call goes through a helper that returns the mock when the flag is `true`, otherwise hits the live API.
3. Mock data **stays** in the repo until each screen is verified against the real endpoint, then it is deleted in a follow-up commit.
4. We integrate **one portal at a time**, starting with patient.

---

## 2. Mock file inventory

| Portal | File(s) | Used by | Replacement endpoint(s) |
|---|---|---|---|
| Patient | [farumasi_patient_portal/src/data/mock.ts](../farumasi_patient_portal/src/data/mock.ts), [mock-i18n.ts](../farumasi_patient_portal/src/data/mock-i18n.ts) | home, search, prescriptions, orders, articles | `/patients/me/*`, `/recommendations`, `/orders`, `/articles` |
| Doctor | [farumasi_doctor_portal/src/data/mock/index.ts](../farumasi_doctor_portal/src/data/mock/index.ts) | doctor, patients, medicines, pharmacies, notes, insights | `/doctors/me/*`, `/products`, `/listings`, `/prescriptions` |
| Hospital | [farumasi_hospital_portal/src/data/mock/index.ts](../farumasi_hospital_portal/src/data/mock/index.ts) | hospital admin dashboards, doctors list | `/hospitals/{id}*` |
| Pharmacist | [farumasi_pharmacist_portal/src/data/mock.ts](../farumasi_pharmacist_portal/src/data/mock.ts) | review queue, articles, product requests | `/prescriptions`, `/articles`, `/product-requests` |
| Partner (pharmacy + partner) | [farumasi_partner_portal/src/data/mock/index.ts](../farumasi_partner_portal/src/data/mock/index.ts) | business, listings, orders, revenue, withdrawals | `/pharmacies/me/*`, `/partners/me/*` |
| Super-admin | [farumasi_super_admin/src/data/mock.ts](../farumasi_super_admin/src/data/mock.ts) | every admin dashboard | `/users`, `/analytics`, `/admin/*`, `/revenue`, `/withdrawals` |
| Shared workspace fixtures | [farumasi_shared/data/](../farumasi_shared/data/) | recommendation engine demos | `/recommendations` |

---

## 3. Priority

### P0 — must replace first (core workflow)
| Area | Mock symbol(s) | Endpoint | Portal |
|---|---|---|---|
| Auth | login/register stubs | `POST /auth/*` | all |
| User profile | `mockUser`, `mockDoctor`, `mockBusiness` | `GET /users/me`, role profile `/me` | all |
| Prescriptions | `mockPrescriptions`, `mockRxQueue` | `/patients/me/prescriptions`, `/prescriptions/`, `/doctors/me/prescriptions` | patient / doctor / pharmacist |
| Products & listings | `mockApprovedProducts`, `mockListedProducts`, `mockMedicines` | `/products/`, `/listings/`, `/pharmacies/me/listings` | partner / doctor / patient |
| Recommendations | `mockPharmacies`, recommendation engine demo | `POST /patients/me/recommendations` | patient |
| Orders | `mockOrders` | `/patients/me/orders`, `/pharmacies/me/orders`, `/orders/pharmacy/all` | patient / partner / super-admin |

### P1 — replace after P0
- Deliveries (`mockDeliveries`) → `/deliveries/*`, `/riders/me/deliveries`
- Notifications (`mockNotifications`) → `/notifications/*`
- Revenue (`mockRevenue`, `mockTransactions`) → `/pharmacies/me/revenue`, `/revenue/*`
- Withdrawals (`mockWithdrawals`) → `/pharmacies/me/withdrawals`, `/withdrawals/*`
- Articles (`mockArticles`) → `/articles/*`
- Audit logs → `/admin/audit-logs/*`
- Insurance (`mockInsurance`) → `/insurance-providers/`

### P2 — keep as mock for now (no backend yet)
- BI dashboards / forecasting / predictions
- Feature flags
- Integration management
- System monitoring
- Advanced charts beyond `/analytics/*`
- Marketing analytics
- AI insights surfaces
- Compliance scoring beyond audit logs
- Subscriptions / commission tier configuration

These remain in `mock/` until backend modules exist; the shared client should NOT add stubs for them.

---

## 4. Per-screen wiring template

```ts
// services/orders.service.ts (patient portal)
import { ordersApi } from "@farumasi/shared/lib/api";
import { mockOrders } from "@/data/mock";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const ordersService = {
  list: () => USE_MOCK ? Promise.resolve(mockOrders) : ordersApi.listMine(),
  create: (payload) => USE_MOCK ? Promise.resolve({ ...payload, id: "mock-1" }) : ordersApi.create(payload),
};
```

Once the real endpoint is verified for that screen, delete the mock branch in a single commit.

---

## 5. Migration checklist (per portal)

1. [ ] Add `.env.local` with `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_USE_MOCK=true`.
2. [ ] Replace local `lib/api.ts` with shared client (if applicable).
3. [ ] Add a thin auth context + protected layout.
4. [ ] Wire P0 services (auth → profile → prescriptions → recs → orders).
5. [ ] Flip `NEXT_PUBLIC_USE_MOCK=false` and smoke-test every P0 screen.
6. [ ] Wire P1 services.
7. [ ] Delete P0 + P1 mocks; keep P2.
8. [ ] Commit per portal.

---

## 6. Risk mitigation

- **Do not delete any mock file in Phase 10.** Mocks are removed in a later phase per screen.
- Keep portal UI exactly as is; only swap data origin.
- After each wiring, run `pnpm build` (or `next build`) in that portal to catch type drift.
- Run `pytest -q` after touching `seed.py` to confirm no backend regression.
