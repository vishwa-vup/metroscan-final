"""Scan endpoints — Phase 7: JWT + RBAC + business isolation enforced server-side."""

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.auth.rbac import BUSINESS, check_scan_access, get_current_user
from app.core_config import get_settings
from app.observability import log_event
from app.db import repository as repo
from app.ocr.schemas import OcrResult
from app.services.scan_pipeline import (
    QualityRejected,
    add_scan_image,
    get_store,
    run_analysis_stage,
    run_extraction_stage,
    run_ocr_stage,
    run_quality_gate,
    run_rules_stage,
)
from app.services.storage import original_path

router = APIRouter(prefix="/scans", tags=["scans"])


class ScanSummary(BaseModel):
    scan_id: str
    filename: str
    width: int
    height: int
    processing_state: str
    pipeline_version: str
    created_at: str
    ocr_tokens: int = 0


class ScanDetail(ScanSummary):
    ocr: OcrResult | None = None
    fields: dict = {}
    findings: list = []
    reviews: list = []


def _summary(rec) -> ScanSummary:
    return ScanSummary(scan_id=rec.scan_id, filename=rec.filename, width=rec.width,
                       height=rec.height, processing_state=rec.processing_state,
                       pipeline_version=rec.pipeline_version, created_at=rec.created_at,
                       ocr_tokens=len(rec.ocr.tokens) if rec.ocr else 0)


@router.post("", response_model=ScanDetail, status_code=201)
async def create_scan(image: UploadFile = File(...),
                      user: dict = Depends(get_current_user)):
    """Validate → quality gate → preprocess → EasyOCR → extract → analyze → rules."""
    settings = get_settings()
    body = await image.read()
    store = get_store()
    try:
        rec = store.create(body, image.filename or "upload",
                           image.content_type or "application/octet-stream",
                           max_mb=settings.max_upload_mb)
    except ValueError as exc:
        msg = str(exc)
        status = 413 if "exceeds" in msg else 422 if "undecodable" in msg else 400
        raise HTTPException(status_code=status, detail=msg)
    rec.created_by = user["email"]  # ownership + audit (Phase 7)
    rec.business_id = user["business_id"] if user["role"] == BUSINESS else None
    log_event("scan.received", scan_id=rec.scan_id, filename=rec.filename,
              size_bytes=rec.size_bytes, actor=user["email"])
    try:
        run_quality_gate(rec, settings)  # Phase 6: stops the normal path when poor
    except QualityRejected as exc:
        store.save(rec)
        repo.save_scan(rec)
        log_event("scan.quality_rejected", scan_id=rec.scan_id, metrics=rec.quality.metrics)
        raise HTTPException(status_code=422, detail={"message": str(exc),
                                                     "scan_id": rec.scan_id,
                                                     "metrics": rec.quality.metrics})
    try:
        rec = run_ocr_stage(rec)
        rec = run_extraction_stage(rec)  # Phase 2: regex + proximity fields
        rec = run_analysis_stage(rec)  # Phase 6: placement + readability evidence
        rec = run_rules_stage(rec, threshold=settings.ocr_confidence_threshold)
    except Exception as exc:  # technical failure → FAILED, never a verdict
        rec.processing_state = "FAILED"
        rec.error = str(exc)
        store.save(rec)
        raise HTTPException(status_code=502, detail=f"pipeline stage failed: {exc}")
    store.save(rec)
    from app.rules.loader import get_active_ruleset
    repo.ensure_ruleset_version(get_active_ruleset())  # historical version retained
    repo.save_scan(rec)  # PostgreSQL mirror when reachable; demo continues otherwise
    repo.record_audit(rec.scan_id, getattr(rec, "created_by", "") or "anonymous",
                      "scan.created", rec.filename)
    log_event("scan.pipeline_complete", scan_id=rec.scan_id,
              processing_state=rec.processing_state,
              ruleset_version=rec.rule_set_version,
              pipeline_version=rec.pipeline_version,
              ocr_tokens=len(rec.ocr.tokens) if rec.ocr else 0,
              ocr_duration_ms=rec.ocr.duration_ms if rec.ocr else None,
              findings=len(rec.findings))
    return ScanDetail(**_summary(rec).model_dump(), ocr=rec.ocr, fields=rec.fields,
                      findings=rec.findings)


@router.get("", response_model=dict)
def list_scans(q: str = Query(default=""), status: str = Query(default="all"),
               date_from: str = Query(default=""), date_to: str = Query(default=""),
               inspector: str = Query(default=""), page: int = Query(default=1),
               size: int = Query(default=20), user: dict = Depends(get_current_user)):
    """Search scans: text, status bucket, dates, inspector — paginated, stable sort.
    Businesses see only their own products and scans (§24.5)."""
    scope = user["business_id"] if user["role"] == BUSINESS else None
    items, total = repo.search_scans(q=q, status=status, date_from=date_from,
                                     date_to=date_to, inspector=inspector,
                                     page=page, size=size, business_id=scope)
    return {"items": items, "total": total, "page": max(page, 1), "size": size}


@router.get("/{scan_id}", response_model=ScanDetail)
def scan_detail(scan_id: str, user: dict = Depends(get_current_user)):
    rec = check_scan_access(scan_id, user)
    return ScanDetail(**_summary(rec).model_dump(), ocr=rec.ocr,
                      fields=rec.fields, findings=rec.findings, reviews=rec.reviews)


@router.get("/{scan_id}/ocr", response_model=OcrResult)
def scan_ocr(scan_id: str, user: dict = Depends(get_current_user)):
    rec = check_scan_access(scan_id, user)
    if rec.ocr is None:
        raise HTTPException(status_code=404, detail="OCR evidence not found")
    return rec.ocr


@router.get("/{scan_id}/evidence")
def scan_evidence(scan_id: str, user: dict = Depends(get_current_user)):
    """Evidence access follows the same ownership rules (§24.14–15)."""
    rec = check_scan_access(scan_id, user)
    path = original_path(rec.asset_name)
    if not path.exists():
        raise HTTPException(status_code=404, detail="evidence file missing")
    return FileResponse(path, media_type=rec.content_type, filename=rec.filename)


@router.post("/{scan_id}/images", response_model=ScanDetail, status_code=201)
async def add_image(scan_id: str, image: UploadFile = File(...), label: str = Form("other"),
                    user: dict = Depends(get_current_user)):
    """Level 2 multi-image: add a front/back/side view; OCR + extraction + rules
    re-run on the combined evidence. Reviews carry forward by rule_id."""
    settings = get_settings()
    rec = check_scan_access(scan_id, user)
    body = await image.read()
    if not body:
        raise HTTPException(status_code=400, detail="empty file")
    if len(body) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(status_code=413, detail="file exceeds size limit")
    store = get_store()
    try:
        rec = add_scan_image(rec, body, image.filename or "view",
                             image.content_type or "application/octet-stream",
                             label, settings, settings.ocr_confidence_threshold)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))
    except QualityRejected as exc:
        store.save(rec)
        repo.save_scan(rec)
        raise HTTPException(status_code=422, detail={"message": str(exc),
                                                     "scan_id": rec.scan_id})
    except Exception as exc:
        rec.processing_state = "FAILED"
        rec.error = str(exc)
        store.save(rec)
        raise HTTPException(status_code=502, detail=f"pipeline stage failed: {exc}")
    store.save(rec)
    repo.save_scan(rec)
    repo.record_audit(rec.scan_id, user["email"], "images.added", label)
    return ScanDetail(**_summary(rec).model_dump(), ocr=rec.ocr, fields=rec.fields,
                      findings=rec.findings, reviews=rec.reviews)


@router.get("/{scan_id}/evidence/annotated")
def scan_annotated(scan_id: str, user: dict = Depends(get_current_user)):
    """Level 2 annotated evidence: finding boxes drawn on a copy (original untouched)."""
    from fastapi.responses import Response

    from app.reports.annotated import render_annotated

    rec = check_scan_access(scan_id, user)
    path = original_path(rec.asset_name)
    if not path.exists():
        raise HTTPException(status_code=404, detail="evidence file missing")
    data = render_annotated(path.read_bytes(), rec.findings)
    return Response(content=data, media_type="image/png")
