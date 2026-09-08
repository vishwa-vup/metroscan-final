"""Rule endpoints — Phase 7: listing needs login, validation needs admin."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.rbac import get_current_user, require_admin
from app.rules.loader import (
    available_versions,
    get_active_ruleset,
    validate_ruleset,
)

router = APIRouter(prefix="/rules", tags=["rules"])


class ValidateBody(BaseModel):
    ruleset: dict


@router.get("")
def list_rules(user: dict = Depends(get_current_user)):
    rs = get_active_ruleset()
    return {"version": rs["version"], "versions": available_versions(),
            "rules": [{k: r[k] for k in ("rule_id", "clause", "title", "field",
                                         "check_type", "active")} for r in rs["rules"]]}


@router.post("/validate")
def validate(body: ValidateBody, user: dict = Depends(require_admin)):
    """Only admins manage rule versions (§24.8)."""
    errors = validate_ruleset(body.ruleset)
    if errors:
        raise HTTPException(status_code=422, detail={"valid": False, "errors": errors})
    return {"valid": True, "errors": []}
