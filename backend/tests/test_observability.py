"""Observability tests (§31): structured, scrubbed, correlated."""

import json
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.observability import log_event  # noqa: E402


def test_log_event_structured_and_scrubbed(caplog):
    with caplog.at_level(logging.INFO, logger="metroscan"):
        log_event("auth.login", actor="a@b.c", password="SUPERSECRET",
                  token="TOK123", scan_id="s1", duration_ms=12.34)
    assert "SUPERSECRET" not in caplog.text  # no secrets (§31.11–13)
    assert "TOK123" not in caplog.text
    line = next(m for m in caplog.messages if '"auth.login"' in m)
    rec = json.loads(line)
    assert rec["scan_id"] == "s1" and rec["duration_ms"] == 12.3 and rec["ts"]


def test_responses_carry_request_id():
    c = TestClient(app)
    r = c.get("/healthz")
    assert r.status_code == 200 and r.headers.get("X-Request-ID")  # §31.9
