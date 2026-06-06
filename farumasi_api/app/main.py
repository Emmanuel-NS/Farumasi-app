from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.core.config import settings
from app.core.database import engine
from app.core.exceptions import register_exception_handlers
from app.api.v1.router import api_router

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage startup / shutdown lifecycle."""
    logger.info("FARUMASI API starting up...")
    # Phase-1 stabilization: fail fast if the database is unreachable.
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        logger.info("Database connection OK")
        try:
            async with engine.begin() as conn:
                await conn.execute(
                    text(
                        "ALTER TABLE health_articles "
                        "ADD COLUMN IF NOT EXISTS is_sponsored "
                        "BOOLEAN NOT NULL DEFAULT false"
                    )
                )
                for stmt in (
                    "ALTER TABLE partner_companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)",
                    "ALTER TABLE partner_companies ADD COLUMN IF NOT EXISTS description TEXT",
                    "ALTER TABLE partner_companies ADD COLUMN IF NOT EXISTS commission_rate_percent NUMERIC(5,2)",
                    "ALTER TABLE partner_companies ADD COLUMN IF NOT EXISTS is_open BOOLEAN NOT NULL DEFAULT true",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false",
                    "ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500)",
                    "ALTER TABLE pharmacies ADD COLUMN IF NOT EXISTS commission_rate_percent NUMERIC(5,2)",
                    "ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(120)",
                    "ALTER TABLE withdrawal_requests ADD COLUMN IF NOT EXISTS payment_proof_url VARCHAR(500)",
                    """
                    CREATE TABLE IF NOT EXISTS seller_change_requests (
                        id VARCHAR(36) PRIMARY KEY,
                        seller_type VARCHAR(50) NOT NULL,
                        pharmacy_id VARCHAR(36) REFERENCES pharmacies(id) ON DELETE CASCADE,
                        partner_company_id VARCHAR(36) REFERENCES partner_companies(id) ON DELETE CASCADE,
                        owner_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        requested_by_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        field_name VARCHAR(100) NOT NULL,
                        current_value VARCHAR(255),
                        proposed_value VARCHAR(255) NOT NULL,
                        status VARCHAR(50) NOT NULL DEFAULT 'pending',
                        admin_note TEXT,
                        partner_note TEXT,
                        resolved_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """,
                ):
                    await conn.execute(text(stmt))
            logger.info("Optional DB columns ensured")
        except Exception as exc:  # noqa: BLE001
            logger.warning("Could not ensure optional DB columns: %s", exc)
    except Exception as exc:  # noqa: BLE001
        logger.critical("Database startup ping FAILED: %s", exc)
        raise RuntimeError(
            f"Cannot start FARUMASI API: database is unreachable at "
            f"{settings.ASYNC_DATABASE_URL.split('@')[-1]} ({exc})"
        ) from exc
    yield
    logger.info("FARUMASI API shutting down...")
    await engine.dispose()


def create_application() -> FastAPI:
    application = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "Centralized digital pharmacy and healthcare coordination platform. "
            "Connects patients, doctors, hospitals, pharmacists, pharmacies, "
            "partners, riders, and super admins."
        ),
        openapi_url="/api/v1/openapi.json",
        docs_url="/api/v1/docs",
        redoc_url="/api/v1/redoc",
        lifespan=lifespan,
        redirect_slashes=False,
    )

    # ── CORS ──────────────────────────────────────────────────────────────
    application.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Exception handlers ────────────────────────────────────────────────
    register_exception_handlers(application)

    # ── Routers ───────────────────────────────────────────────────────────
    application.include_router(api_router, prefix="/api/v1")

    # ── Static uploads (local storage backend) ────────────────────────────
    upload_dir = getattr(settings, "LOCAL_UPLOAD_DIR", None) or settings.UPLOAD_DIR
    os.makedirs(upload_dir, exist_ok=True)
    application.mount("/uploads", StaticFiles(directory=upload_dir), name="uploads")

    return application


app = create_application()


@app.get("/health", tags=["health"])
async def health_check() -> JSONResponse:
    return JSONResponse({"status": "healthy", "version": settings.APP_VERSION})
