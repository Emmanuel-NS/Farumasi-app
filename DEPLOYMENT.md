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
| **FastAPI backend** | [Render](https://render.com), [Railway](https://railway.app), or Fly.io | Long-running Python, WebSockets, file uploads, Pesapal IPN |
| **PostgreSQL** | [Neon](https://neon.tech) or Supabase Postgres | Managed DB with connection string for API |
| **Redis** (optional) | Upstash Redis | Cache / rate limits |
| **Flutter mobile** | Google Play + App Store | Native builds |
| **Flutter web** | Vercel static **or** Firebase Hosting | `flutter build web` → deploy `build/web` |

---

## Backend with Docker

For a self-hosted or VPS deployment, use the API Docker image and compose files in `farumasi_api/`.

See **[farumasi_api/DOCKER.md](farumasi_api/DOCKER.md)** for build, run, registry push, and VPS setup.

Quick local full stack:

```bash
cd farumasi_api
cp .env.example .env
docker compose up -d --build
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed.py
```

---

## Backend on Render (Docker) — recommended

Full guide: **[farumasi_api/RENDER.md](farumasi_api/RENDER.md)**

Quick summary (Blueprint):

1. Render → **New Blueprint** → connect GitHub repo (uses root `render.yaml`).
2. Fill `CORS_ORIGINS`, `API_PUBLIC_URL`, `PATIENT_PORTAL_URL` when prompted.
3. Postgres + API deploy together; migrations run via `RUN_MIGRATIONS=true`.
4. **Shell** → `python scripts/seed.py` once.
5. Point Vercel portals at `https://YOUR-SERVICE.onrender.com/api/v1`.

Manual alternative: **Web Service** → Docker → **Root Directory** `farumasi_api`.

---

## Backend on Railway (Docker)

See **[farumasi_api/RAILWAY.md](farumasi_api/RAILWAY.md)** if you use Railway instead.

---

## Flutter web on Vercel (optional)

1. Build locally or in CI:

   ```bash
   flutter build web --release --dart-define=API_BASE_URL=https://api.farumasi.com/api/v1
   ```

2. Deploy `build/web` as a **static** Vercel project (not Next.js), or use Firebase Hosting.

---

## Suggested rollout order

1. Render API + Postgres (or Neon + Render API) with sandbox Pesapal.
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
