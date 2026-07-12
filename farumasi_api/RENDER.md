# Deploy FARUMASI API on Render (Docker)

Render builds your `Dockerfile` from GitHub and runs the API with managed Postgres. Good alternative when Railway trial has ended.

---

## Before you start

- [Render account](https://render.com) (free Hobby plan works for testing)
- Code pushed to GitHub
- Know your portal URLs (Vercel) for `CORS_ORIGINS`

### Free tier limits (important)

| Resource | Free behavior |
|----------|----------------|
| **Web service** | Spins down after **15 min** with no traffic; ~1 min cold start |
| **Postgres** | **Expires after 30 days** — upgrade to paid ($7+/mo) for production |
| **Disk** | Ephemeral — use S3/Cloudinary for uploads |

For a real launch, use at least **Starter** ($7/mo) for the web service and a paid Postgres instance.

---

## Path A — Blueprint (fastest, API + DB together)

The repo includes `render.yaml` at the root.

### 1. Create Blueprint

1. [dashboard.render.com](https://dashboard.render.com) → **New +** → **Blueprint**
2. Connect your **Farumasi-app** GitHub repo
3. Render reads `render.yaml` and proposes **farumasi-api** + **farumasi-db**
4. When prompted, fill in:
   - `CORS_ORIGINS` — e.g. `https://your-patient.vercel.app,https://your-admin.vercel.app`
   - `API_PUBLIC_URL` — use placeholder first: `https://farumasi-api.onrender.com` (update after deploy)
   - `PATIENT_PORTAL_URL` — your patient portal URL
5. Click **Apply**

`SECRET_KEY` is auto-generated. `DATABASE_URL` is wired from Postgres automatically.

`ASYNC_DATABASE_URL` is derived from `DATABASE_URL` in code — you do **not** need to set it manually.

Hosted Postgres (Render/Railway) requires TLS. The API enables `ssl=True` automatically for non-local hosts so Alembic and the app do not fail with `SSL/TLS required`.

### 2. Wait for deploy

**Logs** should show:

```
Running database migrations...
Starting FARUMASI API on port 10000...
```

Test:

```bash
curl https://farumasi-api.onrender.com/health
```

### 3. Update `API_PUBLIC_URL`

After Render assigns your URL:

1. **farumasi-api** → **Environment** → edit `API_PUBLIC_URL` → `https://YOUR-SERVICE.onrender.com`
2. Save (triggers redeploy)

### 4. Seed database (once)

1. **farumasi-api** → **Shell** (in the dashboard)
2. Run:

```bash
python scripts/seed.py
```

Default admin: `admin@farumasi.com` / `Admin@12345` — change before go-live.

### 5. Connect portals

On each Vercel project:

```env
NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com/api/v1
```

Ensure every portal URL is in `CORS_ORIGINS` on Render.

---

## Path B — Manual setup (dashboard only)

Use this if you prefer not to use the Blueprint.

### 1. Create PostgreSQL

1. **New +** → **PostgreSQL**
2. Name: `farumasi-db`, plan **Free** (or paid for production)
3. Copy **Internal Database URL** (for services on Render) or **External** (if DB is elsewhere)

### 2. Create Web Service (Docker)

1. **New +** → **Web Service**
2. Connect GitHub repo → **Farumasi-app**
3. Settings:

| Field | Value |
|-------|--------|
| **Name** | `farumasi-api` |
| **Root Directory** | `farumasi_api` |
| **Runtime** | Docker |
| **Dockerfile Path** | `./Dockerfile` |
| **Plan** | Free (testing) or Starter (production) |

4. **Environment variables**:

```env
ENVIRONMENT=production
SECRET_KEY=<long-random-string>
PAYMENT_MODE=live
PESAPAL_ENV=sandbox
RUN_MIGRATIONS=true
PAYMENT_CURRENCY=RWF

DATABASE_URL=<from Postgres dashboard — Internal URL recommended>

CORS_ORIGINS=https://your-patient.vercel.app,https://your-admin.vercel.app
API_PUBLIC_URL=https://YOUR-SERVICE.onrender.com
PATIENT_PORTAL_URL=https://your-patient.vercel.app
```

5. **Advanced** → **Health Check Path**: `/health`
6. **Create Web Service**

Render sets `PORT` automatically (usually `10000`). The Docker entrypoint reads `$PORT`.

### 3. Seed, test, connect portals

Same as Path A steps 2–5.

---

## Path C — Pre-built Docker image

If you build locally:

```bash
cd farumasi_api
docker build -t YOUR_DOCKERHUB_USER/farumasi-api:latest .
docker push YOUR_DOCKERHUB_USER/farumasi-api:latest
```

On Render:

1. **New +** → **Web Service** → **Deploy an existing image**
2. Image URL: `docker.io/YOUR_DOCKERHUB_USER/farumasi-api:latest`
3. Add Postgres + same env vars as Path B

---

## Pesapal IPN (after HTTPS is live)

Use Render **Shell**:

```bash
python scripts/register_pesapal_ipn.py \
  --url https://YOUR-SERVICE.onrender.com/api/v1/webhooks/pesapal
```

Add returned `PESAPAL_IPN_ID` to Environment variables.

---

## File uploads

Render free/starter web disks are **ephemeral**. For prescriptions and images:

```env
STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
AWS_REGION=...
```

Or use Cloudinary (`STORAGE_BACKEND=cloudinary`).

---

## Architecture

```
┌─────────────────────────────────────┐
│  Render                              │
│  ┌─────────────┐   ┌──────────────┐ │
│  │ farumasi-api│──▶│ farumasi-db  │ │
│  │  (Docker)   │   │ (Postgres)   │ │
│  └──────┬──────┘   └──────────────┘ │
└─────────┼───────────────────────────┘
          │ HTTPS *.onrender.com
          ▼
    Vercel portals / Flutter
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `open Dockerfile: no such file or directory` | Dockerfile lives in `farumasi_api/`, not repo root. Set **Root Directory** = `farumasi_api`, **Dockerfile Path** = `Dockerfile`, **Docker Context** = `farumasi_api` — or redeploy the Blueprint (`render.yaml` sets `dockerfilePath: farumasi_api/Dockerfile`). A fallback root `Dockerfile` also exists if Render builds from repo root. |
| Build uses wrong folder | **Root Directory** = `farumasi_api` |
| `SECRET_KEY must be set` | Set `SECRET_KEY` in Environment |
| `PAYMENT_MODE must be live` | `PAYMENT_MODE=live` when `ENVIRONMENT=production` |
| Slow first request | Free tier cold start (~1 min) — upgrade to Starter |
| CORS errors | Add exact portal URLs to `CORS_ORIGINS` (https, no trailing slash) |
| DB connection failed | Use **Internal** Database URL for API on Render |
| Migrations fail | Check **Logs** (not Shell) for `Running database migrations...`. From your PC: copy **External** DB URL from Render → **farumasi-db** → **Connect**, then `python scripts/migrate_database.py --url "postgresql://..."` or `python scripts/ensure_fulfilment_handover_columns.py --url "..."` |
| Health check fails | Confirm `/health` returns 200 |

---

## Checklist

- [ ] Web service root = `farumasi_api`, runtime = Docker
- [ ] Postgres created and `DATABASE_URL` set
- [ ] `SECRET_KEY`, `ENVIRONMENT=production`, `PAYMENT_MODE=live`
- [ ] `RUN_MIGRATIONS=true` on first deploy
- [ ] Health check path = `/health`
- [ ] `API_PUBLIC_URL` matches public Render URL
- [ ] `CORS_ORIGINS` lists all portal URLs
- [ ] `python scripts/seed.py` run once (locally with `--url` if Shell unavailable — see below)
- [ ] Portals: `NEXT_PUBLIC_API_URL=.../api/v1`
- [ ] Object storage for uploads (production)
- [ ] Upgrade Postgres before 30-day free expiry

---

## Useful dashboard links

- **Logs** — deploy and runtime output (migrations run here on every deploy when `RUN_MIGRATIONS=true`)
- **Environment** — secrets and config (copy External Database URL for local scripts)
- **Settings → Custom Domains** — e.g. `api.farumasi.com`

---

## Run DB tasks from your PC (no Render Shell)

Render Shell is paid on some plans. You do **not** need it for migrations: the API container runs `alembic upgrade head` on every deploy when `RUN_MIGRATIONS=true` (see `docker-entrypoint.sh`).

After a git push, open **farumasi-api → Logs** and confirm:

```
Running database migrations...
Starting FARUMASI API on port ...
```

If a migration failed or you need to apply manually:

1. Render dashboard → **farumasi-db** → **Connect** → copy **External Database URL**
2. From PowerShell:

```powershell
cd farumasi_api
python scripts/migrate_database.py --url "postgresql://USER:PASS@HOST/farumasi"
# or idempotent column patch only:
python scripts/ensure_fulfilment_handover_columns.py --url "postgresql://USER:PASS@HOST/farumasi"
```

Check revision:

```powershell
python scripts/migrate_database.py --url "postgresql://..." --check
```

Same `--url` pattern works for one-off scripts (`seed.py`, etc.) if you set `DATABASE_URL` in the command env before running.
