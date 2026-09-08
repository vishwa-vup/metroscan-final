# MetroScan — Cloud Deployment Guide (provider-neutral)

Backend is cloud-ready and verified locally in production mode
(`0.0.0.0`, `ENVIRONMENT=production`, Supabase pooler, `/healthz` 200,
`/health/db` 200, login flow green). Works on Render / Railway / Fly.io / VPS.

## 1. Create the cloud service
- New **Web Service**, runtime **Docker** (uses `backend/Dockerfile`),
  Docker context = repo root, Dockerfile path = `backend/Dockerfile`.
- No-Docker alternative: runtime **Python 3.12**, build
  `pip install -r backend/requirements.txt`, start command below.

## 2. Connect the Git repository
Connect this repo, deploy branch `main` (commit with these files).

## 3. Build
- Docker: automatic from `backend/Dockerfile` (deps layer cached).
- Native: build command `pip install -r backend/requirements.txt`.

## 4. Environment variables (dashboard — never commit these)
| Variable | Value |
|---|---|
| `DATABASE_URL` | `<your-supabase-session-pooler-url>` — format `postgresql+psycopg2://postgres.<project-ref>:<password>@aws-0-<region>.pooler.supabase.com:5432/postgres?sslmode=require` |
| `JWT_SECRET` | `<generate-a-long-random-secret>` (32+ chars, e.g. `openssl rand -hex 32`) |
| `ENVIRONMENT` | `production` |
| `CORS_ORIGINS` | `https://<your-frontend-domain>` (comma-separated if several) |
| `PORT` | set automatically by the platform — do not hard-code |
| `STORAGE_DIR` | `/data/scans` only if you attach a persistent disk, else omit |

The app **refuses to start** in production on dev-default secrets
(clear error, no silent fallback).

## 5. Start command
```
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```
(Docker image already does `${PORT:-8000}`.)

## 6. Deploy
Push / trigger deploy, watch logs for `Application startup complete`.

## 7. Public URL
Copy the platform URL, e.g. `https://metroscan-api.onrender.com`.

## 8. Test /healthz
`GET https://<your-cloud-domain>/healthz` → `{"status":"ok",...,"env":"production"}`.

## 9. Test a real endpoint
```
POST https://<your-cloud-domain>/api/v1/auth/login
{"email":"<admin-email>","password":"<admin-password>"}
```
→ 200 with `access_token`. Then `GET /health/db` → `{"db":"up"}`.

## 10. Logs on failure
- `refusing production start: ...` → env var missing (see §4).
- `could not translate host name` → wrong pooler host/region.
- `ENOIDENTIFIER` → pooler username must be `postgres.<project-ref>`.
- `invalid credentials` on login → run `python backend/deploy/init_db.py`
  once with `DATABASE_URL` + `ADMIN_EMAIL` + `ADMIN_PASSWORD` set.

## One-time DB setup (from any machine with connectivity)
```
export DATABASE_URL='<pooler-url>' ADMIN_EMAIL='<admin>' ADMIN_PASSWORD='<strong>'
python -m alembic upgrade head   # from backend/
python backend/deploy/init_db.py
```

## Frontend
- Same-origin (nginx/reverse proxy): nothing to change.
- Split hosting (Vercel/Netlify + API host): set build env
  `VITE_API_BASE_URL=https://<your-cloud-domain>`, rebuild, redeploy.

## Local vs cloud
- Local: `http://127.0.0.1:8000` (dev defaults, SQLite/Postgres via `.env`)
- Cloud: `https://<your-cloud-domain>` (env vars from dashboard)
