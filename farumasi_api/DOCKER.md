# FARUMASI API — Docker guide

Run the backend in a container for local dev, staging, or production (VPS, Railway, Render, etc.).

## Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (Windows/Mac) or Docker Engine (Linux)
- Git repo cloned locally

---

## Quick start (full stack: API + Postgres + Redis)

### 1. Create environment file

```bash
cd farumasi_api
cp .env.example .env
```

Edit `.env` for local Docker. The compose files override database URLs to point at the `db` and `redis` services — you mainly need:

```env
ENVIRONMENT=development
SECRET_KEY=change-this-to-a-long-random-secret-key-in-production
PAYMENT_MODE=sandbox
```

### 2. Start development stack (hot reload)

```bash
docker compose up -d --build
```

- API: http://localhost:8000  
- Docs: http://localhost:8000/docs  
- Health: http://localhost:8000/health  

Source code is mounted into the container, so `--reload` picks up changes.

### 3. Run migrations and seed (first time)

```bash
docker compose exec api alembic upgrade head
docker compose exec api python scripts/seed.py
```

Default super admin after seed: `admin@farumasi.com` / `Admin@12345` (change in production).

### 4. Stop

```bash
docker compose down
```

Data persists in Docker volumes (`postgres_data`, `redis_data`). Add `-v` to wipe volumes.

---

## Production-style stack (no hot reload)

Uses `docker-compose.prod.yml` — migrations run automatically on startup.

```bash
cd farumasi_api
cp .env.example .env
# Set ENVIRONMENT=production, strong SECRET_KEY, PAYMENT_MODE=live, CORS_ORIGINS, etc.

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api python scripts/seed.py
```

Set `RUN_MIGRATIONS=false` in `.env` after the first deploy if you prefer manual migrations.

---

## Build image only (no compose)

```bash
cd farumasi_api
docker build -t farumasi-api:latest .
```

Run against an external database (Neon, managed Postgres, etc.):

```bash
docker run -d \
  --name farumasi-api \
  -p 8000:8000 \
  -e ENVIRONMENT=production \
  -e SECRET_KEY="your-long-random-secret" \
  -e PAYMENT_MODE=live \
  -e ASYNC_DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/db" \
  -e DATABASE_URL="postgresql://user:pass@host:5432/db" \
  -e CORS_ORIGINS="https://patient.example.com,https://admin.example.com" \
  -e API_PUBLIC_URL="https://api.example.com" \
  -e RUN_MIGRATIONS=true \
  -v farumasi_uploads:/app/uploads \
  farumasi-api:latest
```

Check logs:

```bash
docker logs -f farumasi-api
curl http://localhost:8000/health
```

---

## Push to a container registry

### Docker Hub

```bash
docker tag farumasi-api:latest YOUR_DOCKERHUB_USER/farumasi-api:latest
docker login
docker push YOUR_DOCKERHUB_USER/farumasi-api:latest
```

### GitHub Container Registry

```bash
docker tag farumasi-api:latest ghcr.io/YOUR_ORG/farumasi-api:latest
docker push ghcr.io/YOUR_ORG/farumasi-api:latest
```

On **Render**: see **[RENDER.md](RENDER.md)** (Blueprint or manual Docker deploy).

On **Railway**: see **[RAILWAY.md](RAILWAY.md)**.

On Fly.io: connect the repo, set **Root Directory** to `farumasi_api`, or deploy a pushed image.

---

## Environment variables reference

| Variable | Required | Description |
|----------|----------|-------------|
| `ENVIRONMENT` | Yes | `development` or `production` |
| `SECRET_KEY` | Yes (prod) | JWT signing key; must not be default in production |
| `ASYNC_DATABASE_URL` | Yes | `postgresql+asyncpg://...` |
| `DATABASE_URL` | Yes | `postgresql://...` (Alembic / sync tools) |
| `CORS_ORIGINS` | Yes (prod) | Comma-separated portal URLs |
| `PAYMENT_MODE` | Yes | `sandbox` (dev) or `live` (prod) |
| `PORT` | No | Default `8000`; Railway/Render set this automatically |
| `RUN_MIGRATIONS` | No | `true` runs `alembic upgrade head` before start |
| `REDIS_URL` | No | `redis://...` if using Redis features |
| `PESAPAL_*`, `API_PUBLIC_URL` | For payments | See `.env.example` |

**Never** bake `.env` into the image. Pass secrets at runtime via compose `env_file`, `docker run -e`, or your host’s secret manager.

---

## Common commands

```bash
# Rebuild after dependency changes
docker compose build --no-cache api

# Shell inside API container
docker compose exec api sh

# Run migrations manually
docker compose exec api alembic upgrade head

# View API logs
docker compose logs -f api

# One-off seed
docker compose exec api python scripts/seed.py
```

---

## Deploy on a VPS (Ubuntu example)

```bash
# On server
git clone https://github.com/YOUR_ORG/Farumasi-app.git
cd Farumasi-app/farumasi_api
cp .env.example .env
nano .env   # production values

docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec api python scripts/seed.py
```

Put **Nginx** or **Caddy** in front for HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name api.farumasi.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Register Pesapal IPN after the API is reachable on HTTPS:

```bash
docker compose -f docker-compose.prod.yml exec api \
  python scripts/register_pesapal_ipn.py --url https://api.farumasi.com/api/v1/webhooks/pesapal
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `SECRET_KEY must be set` on start | Set a strong `SECRET_KEY` when `ENVIRONMENT=production` |
| `PAYMENT_MODE must be live` | Use `PAYMENT_MODE=live` in production |
| API exits: DB connection refused | Wait for Postgres healthcheck; check `ASYNC_DATABASE_URL` host (`db` in compose, external host otherwise) |
| Uploads lost after restart | Mount a volume on `/app/uploads` or use `STORAGE_BACKEND=s3` |
| Permission denied on entrypoint | Rebuild image; `docker-entrypoint.sh` must have LF line endings |
