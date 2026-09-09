# Google Sign-In (user portal only, optional)

Status: implemented behind configuration. With no client ID configured, the
Google button is hidden and `POST /api/v1/auth/google` answers `503` — the
app works exactly as before.

## What it does

- User Portal login shows an official Google Identity Services button.
- The browser sends the GIS ID token to the backend, which verifies
  signature, issuer, audience (`GOOGLE_CLIENT_ID`), and expiry with
  `google-auth`, then issues the normal MetroScan JWT.
- Identity key is Google's `sub` (stored in `users.google_sub`), never email.
- New Google users get the self-service `business` role with a personal
  Business row. Google can never create or elevate inspector/admin accounts.
- An email that already has a password account is never overwritten or
  linked silently (`409` → log in with password).
- Inspector login has no Google button by design; no public inspector
  registration exists anywhere.

## Setup

1. Google Cloud Console → APIs & Services → Credentials → Create OAuth
   client ID (Web application).
2. Authorized JavaScript origins (match your deployments):
   - `http://localhost:5173`, `http://localhost:5174` (dev)
   - `https://metroscan-final.vercel.app` (prod; add Render URL if used)
3. Backend env: `GOOGLE_CLIENT_ID=<the same client ID>`.
4. Frontend env: `VITE_GOOGLE_CLIENT_ID=<the same client ID>`.
5. Apply migration `0002_google_sub` (`alembic upgrade head`).
6. Never put `GOOGLE_CLIENT_SECRET` in the browser; never commit `.env`.

## Verification matrix (covered by `backend/tests/test_google_auth.py`)

- Missing `GOOGLE_CLIENT_ID` → `503`, button hidden.
- Bad/expired/wrong-audience credential → `401`.
- Hostile claims carrying a role → still `business`, never inspector.
- Existing password email + new Google sub → `409`, password intact.
- Returning Google user → `200` with app JWT; same session/logout as password.
