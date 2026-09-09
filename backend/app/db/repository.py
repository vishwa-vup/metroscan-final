"""Persistence + search + dashboard (§§23, 30).

DB-first (PostgreSQL in production); when no database is reachable the runtime
falls back to the in-memory scan store so the demo stays usable. Automated tests
point DATABASE_URL at a SQLite file and exercise the real SQL path.
"""

from datetime import datetime, timezone

from sqlalchemy import or_

from app.db import session as dbs
from app.db.models import (
    AuditEvent,
    ExtractedField,
    InspectorReview,
    OcrToken,
    Report,
    RuleEvaluation,
    RuleSetVersion,
    Scan,
)
from app.rules.statuses import (
    COULD_NOT_RELIABLY_VERIFY,
    INSPECTOR_CONFIRMED_COMPLIANT,
    INSPECTOR_CONFIRMED_ISSUE,
    PENDING_STATUSES,
    POTENTIAL_NON_COMPLIANCE,
    VERIFIED_APPEARS_COMPLIANT,
)

PENDING_POTENTIAL = "pending_potential"
PENDING_UNCERTAIN = "pending_uncertain"
CONFIRMED_ISSUE = "confirmed_issue"
CONFIRMED_COMPLIANT = "confirmed_compliant"
MACHINE_VERIFIED = "machine_verified"


def db_available() -> bool:
    """SELECT-1 health probe with one retry after 500ms.

    Cloud Postgres (Supabase-style) suspends compute on idle and takes
    seconds to resume — the first probe after a quiet period can fail while
    the database is merely cold, not down. One retry absorbs that without
    masking a genuinely dead database (still False after the retry).
    """
    import time

    if dbs.db_ping():
        return True
    time.sleep(0.5)
    return dbs.db_ping()


def ensure_ruleset_version(ruleset: dict) -> None:
    if not db_available():
        return
    s = dbs.session_factory()()
    try:
        if s.get(RuleSetVersion, ruleset["version"]) is None:
            s.add(RuleSetVersion(version=ruleset["version"], rules_json=ruleset))
            s.commit()
    finally:
        s.close()


def save_scan(rec) -> bool:
    """Mirror a ScanRecord into the DB (historical rows protected: re-save replaces
    only the current snapshot children for the same scan id). Returns False if no DB."""
    if not db_available():
        return False
    s = dbs.session_factory()()
    try:
        old = s.get(Scan, rec.scan_id)
        if old:
            # Snapshot children are fully rebuilt from the record, so replace them
            # wholesale — otherwise InspectorReview rows duplicate on every re-save.
            for model in (OcrToken, ExtractedField, RuleEvaluation, InspectorReview):
                s.query(model).filter_by(scan_id=rec.scan_id).delete()
            s.delete(old)
        # Flush the parent row BEFORE adding children: a single end-of-transaction
        # flush has been observed emitting child INSERTs first (FK violation on
        # PostgreSQL/Supabase), leaving scans without any persisted output.
        s.add(Scan(id=rec.scan_id, filename=rec.filename, width=rec.width,
                   height=rec.height, processing_state=rec.processing_state,
                   rule_set_version=rec.rule_set_version,
                   pipeline_version=rec.pipeline_version, asset_name=rec.asset_name,
                   business_id=getattr(rec, "business_id", None),
                   created_by=getattr(rec, "created_by", "") or ""))
        s.flush()
        for t in (rec.ocr.tokens if rec.ocr else []):
            s.add(OcrToken(scan_id=rec.scan_id, idx=t.index, text=t.text,
                           confidence=t.confidence, x1=t.box[0], y1=t.box[1],
                           x2=t.box[2], y2=t.box[3]))
        for key, f in (rec.fields or {}).items():
            s.add(ExtractedField(scan_id=rec.scan_id, key=key,
                                 value_raw=f.get("value_raw", ""),
                                 value_normalized=f.get("value_normalized", ""),
                                 confidence=f.get("confidence", 0.0),
                                 ocr_confidence=f.get("ocr_confidence", 0.0),
                                 boxes=f.get("evidence_boxes", []),
                                 candidates=f.get("candidates", [])[:3],
                                 transforms=f.get("transforms", []),
                                 meta=f.get("meta", {})))
        for f in rec.findings or []:
            s.add(RuleEvaluation(scan_id=rec.scan_id, rule_id=f.get("rule_id", ""),
                                 clause=f.get("clause", ""), field=f.get("field", ""),
                                 machine_status=f.get("machine_status", ""),
                                 message=f.get("message", ""),
                                 ocr_confidence=f.get("ocr_confidence", 0.0),
                                 ruleset_version=f.get("ruleset_version", ""),
                                 review=f.get("review")))
        for r in rec.reviews or []:
            s.add(InspectorReview(scan_id=rec.scan_id, rule_id=r.get("rule_id", ""),
                                  action=r.get("action", ""), reviewer=r.get("reviewer", ""),
                                  note=r.get("note", ""), prev_status=r.get("prev_status", ""),
                                  new_status=r.get("new_status", "")))
        s.commit()
        return True
    finally:
        s.close()


def load_scan(scan_id: str):
    """Rebuild a ScanRecord from DB rows (post-restart hydration). None if absent."""
    # Alias: the schema OcrToken (pydantic) must not shadow the db OcrToken
    # used in s.query() below (shadowing crashes with ArgumentError).
    from app.ocr.schemas import OcrResult
    from app.ocr.schemas import OcrToken as OcrTokenSchema
    from app.services.scan_pipeline import ScanRecord, get_store

    if not db_available():
        return None
    s = dbs.session_factory()()
    try:
        row = s.get(Scan, scan_id)
        if row is None:
            return None
        toks = [OcrTokenSchema(text=t.text, confidence=t.confidence,
                         box=[t.x1, t.y1, t.x2, t.y2],
                         box_convention="xyxy-top-left-origin", index=t.idx)
                for t in s.query(OcrToken).filter_by(scan_id=scan_id).order_by(OcrToken.idx)]
        fields = {f.key: {"value_raw": f.value_raw, "value_normalized": f.value_normalized,
                          "confidence": f.confidence, "ocr_confidence": f.ocr_confidence,
                          "evidence_boxes": f.boxes or [], "candidates": f.candidates or [],
                          "transforms": f.transforms or [], "meta": f.meta or {}}
                  for f in s.query(ExtractedField).filter_by(scan_id=scan_id)}
        findings = [{"rule_id": e.rule_id, "clause": e.clause, "field": e.field,
                     "machine_status": e.machine_status, "message": e.message,
                     "evidence_boxes": [], "ocr_confidence": e.ocr_confidence,
                     "ruleset_version": e.ruleset_version, "review": e.review}
                    for e in s.query(RuleEvaluation).filter_by(scan_id=scan_id)]
        reviews = [{"scan_id": scan_id, "rule_id": r.rule_id, "action": r.action,
                    "reviewer": r.reviewer, "note": r.note, "at": r.at.isoformat(),
                    "prev_status": r.prev_status, "new_status": r.new_status}
                   for r in s.query(InspectorReview).filter_by(scan_id=scan_id)]
        rec = ScanRecord(scan_id=row.id, filename=row.filename, content_type="image/*",
                         size_bytes=0, width=row.width, height=row.height,
                         asset_name=row.asset_name, created_at=row.created_at.isoformat(),
                         processing_state=row.processing_state,
                         rule_set_version=row.rule_set_version,
                         pipeline_version=row.pipeline_version,
                         business_id=row.business_id, created_by=row.created_by)
        if toks:
            rec.ocr = OcrResult(tokens=toks, image_width=row.width, image_height=row.height)
        rec.fields, rec.findings, rec.reviews = fields, findings, reviews
        get_store().save(rec)
        return rec
    finally:
        s.close()


def record_audit(scan_id, actor, action, detail="") -> None:
    if not db_available():
        return
    s = dbs.session_factory()()
    try:
        s.add(AuditEvent(scan_id=scan_id, actor=actor, action=action, detail=detail))
        s.commit()
    finally:
        s.close()


def record_report(scan_id, fmt, byte_size) -> None:
    if not db_available():
        return
    s = dbs.session_factory()()
    try:
        s.add(Report(scan_id=scan_id, format=fmt, byte_size=byte_size))
        s.commit()
    finally:
        s.close()


def _bucketize(findings: list[dict]) -> set[str]:
    """Which dashboard buckets a scan belongs to. Pending and confirmed are NEVER merged."""
    out = set()
    for f in findings or []:
        ms = f.get("machine_status")
        rv = (f.get("review") or {}).get("new_status")
        if rv == INSPECTOR_CONFIRMED_ISSUE:
            out.add(CONFIRMED_ISSUE)
        elif rv == INSPECTOR_CONFIRMED_COMPLIANT:
            out.add(CONFIRMED_COMPLIANT)
        elif ms == POTENTIAL_NON_COMPLIANCE:
            out.add(PENDING_POTENTIAL)
        elif ms == COULD_NOT_RELIABLY_VERIFY:
            out.add(PENDING_UNCERTAIN)
        elif ms == VERIFIED_APPEARS_COMPLIANT:
            out.add(MACHINE_VERIFIED)
    return out


def _reviewer_of(findings) -> str:
    for f in findings or []:
        if (f.get("review") or {}).get("reviewer"):
            return f["review"]["reviewer"]
    return ""


def search_scans(q="", status="", date_from="", date_to="", inspector="",
                 page=1, size=20, business_id=None):
    """Stable sort (created desc, id asc), paginated. Searches product/scan identity.
    business_id set → scope to that business (§24.13); None → global (inspectors)."""
    from app.services.scan_pipeline import get_store

    page, size = max(page, 1), min(max(size, 1), 100)
    if db_available():
        s = dbs.session_factory()()
        try:
            query = s.query(Scan)
            if business_id is not None:
                query = query.filter(Scan.business_id == business_id)
            if q:
                like = f"%{q}%"
                query = query.filter(or_(Scan.id.like(like), Scan.filename.like(like)))
            if date_from:
                query = query.filter(Scan.created_at >= date_from)
            if date_to:
                query = query.filter(Scan.created_at <= date_to)
            rows = query.order_by(Scan.created_at.desc(), Scan.id.asc()).all()
            items = []
            for r in rows:
                evals = s.query(RuleEvaluation).filter_by(scan_id=r.id).all()
                fl = [{"machine_status": e.machine_status,
                       "review": e.review} for e in evals]
                buckets = _bucketize(fl)
                if status and status != "all" and status not in buckets:
                    continue
                if inspector and _reviewer_of(fl) != inspector:
                    continue
                if q and q.lower() not in (r.id + r.filename).lower():
                    continue
                items.append({"scan_id": r.id, "filename": r.filename,
                              "processing_state": r.processing_state,
                              "created_at": r.created_at.isoformat(),
                              "buckets": sorted(buckets)})
            total = len(items)
            return items[(page - 1) * size: page * size], total
        finally:
            s.close()
    recs = get_store().list()
    items = []
    for r in recs:
        if business_id is not None and r.business_id != business_id:
            continue
        buckets = _bucketize(r.findings)
        if q and q.lower() not in (r.scan_id + r.filename).lower():
            continue
        if status and status != "all" and status not in buckets:
            continue
        if date_from and r.created_at < date_from:
            continue
        if date_to and r.created_at > date_to:
            continue
        if inspector and _reviewer_of(r.findings) != inspector:
            continue
        items.append({"scan_id": r.scan_id, "filename": r.filename,
                      "processing_state": r.processing_state, "created_at": r.created_at,
                      "buckets": sorted(buckets)})
    total = len(items)
    return items[(page - 1) * size: page * size], total


def dashboard_summary(business_id=None) -> dict:
    """Separate counters — pending machine flags never merged with confirmed issues (§30).
    business_id set → that business's scans only."""
    from app.services.scan_pipeline import get_store

    counts = {"total_scans": 0, PENDING_POTENTIAL: 0, PENDING_UNCERTAIN: 0,
              CONFIRMED_ISSUE: 0, CONFIRMED_COMPLIANT: 0, MACHINE_VERIFIED: 0,
              "quality_rejected": 0}
    if db_available():
        s = dbs.session_factory()()
        try:
            query = s.query(Scan)
            if business_id is not None:
                query = query.filter(Scan.business_id == business_id)
            scans = query.all()
            counts["total_scans"] = len(scans)
            counts["quality_rejected"] = sum(1 for r in scans
                                             if r.processing_state == "QUALITY_REJECTED")
            for r in scans:
                evals = s.query(RuleEvaluation).filter_by(scan_id=r.id).all()
                for b in _bucketize([{"machine_status": e.machine_status,
                                      "review": e.review} for e in evals]):
                    counts[b] += 1
            return counts
        finally:
            s.close()
    recs = get_store().list()
    if business_id is not None:
        recs = [r for r in recs if r.business_id == business_id]
    counts["total_scans"] = len(recs)
    counts["quality_rejected"] = sum(1 for r in recs if r.processing_state == "QUALITY_REJECTED")
    for r in recs:
        for b in _bucketize(r.findings):
            counts[b] += 1
    return counts


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()
