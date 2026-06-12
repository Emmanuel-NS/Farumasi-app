from __future__ import annotations

from typing import List

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
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── CORS ──────────────────────────────────────────────────────────────
    # Stored as a plain str so pydantic-settings v2 does NOT try json.loads().
    # Use the `cors_origins` property everywhere a List[str] is needed.
    CORS_ORIGINS: str = (
        "http://localhost:3000,http://localhost:3001,http://localhost:3002,"
        "http://localhost:3003,http://localhost:3004,http://localhost:3005,"
        "http://127.0.0.1:3000,http://127.0.0.1:3001,http://127.0.0.1:3002,"
        "http://127.0.0.1:3003,http://127.0.0.1:3004,http://127.0.0.1:3005,"
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
    EMAIL_VERIFICATION_EXPIRE_MINUTES: int = 10

    # ── SMS (verification / password reset fallback) ───────────────────────
    # Providers: africas_talking | http | (empty = disabled)
    SMS_PROVIDER: str = ""
    AFRICAS_TALKING_USERNAME: str = ""
    AFRICAS_TALKING_API_KEY: str = ""
    SMS_SENDER_ID: str = "FARUMASI"
    SMS_HTTP_URL: str = ""

    # ── Patient payments (Pesapal) ────────────────────────────────────────
    # sandbox = auto-confirm for local/dev E2E; live = Pesapal hosted checkout
    PAYMENT_MODE: str = "sandbox"
    PAYMENT_CURRENCY: str = "RWF"
    PESAPAL_ENV: str = "sandbox"  # sandbox | live
    PESAPAL_CONSUMER_KEY: str = ""
    PESAPAL_CONSUMER_SECRET: str = ""
    PESAPAL_IPN_ID: str = ""
    PESAPAL_IPN_URL: str = ""
    API_PUBLIC_URL: str = "http://localhost:8000"
    PATIENT_PORTAL_URL: str = "http://localhost:3002"

    # ── Translation (Google Cloud Translation API v2) ─────────────────────
    # Set GOOGLE_TRANSLATE_API_KEY from Google Cloud Console (Translation API).
    # Cached strings are stored in PostgreSQL — repeat lookups cost nothing.
    GOOGLE_TRANSLATE_API_KEY: str = ""
    TRANSLATION_ENABLED: bool = True
    TRANSLATION_DAILY_CHAR_LIMIT: int = 500_000
    TRANSLATION_MAX_BATCH_SIZE: int = 50
    TRANSLATION_MAX_TEXT_LENGTH: int = 5000

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
        if env != "development" and self.PAYMENT_MODE == "sandbox":
            raise ValueError(
                "FARUMASI: PAYMENT_MODE must be 'live' when ENVIRONMENT is not development."
            )
        return self

    @computed_field  # type: ignore[misc]
    @property
    def cors_origins(self) -> List[str]:
        """Return CORS_ORIGINS as a list, ready for FastAPI CORSMiddleware."""
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()
