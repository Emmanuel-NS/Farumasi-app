# FARUMASI API — Phase 1 (Stable Foundation)

> Phase 1 freezes the **identity, authentication, and authorization** surface of
> the FARUMASI backend. Everything else (orders, prescriptions, deliveries,
> revenue, withdrawals, articles, analytics, notifications, audit logs,
> consultations, uploads, QR delivery) is tagged `experimental` in OpenAPI and
> **may change without notice** until promoted to a later phase.

---

## 1. Stable endpoints

Base URL: `http://<host>:<port>/api/v1`

| Method | Path                | Auth        | Purpose                                  |
|--------|---------------------|-------------|------------------------------------------|
| GET    | `/health`           | none        | Liveness probe (returns `{"status":"ok"}`) |
| POST   | `/auth/register`    | none        | Create a new user + role profile, returns tokens |
| POST   | `/auth/login`       | none        | Exchange email/password for tokens       |
| POST   | `/auth/refresh`     | refresh JWT | Issue a new access+refresh pair          |
| GET    | `/users/me`         | bearer JWT  | Return the current authenticated user    |
| PUT    | `/users/me`         | bearer JWT  | Update the current user's own profile    |

Anything not listed above is **experimental in Phase 1**.

---

## 2. Roles (`UserRole`)

Defined in `app/core/constants.py`. Eleven roles, exact string values:

```
patient
doctor
hospital_admin
pharmacist
pharmacy_admin
partner_company_admin
rider
super_admin
operations_admin
finance_admin
compliance_admin
```

## 3. Account statuses (`UserStatus`)

```
active                — full access
pending_verification  — registered but not yet verified
restricted            — can authenticate but blocked on privileged actions (HTTP 403 via AccountRestrictedError)
suspended             — login refused (HTTP 401)
archived              — login refused (HTTP 401)
```

Status enforcement lives in:
- `app/services/auth_service.py` → `AuthService.login()` (refuses `suspended` and `archived`)
- `app/dependencies/auth.py` → `get_current_user()` (also refuses `restricted` on every authenticated request)

---

## 4. Request / response schemas

### `POST /auth/register`
Request body:
```json
{
  "full_name": "Jane Doe",
  "email": "jane@example.com",
  "phone": "+250788000000",   // optional
  "password": "MinEightChars!",
  "role": "patient"           // one of UserRole; defaults to "patient"
}
```
- `password` must be at least 8 characters.
- A role-specific profile is auto-created for `patient`, `doctor`, `pharmacist`, `rider`.
- Returns **201** with a `TokenResponse`.

### `POST /auth/login`
Request body:
```json
{ "email": "jane@example.com", "password": "MinEightChars!" }
```
Returns **200** with a `TokenResponse`. Returns **401** for invalid credentials, suspended, or archived accounts.

### `POST /auth/refresh`
Request body:
```json
{ "refresh_token": "<jwt>" }
```
Returns a new `TokenResponse`.

### `TokenResponse`
```json
{
  "access_token": "<jwt>",
  "refresh_token": "<jwt>",
  "token_type": "bearer"
}
```
- Access token TTL: `ACCESS_TOKEN_EXPIRE_MINUTES` (default 30 min).
- Refresh token TTL: `REFRESH_TOKEN_EXPIRE_DAYS` (default 7 days).
- Send as `Authorization: Bearer <access_token>` on protected calls.

### `GET /users/me`
Returns the authenticated `UserOut` payload. **Never** includes `password_hash`.

---

## 5. Authorization model

Use the dependencies in `app/dependencies/roles.py`:

```python
require_roles(UserRole.PHARMACIST, UserRole.SUPER_ADMIN)
require_super_admin()
require_finance()       # super_admin + finance_admin
require_compliance()    # super_admin + compliance_admin
require_any_admin()     # super_admin / operations / finance / compliance
require_pharmacist()
require_provider()      # pharmacy_admin / partner_company_admin / ops / super
require_rider()
require_patient()
```

`super_admin` is implicitly allowed by every `require_roles(...)` check.

Wrong role on a protected route → **HTTP 403** (`AuthorizationError`).

---

## 6. Operational hardening (Phase 1)

The following safeguards are enforced at boot:

1. **Database startup ping** — `app/main.py` lifespan executes `SELECT 1`
   against the configured database. If it fails, the API process exits with a
   clear `RuntimeError` instead of starting in a broken state.
2. **SECRET_KEY enforcement** — `app/core/config.py` refuses to start when
   `ENVIRONMENT` is anything other than `development` while `SECRET_KEY` is
   still the default `"change-this-in-production"`.
3. **CORS** is driven by the `CORS_ORIGINS` environment variable
   (comma-separated list or JSON array).
4. **Alembic** is the only supported way to evolve the schema. Auto-create is
   disabled in production.

---

## 7. Smoke tests

```
pytest tests/test_phase1_smoke.py -v
```

Covers:
- `register` returns tokens
- `login` returns tokens
- `GET /users/me` returns the current user and never leaks password fields
- `GET /users/me` without a token returns 401
- A `patient` calling a `finance_admin`-only endpoint returns 403
- A `finance_admin` calling that same endpoint returns 200

These tests are the contract for Phase 1. They must stay green.

---

## 8. Out of scope for Phase 1

The following surfaces exist in code but are explicitly **experimental** in
this phase. Do not depend on their request/response shapes yet:

- prescriptions, recommendations
- products, product approvals, product requests
- orders, deliveries, QR delivery flow
- revenue, withdrawals
- articles, notifications, analytics, audit logs
- consultations, uploads
- admin tooling

They will each get their own phase document and smoke tests before being
promoted to stable.

---

## 9. Environment variables (minimum required)

| Variable                          | Required | Example                                                        |
|-----------------------------------|----------|----------------------------------------------------------------|
| `ENVIRONMENT`                     | yes      | `development` / `staging` / `production`                        |
| `SECRET_KEY`                      | prod     | a long random string (must NOT be the default in non-dev)       |
| `DATABASE_URL` / `ASYNC_DATABASE_URL` | yes  | `postgresql+asyncpg://farumasi:farumasi_pass@localhost:5432/farumasi_db` |
| `CORS_ORIGINS`                    | yes      | `http://localhost:3001,http://localhost:3002,http://localhost:3003` |
| `ACCESS_TOKEN_EXPIRE_MINUTES`     | no       | `30`                                                            |
| `REFRESH_TOKEN_EXPIRE_DAYS`       | no       | `7`                                                             |

---

_Last updated: Phase 1 stabilization pass._
