"""Report + dashboard endpoints — Phase 7: same ownership rules as scans (§24.14)."""

from fastapi import APIRouter, Depends, HTTPException, Response

from app.auth.rbac import BUSINESS, check_scan_access, get_current_user
from app.db import repository as repo
from app.observability import log_event
from app.reports.docx import render_docx
from app.reports.dto import build_dto
from app.reports.pdf import render_pdf
from app.services.storage import original_path

reports_router = APIRouter(prefix="/scans/{scan_id}/report", tags=["reports"])
dashboard_router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _dto(scan_id: str, user: dict) -> tuple[dict, str | None]:
    rec = check_scan_access(scan_id, user)  # report access = ownership rules
    path = original_path(rec.asset_name)
    return build_dto(rec), (str(path) if path.exists() else None)


@reports_router.get("/pdf")
def report_pdf(scan_id: str, user: dict = Depends(get_current_user)):
    from app.services.scan_pipeline import COMPLETE, REPORT_GENERATING, get_store

    dto, evidence = _dto(scan_id, user)
    rec = check_scan_access(scan_id, user)
    rec.processing_state = REPORT_GENERATING  # §26 lifecycle state
    get_store().save(rec)
    try:
        data = render_pdf(dto, evidence)  # regenerable → retry = re-call
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"report generation failed: {type(exc).__name__}")
    rec.processing_state = COMPLETE
    get_store().save(rec)
    repo.save_scan(rec)
    repo.record_report(scan_id, "pdf", len(data))
    log_event("report.generated", scan_id=scan_id, format="pdf", byte_size=len(data))
    return Response(content=data, media_type="application/pdf",
                    headers={"Content-Disposition": f"attachment; filename={scan_id}.pdf"})


@reports_router.get("/docx")
def report_docx(scan_id: str, user: dict = Depends(get_current_user)):
    from app.services.scan_pipeline import COMPLETE, REPORT_GENERATING, get_store

    dto, evidence = _dto(scan_id, user)
    rec = check_scan_access(scan_id, user)
    rec.processing_state = REPORT_GENERATING  # §26 lifecycle state
    get_store().save(rec)
    try:
        data = render_docx(dto, evidence)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"report generation failed: {type(exc).__name__}")
    rec.processing_state = COMPLETE
    get_store().save(rec)
    repo.save_scan(rec)
    repo.record_report(scan_id, "docx", len(data))
    log_event("report.generated", scan_id=scan_id, format="docx", byte_size=len(data))
    return Response(
        content=data,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={"Content-Disposition": f"attachment; filename={scan_id}.docx"})


@dashboard_router.get("/summary")
def dashboard_summary(user: dict = Depends(get_current_user)):
    scope = user["business_id"] if user["role"] == BUSINESS else None
    return repo.dashboard_summary(business_id=scope)
