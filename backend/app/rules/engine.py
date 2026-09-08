"""Deterministic rule evaluation (§17 engine tasks). No autonomous legal verdicts."""

from pydantic import BaseModel

from app.rules.statuses import (
    COULD_NOT_RELIABLY_VERIFY,
    NOT_VISIBLE_WORDING,
    decide,
)


class Finding(BaseModel):
    rule_id: str
    clause: str
    field: str
    machine_status: str
    message: str
    evidence_boxes: list = []
    ocr_confidence: float = 0.0
    ruleset_version: str = ""
    review: dict | None = None  # Phase 4: inspector resolution attached here


def _check(rule: dict, field: dict | None) -> tuple[bool, str]:
    """Returns (rule_passed, reason). Missing evidence never passes."""
    ctype = rule["check_type"]
    if field is None or not field.get("value_raw"):
        return False, "missing"
    if ctype == "present":
        return True, "present"
    if ctype == "complete":
        required = rule.get("parameters", {}).get("require", [])
        meta = field.get("meta", {})
        lacking = [k for k in required if not meta.get(k)]
        return (not lacking), ("complete" if not lacking else f"lacking {','.join(lacking)}")
    if ctype in ("placement", "readability"):
        # Phase 6 activates these; without analysis evidence they cannot pass —
        # and uncertainty never becomes a violation claim.
        info = (field.get("meta", {}) or {}).get(ctype)
        if not info:
            return False, "no-analysis"
        return bool(info.get("passed")), str(info.get("note", ""))
    raise ValueError(f"unknown check_type '{ctype}'")


def evaluate(fields: dict, ruleset: dict, threshold: float = 0.70) -> list[Finding]:
    out: list[Finding] = []
    for rule in sorted([r for r in ruleset["rules"] if r.get("active")],
                       key=lambda r: r["rule_id"]):
        field = (fields or {}).get(rule["field"])
        passed, reason = _check(rule, field)
        conf = float((field or {}).get("confidence", 0.0) or 0.0)
        boxes = list((field or {}).get("evidence_boxes", []) or [])
        if field is None or not field.get("value_raw"):
            status = COULD_NOT_RELIABLY_VERIFY  # non-negotiable 1
            message = f"{NOT_VISIBLE_WORDING} ({rule['rule_id']}, {rule['clause']})."
        elif reason == "no-analysis":
            # Non-negotiable 16 / §19.8 / §20.12: analysis uncertainty is preserved
            # as uncertainty — it must never become an automatic violation claim.
            status = COULD_NOT_RELIABLY_VERIFY
            message = (f"Could not reliably verify {rule['rule_id']} ({rule['clause']}): "
                       f"analysis unavailable, uncertainty preserved.")
        else:
            status = decide(conf, passed, threshold)
            message = rule["message_pass"] if status != "POTENTIAL_NON_COMPLIANCE" \
                else rule["message_pending"]
            if status == COULD_NOT_RELIABLY_VERIFY:
                message = f"{message} Low OCR confidence ({conf:.0%}); needs a closer look."
        out.append(Finding(rule_id=rule["rule_id"], clause=rule["clause"],
                           field=rule["field"], machine_status=status, message=message,
                           evidence_boxes=boxes if rule.get("evidence_required") else [],
                           ocr_confidence=conf, ruleset_version=ruleset["version"]))
    return out
