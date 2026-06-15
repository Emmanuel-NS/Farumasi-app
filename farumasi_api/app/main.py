from __future__ import annotations

import logging
from contextlib import asynccontextmanager

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, JSONResponse
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
    from app.services.background_tasks import start_background_tasks, stop_background_tasks
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
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(10) NOT NULL DEFAULT 'en'",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS notification_prefs JSONB",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT false",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT false",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT false",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS session_invalidated_at TIMESTAMPTZ",
                    "ALTER TABLE users ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ",
                    "ALTER TABLE patient_profiles ADD COLUMN IF NOT EXISTS pin_hash VARCHAR(128)",
                    "ALTER TABLE digital_prescriptions ADD COLUMN IF NOT EXISTS valid_until TIMESTAMPTZ",
                    """
                    CREATE TABLE IF NOT EXISTS platform_settings (
                        key VARCHAR(120) PRIMARY KEY,
                        value JSONB NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """,
                    """
                    CREATE TABLE IF NOT EXISTS data_export_jobs (
                        id VARCHAR(36) PRIMARY KEY,
                        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        status VARCHAR(50) NOT NULL DEFAULT 'pending',
                        file_url VARCHAR(500),
                        error_message TEXT,
                        completed_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """,
                    """
                    CREATE TABLE IF NOT EXISTS refund_requests (
                        id VARCHAR(36) PRIMARY KEY,
                        order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                        patient_user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        amount NUMERIC(12,2) NOT NULL,
                        currency VARCHAR(3) NOT NULL DEFAULT 'RWF',
                        reason TEXT,
                        status VARCHAR(50) NOT NULL DEFAULT 'pending',
                        processed_by_user_id VARCHAR(36) REFERENCES users(id) ON DELETE SET NULL,
                        processed_at TIMESTAMPTZ,
                        payment_reference VARCHAR(120),
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """,
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
                    """
                    CREATE TABLE IF NOT EXISTS owner_payout_profiles (
                        id VARCHAR(36) PRIMARY KEY,
                        owner_user_id VARCHAR(36) NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                        payout_method VARCHAR(50) NOT NULL,
                        payout_details JSONB NOT NULL,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """,
                    """
                    CREATE TABLE IF NOT EXISTS email_verification_challenges (
                        id VARCHAR(36) PRIMARY KEY,
                        user_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                        purpose VARCHAR(80) NOT NULL,
                        code_hash VARCHAR(255) NOT NULL,
                        expires_at TIMESTAMPTZ NOT NULL,
                        consumed_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """,
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50)",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_phone VARCHAR(20)",
                    "ALTER TABLE orders ADD COLUMN IF NOT EXISTS defer_delivery_fee BOOLEAN NOT NULL DEFAULT false",
                    "ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS estimated_distance_km NUMERIC(8,2)",
                    """
                    CREATE TABLE IF NOT EXISTS payment_transactions (
                        id VARCHAR(36) PRIMARY KEY,
                        order_id VARCHAR(36) NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
                        amount NUMERIC(12,2) NOT NULL,
                        currency VARCHAR(3) NOT NULL DEFAULT 'RWF',
                        provider VARCHAR(50) NOT NULL,
                        method VARCHAR(50) NOT NULL,
                        phone VARCHAR(20) NOT NULL,
                        status VARCHAR(50) NOT NULL DEFAULT 'pending',
                        external_id VARCHAR(255),
                        idempotency_key VARCHAR(120) NOT NULL UNIQUE,
                        provider_reference VARCHAR(255),
                        failure_reason TEXT,
                        paid_at TIMESTAMPTZ,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
                    )
                    """,
                    """
                    CREATE TABLE IF NOT EXISTS translation_cache (
                        id VARCHAR(36) PRIMARY KEY,
                        source_hash VARCHAR(64) NOT NULL,
                        source_lang VARCHAR(10) NOT NULL,
                        target_lang VARCHAR(10) NOT NULL,
                        context VARCHAR(120) NOT NULL,
                        source_text TEXT NOT NULL,
                        translated_text TEXT NOT NULL,
                        provider VARCHAR(32) NOT NULL,
                        char_count INTEGER NOT NULL,
                        hit_count INTEGER NOT NULL DEFAULT 0,
                        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                        CONSTRAINT uq_translation_cache_hash_target_context
                            UNIQUE (source_hash, target_lang, context)
                    )
                    """,
                    """
                    CREATE TABLE IF NOT EXISTS translation_usage_daily (
                        usage_date DATE PRIMARY KEY,
                        chars_used BIGINT NOT NULL DEFAULT 0,
                        api_calls INTEGER NOT NULL DEFAULT 0,
                        updated_at TIMESTAMPTZ NOT NULL
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
    await start_background_tasks()
    backend = (settings.STORAGE_BACKEND or "local").lower()
    if backend == "cloudinary":
        logger.info("File storage: Cloudinary (%s)", settings.CLOUDINARY_CLOUD_NAME or "configured")
    elif backend == "s3":
        logger.info("File storage: S3 (%s)", settings.AWS_BUCKET_NAME or "configured")
    else:
        logger.warning(
            "File storage: LOCAL disk (%s). Chat/prescription uploads will NOT survive redeploys.",
            settings.UPLOAD_DIR,
        )
    yield
    await stop_background_tasks()
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
        allow_origin_regex=r"http://(localhost|127\.0\.0\.1):\d+",
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


@app.get("/payment-return", response_class=HTMLResponse, tags=["payments"])
async def payment_return(order_id: str = "") -> HTMLResponse:
    """Pesapal redirect target after checkout (mobile app + API fallback)."""
    oid = order_id or ""
    return HTMLResponse(
        f"""<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Payment — FARUMASI</title>
<style>
  body{{font-family:system-ui,sans-serif;background:#edfdf6;margin:0;padding:2rem;text-align:center;color:#0f172a}}
  .card{{max-width:420px;margin:2rem auto;background:#fff;border-radius:16px;padding:2rem;box-shadow:0 8px 30px #0f172a14}}
  h1{{color:#1e9e68;font-size:1.35rem;margin:0 0 .5rem}}
  p{{color:#64748b;line-height:1.5}}
</style></head><body>
<div class="card">
  <h1>Thank you!</h1>
  <p>Your payment is being confirmed. Return to the <strong>FARUMASI</strong> app to see your order status.</p>
  {f'<p style="font-size:.85rem">Order: {oid}</p>' if oid else ''}
</div></body></html>"""
    )
