# Deploy MetroScan to Render (from GitHub)

Source repo: **vishwa-vup/metroscan-final**, branch `main`.
All-in-one: one Docker service (`Dockerfile` at repo root) builds the React
frontend and serves it from FastAPI (`/`) together with the API (`/api/...`).
Single public URL, no CORS setup.

## Service

| Service | Type | URL |
|---|---|---|
| `metroscan-web` | Web Service (Docker, root `Dockerfile`) | `https://metroscan-web.onrender.com` |

Database stays on **Supabase** (Session Pooler) — no new database needed.
Existing logins keep working. (Deployed manually, not via Blueprint:
dashboard → New → Web Service → repo `metroscan-final`, Docker runtime,
root `./Dockerfile`, Free plan, env `ENVIRONMENT`/`DATABASE_URL`/`JWT_SECRET`.
The old `metroscan-api` + static site + Blueprint were removed.)

## Steps

1. **Push** — this repo is already on GitHub (`main` includes root `Dockerfile`).
2. Render dashboard → **New → Web Service** → select `metroscan-final`.
   Name `metroscan-web`, runtime **Docker**, Dockerfile `./Dockerfile`, Free plan.
3. Env vars: `ENVIRONMENT=production`, `DATABASE_URL` (Supabase pooler URL),
   `JWT_SECRET` (reuse the existing value to keep logins valid).
4. **Deploy** — first Docker build takes 10–20 min (torch + EasyOCR layers,
   models baked in so first scans never download at runtime).
5. Verify:
   - `https://metroscan-web.onrender.com/` → MetroScan landing page
   - `https://metroscan-web.onrender.com/healthz` → 200
   - `https://metroscan-web.onrender.com/health/db` → `{"db":"up"}`
   - `/login` loads directly (SPA fallback) → Dashboard after login.

## Know before you go

- **Free tier sleeps** after ~15 min idle → first request takes ~1 min.
  Use Starter ($7/mo) to avoid sleep and for comfortable build RAM.
- **Uploads are ephemeral** without a persistent disk (needs paid tier).
- **Secrets live in Render dashboard → Environment**, never in git.
- Local all-in-one test: build frontend with `VITE_API_BASE_URL=""`,
  copy `frontend/dist` to `backend/frontend_dist`, run uvicorn —
  `/` serves the app, `/api/...` serves the API.
