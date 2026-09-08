"""Review endpoints — Phase 7: inspector/admin only, reviewer = JWT identity."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.rbac import check_scan_access, require_inspector
from app.services.reviews import ReviewError, record_review
from app.services.scan_pipeline import get_store

router = APIRouter(prefix="/scans/{scan_id}/reviews", tags=["reviews"])


class ReviewBody(BaseModel):
    rule_id: str
    action: str  # confirm | clear
    reviewer: str = ""  # optional note-name; JWT identity is authoritative
    note: str = ""


@router.post("", status_code=201)
def post_review(scan_id: str, body: ReviewBody,
                user: dict = Depends(require_inspector)):
    """Business accounts cannot perform enforcement review actions (§24.6)."""
    rec = check_scan_access(scan_id, user)
    reviewer = body.reviewer.strip() or user["email"]
    try:
        review = record_review(rec, body.rule_id, body.action, reviewer, body.note)
    except ReviewError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    get_store().save(rec)
    from app.db import repository as repo
    from app.observability import log_event
    repo.save_scan(rec)  # history + audit survive restarts when DB is reachable
    repo.record_audit(scan_id, reviewer, f"review.{body.action}", body.rule_id)
    log_event("review.recorded", scan_id=scan_id, rule_id=body.rule_id,
              action=body.action, reviewer=reviewer,
              prev_status=review["prev_status"], new_status=review["new_status"],
              note_chars=len(body.note or ""))  # note content never logged
    return review
