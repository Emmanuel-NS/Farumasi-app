# FARUMASI — Super Admin portal audit (CIP MVP)

**Last updated:** June 2026 (deep scan + fixes)  
**Portal:** `farumasi_super_admin` — http://localhost:3005  
**API:** http://localhost:8000/api/v1  
**Credentials:** `admin@farumasi.com` / `Admin@12345`

---

## 1. MVP scope (sidebar)

| Section | Route | Data source | Status |
|---------|-------|-------------|--------|
| Overview | `/dashboard` | `GET /analytics/admin`, `/orders/`, `/audit/` | Live |
| Platform | `/users/patients` | `GET /users/?role=patient` | Live |
| Platform | `/users/pharmacists` | `GET /users/?role=pharmacist` + `pharmacy_admin` | Live |
| Platform | `/users/riders` | `GET /users/?role=rider` | Live |
| Platform | `/pharmacies` | `GET /pharmacies/`, `GET /partners/` (companies tab) | Live |
| Operations | `/orders` | `GET /orders/` (no PHI) | Live |
| Operations | `/prescriptions` | `GET /prescriptions/` (no PHI) | Live |
| Finance | `/finance`, `/finance/revenue`, `/finance/withdrawals` | `GET /revenue/`, `/withdrawals/` | Live |
| Compliance | `/audit` | `GET /audit/` | Live |
| System | `/settings` | Read-only MVP copy | Placeholder |

**Redirects:** `/revenue` → `/finance/revenue`, `/withdrawals` → `/finance/withdrawals`, `/suppliers` → `/pharmacies`

**Hidden from sidebar:** catalogue, listings, product-requests, BI/AI routes (still in repo).

---

## 2. Deep scan — issues found and fixed (June 2026)

### P0 — Backend integration (fixed June 2026)

| ID | Issue | Fix |
|----|-------|-----|
| SA-INT-1 | `GET /partners/` → 500 — DB missing `logo_url`, `description`, `commission_rate_percent`, `is_open` | Run `python scripts/ensure_partner_columns.py`; Alembic migration added |
| SA-INT-2 | Pharmacies page used `Promise.all` — partners failure blocked entire page | `Promise.allSettled`; pharmacies tab works independently |
| SA-INT-3 | Pharmacy adapter expected `owner`, `created_at` not in `PharmacyOut` | API schema + list endpoint now return `created_at`, nested `owner` |
| SA-INT-4 | Pharmacy status filters used `Approved/Pending` but API uses `active/inactive/suspended` | UI filters aligned to API entity status + verification badge |
| SA-INT-5 | Orders status filter client-only; seller fallback missing | Server-side `status` query param; seller name enrichment from pharmacies/partners |

| ID | Issue | Fix |
|----|-------|-----|
| SA-AUDIT-1 | Revenue adapter used `recorded_at`; API returns `created_at` → invalid dates | `revenue.service.ts` aligned to API |
| SA-AUDIT-2 | Withdrawals adapter used wrong field names (`payment_method`, nested `pharmacy`) | Mapped `payout_method`, `requester_user_id`, enrich names from `/pharmacies/` + `/partners/` |
| SA-AUDIT-3 | Auth layout allowed `ready` with token but no persisted user | Wait for Zustand hydration; `getMe()` backfill |
| SA-AUDIT-4 | Sign out in topbar not wired | `logout()` + redirect to `/login` |

### P1 — UX / correctness (fixed)

| ID | Issue | Fix |
|----|-------|-----|
| SA-AUDIT-5 | Silent API failures (empty tables) | `ErrorBanner` + retry on MVP pages |
| SA-AUDIT-6 | No empty states on filtered tables | `EmptyState` on users, orders, prescriptions, pharmacies, finance |
| SA-AUDIT-7 | Pharmacies page pre-filtered companies to `active` only | Show all non-pharmacy partners; status filter works |
| SA-AUDIT-8 | Prescriptions showed non-existent `fulfilled_at` / pharmacy link | Columns: type, line items, status only |
| SA-AUDIT-9 | Pharmacists list missed `pharmacy_admin` accounts | Dual-role fetch on `/users/pharmacists` |
| SA-AUDIT-10 | Audit search fired on every keystroke | 350ms debounce |
| SA-AUDIT-11 | Settings implied live 2FA/Slack | MVP banner + “Planned” badges |
| SA-AUDIT-12 | Topbar showed hardcoded email | Shows session user from auth store |

### P2 — Remaining gaps

| ID | Issue |
|----|-------|
| SA-P2-1 | Settings — no platform settings API |
| SA-P2-2 | Users — suspend/activate/restrict in UI | **Fixed** (`PATCH /users/{id}/status`) |
| SA-P2-3 | Global topbar search disabled (use per-page filters) | By design |
| SA-P2-4 | Legacy routes redirect to `/dashboard` via `src/middleware.ts` | **Fixed** |
| SA-P2-5 | Withdrawal approve flow — no “mark paid” step in UI when status is approved |

---

## 3. Automated audit

```powershell
cd farumasi_api
python scripts/audit_super_admin.py
```

Start portal:

```powershell
cd farumasi_super_admin
npm run dev
```

---

## 4. Manual test checklist

- [ ] Login; non–super-admin rejected
- [ ] Sign out returns to login and clears session
- [ ] Dashboard KPIs + recent audit + quick links
- [ ] Users: patients / pharmacists (incl. pharmacy admins) / riders
- [ ] Pharmacies & Companies tabs; search and status filters
- [ ] Orders: codes and sellers only (no patient names)
- [ ] Prescriptions: reference + status only
- [ ] Finance hub → revenue ledger dates and amounts correct
- [ ] Withdrawals: requester names resolve (not all “Unknown”)
- [ ] Audit: filters, pagination, CSV export
- [ ] API offline: pages show error banner with retry

---

## 5. Related docs

- [CROSS_PORTAL_AUDIT.md](./CROSS_PORTAL_AUDIT.md)
- [farumasi_api/README.md](../farumasi_api/README.md)
