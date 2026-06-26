from __future__ import annotations

from typing import List
import base64
import json

from pydantic import computed_field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


_DEFAULT_SECRET_KEY = "change-this-in-production"


class Settings(BaseSettings):
    # ── App ───────────────────────────────────────────────────────────────
    APP_NAME: str = "FARUMASI API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "development"

    # ── Database ──────────────────────────────────────────────────────────
    DATABASE_URL: str = "postgresql://farumasi:farumasi_pass@localhost:5432/farumasi_db"
    ASYNC_DATABASE_URL: str = "postgresql+asyncpg://farumasi:farumasi_pass@localhost:5432/farumasi_db"

    # ── JWT ───────────────────────────────────────────────────────────────
    SECRET_KEY: str = _DEFAULT_SECRET_KEY
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 10080  # 7 days — refreshed silently in clients
    REFRESH_TOKEN_EXPIRE_DAYS: int = 90

    # ── CORS ──────────────────────────────────────────────────────────────
    # Stored as a plain str so pydantic-settings v2 does NOT try json.loads().
    # Use the `cors_origins` property everywhere a List[str] is needed.
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,"
        "http://localhost:3003,http://localhost:3004,http://localhost:3005,http://localhost:3006,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,"
        "http://127.0.0.1:3003,http://127.0.0.1:3004,http://127.0.0.1:3005,http://127.0.0.1:3006,"
        "http://localhost:8080,http://127.0.0.1:8080"
    )

    # ── Redis ─────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ── Business Logic ────────────────────────────────────────────────────
    PLATFORM_COMMISSION_RATE: float = 0.10  # 10% platform fee (fallback when seller has no rate)
    MIN_WITHDRAWAL_AMOUNT: float = 1000.0  # whole RWF

    # ── Email (owner verification for sensitive changes) ───────────────────
    SMTP_HOST: str = ""
    SMTP_PORT: int = 587
    SMTP_USER: str = ""
    SMTP_PASSWORD: str = ""
    SMTP_FROM_EMAIL: str = ""
    SMTP_USE_TLS: bool = True
    SMTP_FROM_NAME: str = "FARUMASI"
    # Brevo HTTP API — works on Render free tier (SMTP port 587 is blocked there).
    BREVO_API_KEY: str = ""
    EMAIL_VERIFICATION_EXPIRE_MINUTES: int = 10

    # ── SMS (verification / password reset fallback) ───────────────────────
    # Providers: africas_talking | http | (empty = disabled)
    SMS_PROVIDER: str = ""
    AFRICAS_TALKING_USERNAME: str = ""
    AFRICAS_TALKING_API_KEY: str = ""
    SMS_SENDER_ID: str = "FARUMASI"
    SMS_HTTP_URL: str = ""

    # ── Patient payments ─────────────────────────────────────────────────
    # sandbox = auto-confirm MoMo/card for local E2E; live = MTN MADAPI + Pesapal
    PAYMENT_MODE: str = "sandbox"
    PAYMENT_CURRENCY: str = "RWF"
    PAYMENT_PROCESSING_FEE_PERCENT: float = 3.8

    # MTN MADAPI — developers.mtn.com app (Payments V1, Rwanda)
    MTN_MADAPI_CONSUMER_KEY: str = ""
    MTN_MADAPI_CONSUMER_SECRET: str = ""
    MTN_MADAPI_BASE_URL: str = "https://api.mtn.com/v1"
    MTN_MADAPI_COUNTRY_CODE: str = "RW"
    MTN_MADAPI_TARGET_SYSTEM: str = ""
    MTN_MADAPI_CALLBACK_URL: str = ""

    # Pesapal — card checkout (Rwanda)
    PESAPAL_CONSUMER_KEY: str = ""
    PESAPAL_CONSUMER_SECRET: str = ""
    PESAPAL_ENV: str = "sandbox"  # sandbox | live
    PESAPAL_IPN_ID: str = ""
    PESAPAL_IPN_URL: str = ""

    # Legacy Flutterwave (optional fallback — not used when MTN/Pesapal configured)
    FLUTTERWAVE_SECRET_KEY: str = ""
    FLUTTERWAVE_CLIENT_ID: str = ""
    FLUTTERWAVE_CLIENT_SECRET: str = ""
    FLUTTERWAVE_ENCRYPTION_KEY: str = ""
    FLUTTERWAVE_PUBLIC_KEY: str = ""
    FLUTTERWAVE_WEBHOOK_SECRET: str = ""
    FLUTTERWAVE_PAYMENT_OPTIONS: str = "mobilemoneyrwanda,card"
    API_PUBLIC_URL: str = "http://localhost:8000"
    PATIENT_PORTAL_URL: str = "http://localhost:3002"

    # ── MTN MoMo Collection (direct API — alternative to Flutterwave) ─────
    # Primary key = subscription key from https://momodeveloper.mtn.com → Profile
    # after subscribing to "Collection" product. Run scripts/provision_mtn_momo.py
    # (sandbox) to generate MTN_MOMO_API_USER + MTN_MOMO_API_KEY.
    MTN_MOMO_PRIMARY_KEY: str = ""
    MTN_MOMO_SECONDARY_KEY: str = ""
    MTN_MOMO_SUBSCRIPTION_KEY: str = ""
    MTN_MOMO_API_USER: str = ""
    MTN_MOMO_API_KEY: str = ""
    MTN_MOMO_ENV: str = "sandbox"  # sandbox | production
    MTN_MOMO_TARGET_ENVIRONMENT: str = "sandbox"  # sandbox | mtnrwanda (live Rwanda)
    MTN_MOMO_CURRENCY: str = "RWF"
    MTN_MOMO_CALLBACK_URL: str = ""  # e.g. https://api.farumasi.com/api/v1/webhooks/mtn-momo

    # OAuth (public anon values — exposed via /config/public for mobile clients)
    SUPABASE_URL: str = ""
    SUPABASE_ANON_KEY: str = ""
    GOOGLE_WEB_CLIENT_ID: str = ""

    # ── Translation (Google Cloud Translation API v2) ─────────────────────
    # Cached strings are stored in PostgreSQL — repeat lookups cost nothing.
    GOOGLE_TRANSLATE_API_KEY: str = ""
    TRANSLATION_ENABLED: bool = True
    TRANSLATION_DAILY_CHAR_LIMIT: int = 500_000
    TRANSLATION_MAX_BATCH_SIZE: int = 50
    TRANSLATION_MAX_TEXT_LENGTH: int = 5000

    # ── Firebase Cloud Messaging (push when app is killed) ─────────────────
    FCM_ENABLED: bool = True
    # Full service-account JSON string, or base64-encoded JSON (Render-friendly).
    FIREBASE_SERVICE_ACCOUNT_JSON: str = ""

    # ── File Storage ──────────────────────────────────────────────────────
    STORAGE_BACKEND: str = "local"  # local | s3 | cloudinary
    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10

    # AWS S3
    AWS_ACCESS_KEY_ID: str = ""
    AWS_SECRET_ACCESS_KEY: str = ""
    AWS_BUCKET_NAME: str = ""
    AWS_REGION: str = "us-east-1"
    AWS_S3_ENDPOINT_URL: str = ""

    # Cloudinary
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def normalise_cors(cls, v: object) -> str:
        """Accept comma-str or JSON list; always store as comma-separated string."""
        if isinstance(v, list):
            return ",".join(str(o) for o in v)
        return str(v) if v is not None else ""

    @model_validator(mode="after")
    def _resolve_storage_backend(self) -> "Settings":
        """Prefer durable object storage in production when credentials are configured."""
        explicit = (self.STORAGE_BACKEND or "local").lower()
        has_cloudinary = bool(
            self.CLOUDINARY_CLOUD_NAME
            and self.CLOUDINARY_API_KEY
            and self.CLOUDINARY_API_SECRET
        )
        has_s3 = bool(
            self.AWS_BUCKET_NAME
            and self.AWS_ACCESS_KEY_ID
            and self.AWS_SECRET_ACCESS_KEY
        )
        env = (self.ENVIRONMENT or "development").lower()

        if explicit in ("s3", "cloudinary"):
            self.STORAGE_BACKEND = explicit
        elif has_cloudinary:
            self.STORAGE_BACKEND = "cloudinary"
        elif has_s3:
            self.STORAGE_BACKEND = "s3"
        else:
            self.STORAGE_BACKEND = "local"

        if env != "development" and self.STORAGE_BACKEND == "local":
            import logging

            logging.getLogger(__name__).warning(
                "STORAGE_BACKEND=local in %s: uploaded chat/media files are stored on "
                "ephemeral disk and will disappear after redeploy. Set CLOUDINARY_* or "
                "AWS_* env vars (or STORAGE_BACKEND=cloudinary|s3) for permanent storage.",
                self.ENVIRONMENT,
            )
        return self

    @model_validator(mode="after")
    def _derive_async_database_url(self) -> "Settings":
        """When only DATABASE_URL is set (e.g. Render/Railway), derive asyncpg URL."""
        url = self.DATABASE_URL.replace("postgres://", "postgresql://", 1)
        if not url.startswith("postgresql://"):
            return self
        sync_tail = url.split("@", 1)[-1] if "@" in url else ""
        async_tail = (
            self.ASYNC_DATABASE_URL.split("@", 1)[-1]
            if "@" in self.ASYNC_DATABASE_URL
            else ""
        )
        if sync_tail and sync_tail != async_tail:
            self.ASYNC_DATABASE_URL = url.replace(
                "postgresql://", "postgresql+asyncpg://", 1
            )
        return self

    @model_validator(mode="after")
    def _enforce_secret_in_non_dev(self) -> "Settings":
        """Phase-1 hardening: forbid the default SECRET_KEY outside development."""
        env = (self.ENVIRONMENT or "").lower()
        if env != "development" and self.SECRET_KEY == _DEFAULT_SECRET_KEY:
            raise ValueError(
                "FARUMASI: SECRET_KEY must be set to a strong, unique value "
                f"when ENVIRONMENT='{self.ENVIRONMENT}'. Refusing to start "
                "with the default development secret."
            )
        # PAYMENT_MODE=sandbox is allowed in production for fake checkout until
        # Flutterwave live credentials are approved (orders auto-confirm, no gateway).
        return self

    @model_validator(mode="after")
    def _normalize_mtn_momo(self) -> "Settings":
        def clean(v: str) -> str:
            s = (v or "").strip().strip('"').strip("'")
            return s.replace("\r", "").replace("\n", "")

        self.MTN_MOMO_PRIMARY_KEY = clean(self.MTN_MOMO_PRIMARY_KEY)
        self.MTN_MOMO_SECONDARY_KEY = clean(self.MTN_MOMO_SECONDARY_KEY)
        self.MTN_MOMO_SUBSCRIPTION_KEY = clean(self.MTN_MOMO_SUBSCRIPTION_KEY)
        self.MTN_MOMO_API_USER = clean(self.MTN_MOMO_API_USER)
        self.MTN_MOMO_API_KEY = clean(self.MTN_MOMO_API_KEY)

        primary = self.MTN_MOMO_PRIMARY_KEY
        sub = self.MTN_MOMO_SUBSCRIPTION_KEY
        if primary and not sub:
            self.MTN_MOMO_SUBSCRIPTION_KEY = primary
        elif sub and not primary:
            self.MTN_MOMO_PRIMARY_KEY = sub

        env = (self.MTN_MOMO_ENV or "sandbox").lower()
        if env == "production" and self.MTN_MOMO_TARGET_ENVIRONMENT == "sandbox":
            self.MTN_MOMO_TARGET_ENVIRONMENT = "mtnrwanda"
        return self

    @computed_field  # type: ignore[misc]
    @property
    def cors_origins(self) -> List[str]:
        """Return CORS_ORIGINS as a list, ready for FastAPI CORSMiddleware."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    def firebase_service_account(self) -> dict | None:
        raw = (self.FIREBASE_SERVICE_ACCOUNT_JSON or "").strip()
        if not raw:
            return None
        try:
            if raw.startswith("{"):
                return json.loads(raw)
            decoded = base64.b64decode(raw).decode("utf-8")
            return json.loads(decoded)
        except Exception:
            return None

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
