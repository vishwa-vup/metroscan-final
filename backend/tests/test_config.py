"""Config tests: prod refuses dev-default secrets; CORS parsing; env aliases."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.core_config import Settings  # noqa: E402


def test_production_rejects_dev_jwt_secret():
    with pytest.raises(ValueError, match="JWT_SECRET"):
        Settings(app_env="production", jwt_secret="change-me-in-env",
                 database_url="postgresql+psycopg2://u:p@host:5432/db")


def test_production_rejects_dev_database_url():
    with pytest.raises(ValueError, match="DATABASE_URL"):
        Settings(app_env="production", jwt_secret="a" * 40,
                 database_url="postgresql+psycopg2://metroscan:changeme@localhost:5432/metroscan")


def test_production_accepts_real_secrets():
    s = Settings(app_env="production", jwt_secret="a" * 40,
                 database_url="postgresql+psycopg2://u:p@host:5432/db")
    assert s.is_production


def test_development_keeps_dev_defaults():
    assert not Settings().is_production


def test_cors_origins_parsed_and_stripped():
    s = Settings(cors_origins="https://a.example.com, https://b.example.com ,,")
    assert s.cors_origin_list == ["https://a.example.com", "https://b.example.com"]


def test_environment_alias_accepted(monkeypatch):
    monkeypatch.setenv("ENVIRONMENT", "production")
    monkeypatch.delenv("APP_ENV", raising=False)
    s = Settings(jwt_secret="a" * 40,
                 database_url="postgresql+psycopg2://u:p@host:5432/db")
    assert s.app_env == "production" and s.is_production
