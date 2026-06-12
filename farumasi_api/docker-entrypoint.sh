#!/bin/sh
set -e

PORT="${PORT:-8000}"

if [ "${RUN_MIGRATIONS:-false}" = "true" ]; then
  echo "Running database migrations..."
  alembic upgrade head
fi

echo "Starting FARUMASI API on port ${PORT}..."
exec uvicorn app.main:app --host 0.0.0.0 --port "${PORT}"
