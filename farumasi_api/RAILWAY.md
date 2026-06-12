# Deploy FARUMASI API on Railway (Docker)

Railway runs your `farumasi_api/Dockerfile` and injects `PORT` automatically. This guide covers the two common paths: **GitHub (recommended)** and **pre-built Docker image**.

---

## What you need before starting

- [Railway account](https://railway.app) (GitHub login works)
- Code pushed to GitHub (your `Farumasi-app` repo)
- A strong `SECRET_KEY` (generate: `openssl rand -hex 32` or any long random string)

---

## Path A — Deploy from GitHub (recommended)

Railway builds the Docker image on every push. Best for ongoing updates.

### 1. Create the project

1. Go to [railway.app/new](https://railway.app/new)
2. **Deploy from GitHub repo** → select `Farumasi-app`
3. Railway creates a service — open it → **Settings**
4. Set **Root Directory** → `farumasi_api`
5. **Builder** should show **Dockerfile** (from `railway.toml` or auto-detect)

### 2. Add PostgreSQL

1. In the same project, click **+ New** → **Database** → **PostgreSQL**
2. Wait until the database is running
3. Open the **API service** → **Variables** → **Add variable** → **Reference**
4. Add a reference to Postgres `DATABASE_URL` (Railway links them)

### 3. Set environment variables

In the **API service** → **Variables**, add these (edit values for your domains):

| Variable | Value |
|----------|--------|
| `ENVIRONMENT` | `production` |
| `SECRET_KEY` | long random string (required) |
| `PAYMENT_MODE` | `live` |
| `PESAPAL_ENV` | `sandbox` until Pesapal approves live |
| `RUN_MIGRATIONS` | `true` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` (reference) |
| `ASYNC_DATABASE_URL` | Same as `DATABASE_URL` but change `postgresql://` → `postgresql+asyncpg://` |
| `CORS_ORIGINS` | `https://your-patient.vercel.app,https://your-admin.vercel.app` (comma-separated, no spaces) |
| `API_PUBLIC_URL` | `https://your-api.up.railway.app` (update after custom domain) |
| `PATIENT_PORTAL_URL` | `https://your-patient.vercel.app` |
| `PAYMENT_CURRENCY` | `RWF` |

**ASYNC_DATABASE_URL example** — if Railway gives:

```
postgresql://postgres:PASSWORD@containers-us-west-xxx.railway.app:5432/railway
```

Set:

```
postgresql+asyncpg://postgres:PASSWORD@containers-us-west-xxx.railway.app:5432/railway
```

Only the scheme changes (`+asyncpg`).

Optional (add when ready):

| Variable | When |
|----------|------|
| `REDIS_URL` | Add Railway Redis plugin or Upstash |
| `PESAPAL_CONSUMER_KEY` / `SECRET` | Pesapal payments |
| `STORAGE_BACKEND=s3` + AWS vars | Prescription/file uploads in prod |
| `GOOGLE_TRANSLATE_API_KEY` | Translation feature |

### 4. Networking — public URL

1. API service → **Settings** → **Networking**
2. **Generate domain** → you get something like `farumasi-api-production.up.railway.app`
3. Update `API_PUBLIC_URL` to `https://farumasi-api-production.up.railway.app`
4. (Optional) **Custom domain** → `api.farumasi.com` → add CNAME at your DNS provider

### 5. Deploy

Railway deploys automatically after env vars are set (or push to `main`).

Check **Deployments** → **View logs**. You should see:

```
Running database migrations...
Starting FARUMASI API on port XXXX...
```

Test:

```bash
curl https://your-api.up.railway.app/health
```

Expected: `{"status":"healthy","version":"1.0.0"}`

### 6. Seed database (first time only)

Railway CLI (install: `npm i -g @railway/cli` or see Railway docs):

```bash
cd farumasi_api
railway login
railway link          # select your project + API service
railway run python scripts/seed.py
```

Or in the dashboard: **API service** → **Settings** → run a one-off command if available, or use **Railway Shell**.

After seed, super admin: `admin@farumasi.com` / `Admin@12345` — **change password immediately**.

Set `RUN_MIGRATIONS=false` after first deploy if you prefer manual migrations only.

### 7. Point frontends at Railway

On each Vercel portal:

```
NEXT_PUBLIC_API_URL=https://your-api.up.railway.app/api/v1
```

Update `CORS_ORIGINS` on Railway to include every portal URL.

### 8. Pesapal IPN (after HTTPS is live)

```bash
railway run python scripts/register_pesapal_ipn.py \
  --url https://your-api.up.railway.app/api/v1/webhooks/pesapal
```

Copy the returned `PESAPAL_IPN_ID` into Railway variables.

---

## Path B — Deploy a pre-built Docker image

Use this if you build locally or in CI and push to a registry.

### 1. Push image to Docker Hub

```bash
cd farumasi_api
docker build -t YOUR_DOCKERHUB_USER/farumasi-api:latest .
docker login
docker push YOUR_DOCKERHUB_USER/farumasi-api:latest
```

### 2. Create Railway project from image

1. [railway.app/new](https://railway.app/new) → **Deploy a Docker image**
2. Image: `YOUR_DOCKERHUB_USER/farumasi-api:latest`
3. Add PostgreSQL (same as Path A step 2)
4. Set all environment variables (same as Path A step 3)
5. Generate public domain and test `/health`

Railway still sets `PORT`; your `docker-entrypoint.sh` reads it automatically.

To update: push a new image tag, then **Redeploy** in Railway (or enable registry webhooks).

---

## Architecture on Railway

```
┌─────────────────────────────────────────┐
│  Railway Project                         │
│                                          │
│  ┌──────────────┐    ┌───────────────┐  │
│  │  API service │───▶│  PostgreSQL   │  │
│  │  (Dockerfile)│    │  (plugin)     │  │
│  └──────┬───────┘    └───────────────┘  │
│         │                                │
│         │  optional                      │
│         ▼                                │
│  ┌──────────────┐                        │
│  │  Redis       │                        │
│  └──────────────┘                        │
└─────────────────────────────────────────┘
         │
         │ HTTPS (generated or custom domain)
         ▼
   Vercel portals / Flutter app
```

---

## File uploads on Railway

Railway’s filesystem is **ephemeral** — files in `/app/uploads` are lost on redeploy.

For production, set:

```
STORAGE_BACKEND=s3
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_BUCKET_NAME=...
AWS_REGION=...
```

Or use Cloudinary (`STORAGE_BACKEND=cloudinary`).

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| Build fails: wrong folder | **Root Directory** must be `farumasi_api` |
| `SECRET_KEY must be set` | Set a unique `SECRET_KEY`; `ENVIRONMENT=production` |
| `PAYMENT_MODE must be live` | Set `PAYMENT_MODE=live` in production |
| DB connection error | Check `ASYNC_DATABASE_URL` uses `postgresql+asyncpg://` |
| CORS errors in browser | Add exact portal URL to `CORS_ORIGINS` (https, no trailing slash) |
| Health check failing | Ensure `/health` returns 200; check deploy logs |
| Migrations fail on boot | Run `railway run alembic upgrade head` manually; fix migration errors in logs |
| Uploads disappear | Switch to S3/Cloudinary |

---

## Checklist

- [ ] Root Directory = `farumasi_api`
- [ ] Postgres plugin attached
- [ ] `SECRET_KEY`, `ENVIRONMENT=production`, `PAYMENT_MODE=live`
- [ ] `DATABASE_URL` + `ASYNC_DATABASE_URL` (asyncpg scheme)
- [ ] `RUN_MIGRATIONS=true` on first deploy
- [ ] Public domain generated; `API_PUBLIC_URL` updated
- [ ] `CORS_ORIGINS` lists all portal URLs
- [ ] `railway run python scripts/seed.py` (once)
- [ ] Portals use `NEXT_PUBLIC_API_URL=.../api/v1`
- [ ] Pesapal IPN registered when going live with payments
- [ ] Object storage configured for uploads

---

## Useful commands

```bash
# Install CLI
npm i -g @railway/cli

# Link local folder to Railway service
cd farumasi_api && railway login && railway link

# View logs
railway logs

# Run migrations manually
railway run alembic upgrade head

# Seed
railway run python scripts/seed.py

# Open Railway dashboard
railway open
```
