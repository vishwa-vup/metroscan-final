"""Central configuration (Phase 1 extended; cloud-hardened: §5/§6).

Secrets from environment only. In production (APP_ENV=production) the app
refuses to start on dev-default secrets — fail fast, never silently insecure.
"""

from functools import lru_cache

from pydantic import AliasChoices, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEV_DATABASE_URL = "postgresql+psycopg2://metroscan:changeme@localhost:5432/metroscan"
DEV_JWT_SECRET = "change-me-in-env"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "MetroScan"
    # Accepts APP_ENV or ENVIRONMENT (cloud platforms vary).
    app_env: str = Field(default="development",
                         validation_alias=AliasChoices("app_env", "environment"))
    api_v1_prefix: str = "/api/v1"

    database_url: str = Field(default=DEV_DATABASE_URL)

    jwt_secret: str = Field(default=DEV_JWT_SECRET)
    jwt_algorithm: str = Field(default="HS256")
    jwt_expire_minutes: int = Field(default=60 * 8)

    # Comma-separated; production origin(s) set via CORS_ORIGINS.
    cors_origins: str = Field(default="http://localhost:5173,http://localhost:3000")

    @property
    def cors_origin_list(self) -> list:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def is_production(self) -> bool:
        return self.app_env.lower() == "production"

    @model_validator(mode="after")
    def _reject_dev_defaults_in_production(self):
        if self.is_production:
            problems = []
            if self.jwt_secret == DEV_JWT_SECRET:
                problems.append("JWT_SECRET is the dev default — set a long random secret")
            if self.database_url == DEV_DATABASE_URL:
                problems.append("DATABASE_URL is the localhost dev default — set the Supabase pooler URL")
            if problems:
                raise ValueError("refusing production start: " + "; ".join(problems))
        return self

    # Pipeline tunables (all configurable per §§6,9,10)
    storage_dir: str = Field(default="backend/var/scans")
    max_upload_mb: int = Field(default=10)
    ocr_languages: str = Field(default="en")  # comma-separated, reproducible (§8.7)
    ocr_confidence_threshold: float = Field(default=0.70)  # §6 gate
    min_image_width: int = Field(default=400)
    min_image_height: int = Field(default=400)
    blur_threshold: float = Field(default=60.0)  # quality gate (Phase 6 enforces)


@lru_cache
def get_settings() -> Settings:
    return Settings()
