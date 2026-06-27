"""Run Alembic migrations against any Postgres database (local or Render).

Use this instead of Render Shell when you need to apply migrations manually.

PowerShell (paste External Database URL from Render → farumasi-db → Connect):
  cd farumasi_api
  python scripts/migrate_database.py --url "postgresql://USER:PASS@HOST/farumasi"

The script sets DATABASE_URL / ASYNC_DATABASE_URL for this process only (does not edit .env).
"""
from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

API_ROOT = Path(__file__).resolve().parents[1]


def _to_async_url(sync_url: str) -> str:
    if sync_url.startswith("postgresql+asyncpg://"):
        return sync_url
    if sync_url.startswith("postgresql://"):
        return sync_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    if sync_url.startswith("postgres://"):
        return sync_url.replace("postgres://", "postgresql+asyncpg://", 1)
    raise ValueError("URL must start with postgresql:// or postgres://")


def main() -> None:
    parser = argparse.ArgumentParser(description="Run alembic upgrade head against a database URL")
    parser.add_argument(
        "--url",
        help="Postgres connection string (Render external URL). Omit to use DATABASE_URL from .env",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Print current Alembic revision only (alembic current)",
    )
    args = parser.parse_args()

    if args.url:
        sync_url = args.url.replace("postgres://", "postgresql://", 1)
        os.environ["DATABASE_URL"] = sync_url
        os.environ["ASYNC_DATABASE_URL"] = _to_async_url(sync_url)

    cmd = ["alembic", "current"] if args.check else ["alembic", "upgrade", "head"]
    print(f"Running: {' '.join(cmd)}")
    subprocess.run(cmd, cwd=API_ROOT, check=True)
    print("Done.")


if __name__ == "__main__":
    try:
        main()
    except subprocess.CalledProcessError as exc:
        sys.exit(exc.returncode)
