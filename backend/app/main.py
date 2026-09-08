"""MetroScan FastAPI entrypoint (Phase 8: + analysis router)."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.v1.analysis import router as analysis_router
from app.api.v1.auth import admin_router, auth_router
from app.api.v1.reports import dashboard_router, reports_router
from app.api.v1.reviews import router as reviews_router
from app.api.v1.rules import router as rules_router
from app.api.v1.scans import router as scans_router
from app.core_config import get_settings

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup hook: dev-only one-time admin seed (Part D). Production
    startup is untouched — seed_dev_admin_once() refuses non-development."""
    from app.db.dev_seed import seed_dev_admin_once

    seed_dev_admin_once()
    yield


app = FastAPI(
    title="MetroScan API",
    description=(
        "AI-assisted Legal Metrology compliance scanner (SIH26034). "
        "Decision support only — never an autonomous legal verdict."
    ),
    version="0.1.0-phase1",
    docs_url="/docs",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,  # CORS_ORIGINS env; dev defaults kept locally
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_request_id(request: Request, call_next):
    """Correlation id on every response (§31 req 9)."""
    from app.observability import new_request_id

    response = await call_next(request)
    response.headers["X-Request-ID"] = getattr(request.state, "request_id", None) or new_request_id()
    return response


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception):  # noqa: BLE001
    return JSONResponse(
        status_code=500,
        content={"detail": "internal error", "path": str(request.url.path)},
    )


app.include_router(scans_router, prefix=settings.api_v1_prefix)
app.include_router(rules_router, prefix=settings.api_v1_prefix)
app.include_router(reviews_router, prefix=settings.api_v1_prefix)
app.include_router(reports_router, prefix=settings.api_v1_prefix)
app.include_router(dashboard_router, prefix=settings.api_v1_prefix)
app.include_router(auth_router, prefix=settings.api_v1_prefix)
app.include_router(admin_router, prefix=settings.api_v1_prefix)
app.include_router(analysis_router, prefix=settings.api_v1_prefix)


@app.get("/healthz", tags=["ops"])
def healthz() -> dict:
    return {"status": "ok", "app": settings.app_name, "env": settings.app_env}


@app.get("/health/db", tags=["ops"])
def health_db() -> dict:
    """Lightweight DB check (SELECT 1); 503 when PostgreSQL unreachable."""
    from fastapi import status as http_status

    from app.db.session import db_ping

    ok = db_ping()
    return JSONResponse(
        status_code=200 if ok else http_status.HTTP_503_SERVICE_UNAVAILABLE,
        content={"db": "up" if ok else "down"},
    )


@app.get("/api/v1/version", tags=["ops"])
def api_version() -> dict:
    return {
        "api": "v1",
        "pipeline_version": "0.8-phase8",
        "ruleset_version": "not-loaded-yet (Phase 3)",
        "disclaimer": "decision support only; potential non-compliance pending inspector review",
    }
