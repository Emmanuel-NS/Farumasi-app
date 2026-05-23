# FARUMASI Shared API Client

Cross-portal TypeScript client for the FARUMASI FastAPI backend.

## Install

This folder ships as plain TypeScript files. To consume it from a Next.js portal, add a path alias to that portal's `tsconfig.json`:

```jsonc
{
  "compilerOptions": {
    "paths": {
      "@/*": ["./src/*"],
      "@farumasi/api/*": ["../farumasi_shared/lib/api/*"]
    }
  }
}
```

Required portal dependency: `axios` (already present in all 6 Next.js portals).

## Bootstrap (once per portal)

```ts
// src/app/api-bootstrap.ts
import { configureFarumasiApi } from "@farumasi/api";

configureFarumasiApi({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1",
  tokenKeyPrefix: "farumasi_patient_", // change per portal
  onUnauthorized: () => {
    if (typeof window !== "undefined") window.location.href = "/auth/login";
  },
});
```

Import this file once in your root layout to register the singleton.

## Recommended token-key prefixes

| Portal | Prefix |
|---|---|
| patient | `farumasi_patient_` |
| doctor | `farumasi_doctor_` |
| hospital | `farumasi_hospital_` |
| pharmacist | `farumasi_pharmacist_` |
| pharmacy/partner | `farumasi_partner_` |
| super-admin | `farumasi_admin_` |

## Use

```ts
import { authApi, patientsApi, ordersApi } from "@farumasi/api";

await authApi.login({ email, password });
const me = await authApi.me();
const rxs = await patientsApi.listPrescriptions();
const order = await ordersApi.create({ ... });
```

## Behavior

- Adds `Authorization: Bearer <access>` automatically.
- On `401`, attempts a single refresh against `/auth/refresh`; on failure clears tokens and invokes `onUnauthorized()`.
- Handles FastAPI's `redirect_slashes=False` by appending a trailing `/` to list-style paths.
- Normalizes errors via `normalizeError()` — see [client.ts](./client.ts).

## File map

- `client.ts` — axios singleton, interceptors, token storage abstraction.
- `auth.ts` — login / register / refresh / me / logout.
- `patients.ts`, `doctors.ts`, `hospitals.ts`, `pharmacists.ts`, `pharmacies.ts`, `partners.ts`, `riders.ts` — role profiles + role-scoped endpoints.
- `products.ts` — catalogue + listings + insurance.
- `prescriptions.ts`, `recommendations.ts`, `orders.ts`, `deliveries.ts` — workflow.
- `revenue.ts`, `withdrawals.ts` — finance.
- `notifications.ts`, `articles.ts` — engagement.
- `admin.ts` — users list, analytics, audit logs.
- `types.ts` — DTOs mirroring backend Pydantic schemas.
- `index.ts` — barrel export.

## Status

**Foundation only.** Wiring portals to this client happens phase-by-phase. Patient portal is recommended as the first migration target.
