"""RBAC + ownership dependencies (§42 rbac tasks, §24). Backend-enforced; frontend
guards are usability only (§24 rule 12)."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.jwt import AuthError, decode_token
from app.db import repository as repo
from app.db import session as dbs
from app.db.models import User

bearer = HTTPBearer(auto_error=False)

INSPECTOR = "inspector"
BUSINESS = "business"
ADMIN = "admin"


def get_current_user(creds: HTTPAuthorizationCredentials | None = Depends(bearer)) -> dict:
    if creds is None or not creds.credentials:
        raise HTTPException(status_code=401, detail="authentication required")
    try:
        claims = decode_token(creds.credentials)
    except AuthError as exc:
        raise HTTPException(status_code=401, detail=str(exc))
    if not repo.db_available():
        # Demo without DB: trust the signed claims (signature still verified).
        return {"email": claims["sub"], "role": claims.get("role", INSPECTOR),
                "business_id": claims.get("business_id")}
    s = dbs.session_factory()()
    try:
        user = s.query(User).filter_by(email=claims["sub"]).first()
        if user is None:
            raise HTTPException(status_code=401, detail="unknown user")
        return {"email": user.email, "role": user.role, "business_id": user.business_id}
    finally:
        s.close()


def require_roles(*roles: str):
    def _dep(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=403, detail="insufficient role")
        return user
    return _dep


require_inspector = require_roles(INSPECTOR, ADMIN)
require_admin = require_roles(ADMIN)


def check_scan_access(scan_id: str, user: dict):
    """Business isolation (§24.13): businesses see only their own scans; inspectors/admins all.
    Store-first with DB hydration after restarts; cross-business access returns 404
    (no existence leak)."""
    from app.services.scan_pipeline import get_store

    rec = get_store().get(scan_id)
    if rec is None:
        rec = repo.load_scan(scan_id)  # post-restart hydration from PostgreSQL mirror
    if rec is None:
        raise HTTPException(status_code=404, detail="scan not found")
    if user["role"] == BUSINESS and rec.business_id != user["business_id"]:
        raise HTTPException(status_code=404, detail="scan not found")
    return rec
