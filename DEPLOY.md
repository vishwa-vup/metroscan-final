# MetroScan production deployment (Phase 10)

## Prerequisites
- Docker + Docker Compose v2
- A PostgreSQL 16 instance (cloud free tier or local)
- Domain / reverse proxy (optional — compose nginx handles :80)

## Option A — cloud Postgres (recommended, no admin needed locally)
1. Create a free project at **Neon** (neon.tech) or **Supabase**.
2. Copy the connection string (postgres://…).
3. `cp deploy/.env.production.example deploy/.env.production` and fill:
   - `DATABASE_URL` — the cloud connection string
   - `JWT_SECRET` — 32+ random chars (`openssl rand -hex 32`)
   - `POSTGRES_PASSWORD` — only if using compose Postgres
   - `CORS_ORIGINS` — your frontend URL (e.g. `https://metroscan.example.com`)
4. `docker compose -f deploy/docker-compose.yml up -d --build`
5. Seed admin:
   ```
   docker compose run --rm backend \
     DATABASE_URL=$DATABASE_URL \
     ADMIN_EMAIL=admin@example.com \
     ADMIN_PASSWORD=Strong!Pass123 \
     python deploy/init_db.py
   ```
6. Smoke: `curl https://yourdomain.com/healthz`

## Option B — local Postgres (requires admin)
1. Install PostgreSQL 16, create DB/user `metroscan`.
2. Set `DATABASE_URL` in `.env.production`.
3. Run `python backend/deploy/init_db.py` then `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
4. `npm run build` in `frontend/`, serve `frontend/dist/` via nginx.

## Secrets
- Never commit `.env.production`.
- Rotate `JWT_SECRET` via admin PATCH user endpoint.
- Logs scrub passwords/tokens (§31).

## Rollback
- `docker compose down` → previous image still cached.
- DB migrations are append-only (alembic); downgrade only with DBA.
