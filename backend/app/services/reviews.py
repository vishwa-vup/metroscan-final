"""Inspector review actions + audit trail (§21, §4 stages 16–17). Machine findings immutable."""

from app.rules.statuses import (
    INSPECTOR_CONFIRMED_COMPLIANT,
    INSPECTOR_CONFIRMED_ISSUE,
    PENDING_STATUSES,
)
from app.services.scan_pipeline import AWAITING_REVIEW, REVIEW_COMPLETE, utcnow

CONFIRM = "confirm"  # pending → INSPECTOR_CONFIRMED_ISSUE
CLEAR = "clear"      # pending → INSPECTOR_CONFIRMED_COMPLIANT


class ReviewError(ValueError):
    pass


def record_review(rec, rule_id: str, action: str, reviewer: str, note: str = "") -> dict:
    """Resolve one pending finding. Original machine finding is never deleted/modified
    except for the attached review record (§21 req 17, non-negotiable 12)."""
    if action not in (CONFIRM, CLEAR):
        raise ReviewError("action must be 'confirm' or 'clear'")
    if not (reviewer or "").strip():
        raise ReviewError("reviewer identity is required")
    finding = next((f for f in rec.findings if f.get("rule_id") == rule_id), None)
    if finding is None:
        raise ReviewError(f"unknown rule_id '{rule_id}'")
    if finding.get("machine_status") not in PENDING_STATUSES:
        raise ReviewError("only pending machine findings can be reviewed")
    if finding.get("review") is not None:
        raise ReviewError("finding already reviewed")
    new_status = INSPECTOR_CONFIRMED_ISSUE if action == CONFIRM else INSPECTOR_CONFIRMED_COMPLIANT
    review = {"rule_id": rule_id, "action": action, "reviewer": reviewer.strip(),
              "note": note or "", "at": utcnow(),
              "prev_status": finding["machine_status"], "new_status": new_status}
    finding["review"] = review  # attached, machine fields untouched
    rec.reviews.append({"scan_id": rec.scan_id, **review})
    pending_left = [f for f in rec.findings
                    if f.get("machine_status") in PENDING_STATUSES and not f.get("review")]
    rec.processing_state = REVIEW_COMPLETE if not pending_left else AWAITING_REVIEW
    return review
