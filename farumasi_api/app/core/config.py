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
        "http://localhost:3003,http://localhost:3004,http://localhost:3005"
    )

    # ── Redis ─────────────────────────────────────────────────────────────
    REDIS_URL: str = "redis://localhost:6379"

    # ── Business Logic ────────────────────────────────────────────────────
    PLATFORM_COMMISSION_RATE: float = 0.10  # 10% platform fee

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
    def _enforce_secret_in_non_dev(self) -> "Settings":
        """Phase-1 hardening: forbid the default SECRET_KEY outside development."""
        env = (self.ENVIRONMENT or "").lower()
        if env != "development" and self.SECRET_KEY == _DEFAULT_SECRET_KEY:
            raise ValueError(
                "FARUMASI: SECRET_KEY must be set to a strong, unique value "
                f"when ENVIRONMENT='{self.ENVIRONMENT}'. Refusing to start "
                "with the default development secret."
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
