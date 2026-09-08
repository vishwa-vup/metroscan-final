"""Phase 0 smoke tests: backend starts, versioning + safety wording hold."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402

client = TestClient(app)


def test_healthz():
    r = client.get("/healthz")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_api_versioned_and_decision_support_only():
    r = client.get("/api/v1/version")
    assert r.status_code == 200
    body = r.json()
    assert body["api"] == "v1"
    # Non-negotiable: never an autonomous legal verdict.
    assert "decision support only" in body["disclaimer"]


def test_no_stack_trace_leak():
    # Unknown route -> consistent error shape, never a traceback.
    r = client.get("/api/v1/does-not-exist")
    assert r.status_code == 404
    assert "Traceback" not in r.text
