# FARUMASI deployment guide

Monorepo layout — each app deploys separately.

## What runs on Vercel (Next.js)

| App | Folder | Suggested domain |
|-----|--------|------------------|
| Patient portal | `farumasi_patient_portal` | `app.farumasi.com` or `patient.farumasi.com` |
| Pharmacist portal | `farumasi_pharmacist_portal` | `pharmacy.farumasi.com` |
| Partner portal | `farumasi_partner_portal` | `partner.farumasi.com` |
| Super admin | `farumasi_super_admin` | `admin.farumasi.com` |

### Vercel project setup (repeat per portal)

1. [vercel.com](https://vercel.com) → **Add New Project** → import Git repo.
2. **Root Directory** → set to the portal folder (e.g. `farumasi_patient_portal`).
3. **Framework** → Next.js (auto-detected).
4. **Environment variables** (Production + Preview):

   ```
   NEXT_PUBLIC_API_URL=https://api.farumasi.com/api/v1
   ```

5. Deploy. Vercel assigns a preview URL; add custom domain in **Settings → Domains**.

### CORS on API

In `farumasi_api/.env` production, add all portal URLs to `CORS_ORIGINS`:

```
CORS_ORIGINS=https://patient.farumasi.com,https://pharmacy.farumasi.com,https://partner.farumasi.com,https://admin.farumasi.com
```

---

## What does NOT run on Vercel

| Component | Recommended host | Why |
|-----------|------------------|-----|
| **FastAPI backend** | [Railway](https://railway.app), [Render](https://render.com), or Fly.io | Long-running Python, WebSockets, file uploads, Pesapal IPN |
| **PostgreSQL** | [Neon](https://neon.tech) or Supabase Postgres | Managed DB with connection string for API |
| **Redis** (optional) | Upstash Redis | Cache / rate limits |
| **Flutter mobile** | Google Play + App Store | Native builds |
| **Flutter web** | Vercel static **or** Firebase Hosting | `flutter build web` → deploy `build/web` |

---

## Backend (Railway example)

1. New **Railway** project → deploy from Git, root `farumasi_api`.
2. Add **PostgreSQL** plugin → copy `DATABASE_URL`.
3. Set env vars:

   ```
   ASYNC_DATABASE_URL=postgresql+asyncpg://...
   DATABASE_URL=postgresql://...
   SECRET_KEY=<long random string>
   ENVIRONMENT=production
   PAYMENT_MODE=live
   PESAPAL_ENV=sandbox
   PESAPAL_CONSUMER_KEY=...
   PESAPAL_CONSUMER_SECRET=...
   PESAPAL_IPN_ID=...
   API_PUBLIC_URL=https://api.farumasi.com
   PATIENT_PORTAL_URL=https://patient.farumasi.com
   CORS_ORIGINS=https://patient.farumasi.com,...
   ```

4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Run migrations: `alembic upgrade head` (Railway one-off job or release command).
6. Register Pesapal IPN: `python scripts/register_pesapal_ipn.py --url https://api.farumasi.com/api/v1/webhooks/pesapal`

---

## Flutter web on Vercel (optional)

1. Build locally or in CI:

   ```bash
   flutter build web --release --dart-define=API_BASE_URL=https://api.farumasi.com/api/v1
   ```

2. Deploy `build/web` as a **static** Vercel project (not Next.js), or use Firebase Hosting.

---

## Suggested rollout order

1. Neon Postgres + Railway API (sandbox Pesapal).
2. Patient portal on Vercel → point `NEXT_PUBLIC_API_URL` at API.
3. Pharmacist + partner + admin portals.
4. Pesapal live keys + IPN when API has public HTTPS URL.
5. Flutter web / mobile store builds last.

---

## Local parity before deploy

```bash
# API
cd farumasi_api && uvicorn app.main:app --reload

# Patient portal
cd farumasi_patient_portal && npm run dev
```

Test checkout end-to-end with `PAYMENT_MODE=sandbox` before switching to live Pesapal.
