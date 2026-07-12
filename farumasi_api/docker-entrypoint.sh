#!/bin/sh
set -e

PORT="${PORT:-8000}"

# Log DB host only (never password) to diagnose Render connection issues.
if [ -n "${DATABASE_URL:-}" ]; then
  DB_HOST=$(python -c "from urllib.parse import urlparse; import os; u=os.environ.get('DATABASE_URL',''); print(urlparse(u).hostname or 'unknown')" 2>/dev/null || echo "unknown")
  echo "Database host: ${DB_HOST}"
fi

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running database migrations..."
  if ! alembic upgrade head; then
    echo "ERROR: Alembic failed. Check Postgres status in Render (Available vs Expired),"
    echo "       and that DATABASE_URL is the Internal Database URL from the same region."
    exit 1
  fi
fi

echo "Starting FARUMASI API on port ${PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
