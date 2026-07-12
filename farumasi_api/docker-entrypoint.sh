#!/bin/sh
set -e

PORT="${PORT:-8000}"

echo "=== FARUMASI DB bootstrap ==="
python - <<'PY'
"""Diagnose DATABASE_URL before Alembic (no secrets printed)."""
from __future__ import annotations

import asyncio
import os
import ssl
import sys
from urllib.parse import urlparse, unquote

raw = (os.environ.get("DATABASE_URL") or "").strip()
if not raw:
    print("ERROR: DATABASE_URL is not set on this service.")
    sys.exit(1)

# Normalize for display / asyncpg
display = raw.replace("postgres://", "postgresql://", 1)
parsed = urlparse(display)
host = parsed.hostname or "?"
port = parsed.port or 5432
db = (parsed.path or "/").lstrip("/") or "?"
user = unquote(parsed.username or "?")
print(f"Database host: {host}")
print(f"Database port: {port}")
print(f"Database name: {db}")
print(f"Database user: {user}")
print(f"Looks external (*.render.com): {host.endswith('render.com')}")

async_url = display
if async_url.startswith("postgresql://"):
    async_url = async_url.replace("postgresql://", "postgresql+asyncpg://", 1)
# strip libpq query for asyncpg probe
from urllib.parse import urlencode, parse_qsl, urlunparse
p = urlparse(async_url)
q = [(k, v) for k, v in parse_qsl(p.query, keep_blank_values=True) if k.lower() not in {"sslmode", "ssl", "channel_binding"}]
async_url = urlunparse(p._replace(query=urlencode(q)))
# asyncpg connect wants postgresql:// not +asyncpg
probe_url = async_url.replace("postgresql+asyncpg://", "postgresql://", 1)


async def try_connect(label: str, ssl_arg):
    import asyncpg
    try:
        conn = await asyncio.wait_for(
            asyncpg.connect(probe_url, ssl=ssl_arg, timeout=15),
            timeout=25,
        )
        v = await conn.fetchval("SELECT version()")
        await conn.close()
        print(f"PROBE [{label}]: OK — {str(v)[:60]}...")
        return True
    except Exception as exc:
        print(f"PROBE [{label}]: FAIL — {type(exc).__name__}: {exc}")
        return False


async def main():
    ctx = ssl.create_default_context()
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    ok_ssl = await try_connect("ssl=context", ctx)
    ok_true = await try_connect("ssl=True", True)
    ok_none = await try_connect("ssl=None/off", False)
    if not (ok_ssl or ok_true or ok_none):
        print("")
        print("DIAGNOSIS: Postgres is unreachable with and without TLS.")
        print("  → In Render dashboard open the Postgres service (farumasi-db).")
        print("  → If status is Expired/Unavailable: create a new DB and update DATABASE_URL.")
        print("  → If Available: set DATABASE_URL to the Internal Database URL (same region),")
        print("    then Manual Deploy the API.")
        sys.exit(1)
    if ok_none and not (ok_ssl or ok_true):
        print("HINT: Internal DB prefers no TLS — set env DATABASE_SSL=disable if migrations still fail.")
    elif (ok_ssl or ok_true) and not ok_none:
        print("HINT: TLS is required — keep SSL enabled (default for hosted hosts).")


asyncio.run(main())
PY

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running database migrations..."
  if ! alembic upgrade head; then
    echo "ERROR: Alembic failed after DB probe. See PROBE lines above."
    exit 1
  fi
fi

echo "Starting FARUMASI API on port ${PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
