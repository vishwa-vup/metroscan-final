"""Auth + admin endpoints (§24–25). JWT required on all protected APIs (rule 10)."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth.jwt import create_token
from app.auth.passwords import hash_password, verify_password
from app.auth.rbac import ADMIN, require_admin, get_current_user
from app.db import repository as repo
from app.db import session as dbs
from app.db.models import Business, User

auth_router = APIRouter(prefix="/auth", tags=["auth"])
admin_router = APIRouter(prefix="/admin", tags=["admin"])


class LoginBody(BaseModel):
    email: str
    password: str


class UserCreate(BaseModel):
    email: str
    password: str
    role: str = "inspector"
    business_name: str = ""


class UserUpdate(BaseModel):
    role: str | None = None
    password: str | None = None


def _user_payload(u: User) -> dict:
    return {"id": u.id, "email": u.email, "role": u.role, "business_id": u.business_id}


@auth_router.post("/login")
def login(body: LoginBody):
    from app.observability import log_event

    if not repo.db_available():
        raise HTTPException(status_code=503, detail="database temporarily unreachable, retry shortly")
    s = dbs.session_factory()()
    try:
        user = s.query(User).filter_by(email=body.email).first()
        if user is None or not verify_password(body.password, user.password_hash):
            # Identical response whether the email is unknown or the password
            # is wrong — no existence leak. This endpoint NEVER creates users.
            log_event("auth.login_failed", actor=body.email, reason="invalid-credentials")
            raise HTTPException(status_code=401, detail="invalid credentials")
        token = create_token(user.email, user.role, user.business_id)
        log_event("auth.login", actor=user.email, role=user.role)
        return {"access_token": token, "token_type": "bearer",
                "role": user.role, "email": user.email}
    finally:
        s.close()


@auth_router.get("/me")
def me(user: dict = Depends(get_current_user)):
    return {"email": user["email"], "role": user["role"], "business_id": user["business_id"]}


@admin_router.get("/users")
def list_users(user: dict = Depends(require_admin)):
    s = dbs.session_factory()()
    try:
        return [_user_payload(u) for u in s.query(User).order_by(User.id).all()]
    finally:
        s.close()


@admin_router.post("/users", status_code=201)
def create_user(body: UserCreate, user: dict = Depends(require_admin)):
    if body.role not in ("inspector", "business", "admin"):
        raise HTTPException(status_code=422, detail="unknown role")
    s = dbs.session_factory()()
    try:
        if s.query(User).filter_by(email=body.email).first():
            raise HTTPException(status_code=409, detail="email exists")
        biz_id = None
        if body.role == "business":
            if not body.business_name.strip():
                raise HTTPException(status_code=422, detail="business_name required")
            biz = s.query(Business).filter_by(name=body.business_name).first()
            if biz is None:
                biz = Business(name=body.business_name)
                s.add(biz)
                s.flush()
            biz_id = biz.id
        u = User(email=body.email, password_hash=hash_password(body.password),
                 role=body.role, business_id=biz_id)
        s.add(u)
        s.commit()
        return _user_payload(u)
    finally:
        s.close()


@admin_router.patch("/users/{user_id}")
def update_user(user_id: int, body: UserUpdate, user: dict = Depends(require_admin)):
    s = dbs.session_factory()()
    try:
        u = s.get(User, user_id)
        if u is None:
            raise HTTPException(status_code=404, detail="user not found")
        if body.role is not None:
            if body.role not in ("inspector", "business", "admin"):
                raise HTTPException(status_code=422, detail="unknown role")
            u.role = body.role
        if body.password is not None:
            u.password_hash = hash_password(body.password)
        s.commit()
        return _user_payload(u)
    finally:
        s.close()
