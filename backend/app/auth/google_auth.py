"""Google Identity Services verification (user-portal login only).

Flow: browser obtains an ID token via the official GIS button, POSTs it to
/api/v1/auth/google, backend verifies signature/issuer/audience/expiry with
google-auth, then issues the normal MetroScan JWT. Raw Google tokens are never
stored and Google claims never set roles — the DB role always wins.
"""

from app.core_config import get_settings

GOOGLE_ISSUERS = {"accounts.google.com", "https://accounts.google.com"}


class GoogleAuthError(Exception):
    pass


class GoogleNotConfigured(GoogleAuthError):
    pass


def verify_google_credential(credential: str) -> dict:
    """Verify a GIS ID token; return {"sub", "email"}. Raises GoogleAuthError."""
    settings = get_settings()
    if not settings.google_client_id:
        raise GoogleNotConfigured("google login is not configured")
    if not credential:
        raise GoogleAuthError("missing credential")
    try:
        from google.auth.transport import requests as google_requests
        from google.oauth2 import id_token as google_id_token
    except ImportError as exc:
        raise GoogleAuthError("google verification unavailable") from exc
    try:
        claims = google_id_token.verify_oauth2_token(
            credential, google_requests.Request(), settings.google_client_id)
    except ValueError as exc:
        # Covers bad signature, expiry, wrong audience, malformed token.
        raise GoogleAuthError("invalid google credential") from exc
    if claims.get("iss") not in GOOGLE_ISSUERS:
        raise GoogleAuthError("invalid google credential")
    sub = claims.get("sub")
    email = (claims.get("email") or "").strip().lower()
    if not sub or not email:
        raise GoogleAuthError("invalid google credential")
    return {"sub": sub, "email": email}
