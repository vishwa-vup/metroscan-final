"""JWT creation/validation/expiry (§42 jwt tasks). Secrets from env only — never logged."""

from datetime import datetime, timedelta, timezone

from jose import ExpiredSignatureError, JWTError, jwt

from app.core_config import get_settings


class AuthError(Exception):
    pass


def create_token(email: str, role: str, business_id: int | None = None,
                 minutes: int | None = None) -> str:
    s = get_settings()
    exp = datetime.now(timezone.utc) + timedelta(
        minutes=minutes if minutes is not None else s.jwt_expire_minutes)
    return jwt.encode({"sub": email, "role": role, "business_id": business_id,
                       "exp": exp}, s.jwt_secret, algorithm=s.jwt_algorithm)


def decode_token(token: str) -> dict:
    s = get_settings()
    try:
        return jwt.decode(token, s.jwt_secret, algorithms=[s.jwt_algorithm])
    except ExpiredSignatureError as exc:
        raise AuthError("token expired") from exc
    except JWTError as exc:
        raise AuthError("invalid token") from exc
