"""Structured observability logs (§31): scan ids, stage names, rule-set + pipeline
versions, timings, request ids. Never: secrets, passwords, tokens, image content."""

import json
import logging
import uuid
from datetime import datetime, timezone

logger = logging.getLogger("metroscan")  # propagates to root (uvicorn/caplog friendly)

BANNED_SUBSTRINGS = ("password", "passwd", "token", "secret", "api_key", "apikey", "jwt")


def new_request_id() -> str:
    return uuid.uuid4().hex[:12]


def _scrub(kv: dict) -> dict:
    return {k: v for k, v in kv.items()
            if not any(b in k.lower() for b in BANNED_SUBSTRINGS)}


def log_event(event: str, scan_id: str | None = None, request_id: str | None = None,
              duration_ms: float | None = None, **kv) -> None:
    record = {"ts": datetime.now(timezone.utc).isoformat(), "event": event}
    if scan_id:
        record["scan_id"] = scan_id
    if request_id:
        record["request_id"] = request_id
    if duration_ms is not None:
        record["duration_ms"] = round(duration_ms, 1)
    record.update(_scrub(kv))
    logger.info(json.dumps(record, default=str))
