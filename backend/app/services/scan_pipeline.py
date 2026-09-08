"""Scan pipeline orchestration (§42 scan_pipeline tasks, §26 processing states)."""

import uuid
from datetime import datetime, timezone

from pydantic import BaseModel, Field

from app.ocr.easyocr_engine import run_ocr
from app.ocr.schemas import OcrResult
from app.preprocessing.image import PreprocessConfig, PreprocessMeta, decode_image, preprocess
from app.services.storage import IMAGE_EXTS, save_original

PIPELINE_VERSION = "0.8-phase8"

# §26 processing states (machine progress — never confused with compliance status)
RECEIVED = "RECEIVED"
QUALITY_CHECKING = "QUALITY_CHECKING"
QUALITY_REJECTED = "QUALITY_REJECTED"
PREPROCESSING = "PREPROCESSING"
OCR_RUNNING = "OCR_RUNNING"
OCR_COMPLETE = "OCR_COMPLETE"
EXTRACTION_RUNNING = "EXTRACTION_RUNNING"
EXTRACTION_COMPLETE = "EXTRACTION_COMPLETE"
RULE_EVALUATION_RUNNING = "RULE_EVALUATION_RUNNING"
RULE_EVALUATION_COMPLETE = "RULE_EVALUATION_COMPLETE"
AWAITING_REVIEW = "AWAITING_REVIEW"
REVIEW_COMPLETE = "REVIEW_COMPLETE"
REPORT_GENERATING = "REPORT_GENERATING"
COMPLETE = "COMPLETE"
FAILED = "FAILED"


def utcnow() -> str:
    return datetime.now(timezone.utc).isoformat()


class QualityInfo(BaseModel):
    passed: bool = True
    message: str = ""
    metrics: dict = {}


class ScanRecord(BaseModel):
    scan_id: str
    filename: str
    content_type: str
    size_bytes: int
    width: int
    height: int
    asset_name: str
    created_at: str
    processing_state: str = RECEIVED
    preprocess_meta: PreprocessMeta | None = None
    quality: QualityInfo = Field(default_factory=QualityInfo)
    ocr: OcrResult | None = None
    fields: dict = {}      # Phase 2: key -> ExtractedField
    findings: list = []    # Phase 3: rule evaluations
    reviews: list = []     # Phase 4: inspector reviews
    images: list = []      # Phase 8: extra views {asset_name, label, tokens, created_at}
    rule_set_version: str = "not-loaded-yet"
    pipeline_version: str = PIPELINE_VERSION
    business_id: int | None = None  # Phase 7 ownership; None = unscoped (pre-auth scans)
    created_by: str = ""
    error: str = ""


class ScanStore:
    """In-memory scan registry (Phase 1–4 runtime; Phase 5 mirrors to PostgreSQL)."""

    def __init__(self) -> None:
        self._scans: dict[str, ScanRecord] = {}

    def create(self, image_bytes: bytes, filename: str, content_type: str,
               max_mb: int = 10) -> ScanRecord:
        if not image_bytes:
            raise ValueError("empty file")
        if len(image_bytes) > max_mb * 1024 * 1024:
            raise ValueError(f"file exceeds {max_mb} MB limit")
        ext = "." + (filename.rsplit(".", 1)[-1].lower() if "." in filename else "")
        if ext not in IMAGE_EXTS:
            raise ValueError(f"unsupported image type: {ext or '(none)'}")
        try:
            img = decode_image(image_bytes)  # validates decoding (security rule 3)
        except ValueError as exc:
            raise ValueError(f"undecodable image: {exc}") from exc
        h, w = img.shape[:2]
        asset, _ = save_original(image_bytes, ext)
        rec = ScanRecord(scan_id=uuid.uuid4().hex, filename=filename,
                         content_type=content_type, size_bytes=len(image_bytes),
                         width=w, height=h, asset_name=asset, created_at=utcnow())
        self._scans[rec.scan_id] = rec
        return rec

    def get(self, scan_id: str) -> ScanRecord | None:
        return self._scans.get(scan_id)

    def list(self) -> list[ScanRecord]:
        return sorted(self._scans.values(), key=lambda r: r.created_at, reverse=True)

    def save(self, rec: ScanRecord) -> None:
        self._scans[rec.scan_id] = rec


_store: ScanStore | None = None


def get_store() -> ScanStore:
    global _store
    if _store is None:
        _store = ScanStore()
    return _store


def run_ocr_stage(rec: ScanRecord) -> ScanRecord:
    """PREPROCESSING → OCR_RUNNING → OCR_COMPLETE. Raw OCR preserved (§4 stages 5–7)."""
    from app.services.storage import original_path

    rec.processing_state = PREPROCESSING
    img = decode_image(original_path(rec.asset_name).read_bytes())
    _, meta = preprocess(img, PreprocessConfig())
    rec.preprocess_meta = meta
    rec.processing_state = OCR_RUNNING
    rec.ocr = run_ocr(img)  # OCR runs on the original-color evidence, not the working copy
    rec.processing_state = OCR_COMPLETE
    return rec


class QualityRejected(Exception):
    """Quality gate stop: carries the required recapture message, never a verdict."""


def run_quality_gate(rec: ScanRecord, settings=None) -> None:
    """QUALITY_CHECKING → (continue) or QUALITY_REJECTED + raise (§9 rule 10)."""
    from app.services.storage import original_path

    rec.processing_state = QUALITY_CHECKING
    img = decode_image(original_path(rec.asset_name).read_bytes())
    run_quality_gate_for(rec, img, settings)


def run_analysis_stage(rec: ScanRecord, calibration=None) -> ScanRecord:
    """Attach placement + readability evidence to the net-quantity field (§19–20)."""
    from app.analysis.placement import detect_panel, placement_info
    from app.analysis.readability import readability_info
    from app.services.storage import original_path

    img = decode_image(original_path(rec.asset_name).read_bytes())
    panel = detect_panel(img)
    nq = (rec.fields or {}).get("net_quantity")
    if nq:
        boxes = nq.get("evidence_boxes") or []
        box = boxes[0] if boxes else None
        nq.setdefault("meta", {})["placement"] = placement_info(box, panel)
        nq["meta"]["readability"] = readability_info(box, calibration)
        rec.fields["net_quantity"] = nq
    return rec


def add_scan_image(rec: ScanRecord, image_bytes: bytes, filename: str,
                   content_type: str, label: str, settings=None,
                   threshold: float = 0.70) -> ScanRecord:
    """Level 2 multi-image: quality-gate + OCR the new view, merge tokens, then
    re-run extraction → analysis → rules on the combined evidence (§39 feat 1).
    Reviews carry forward by rule_id; the re-evaluation is audit-logged by callers."""
    from app.preprocessing.image import PreprocessConfig, preprocess

    if label not in ("front", "back", "side", "other"):
        raise ValueError("label must be front/back/side/other")
    ext = "." + (filename.rsplit(".", 1)[-1].lower() if "." in filename else "")
    if ext not in IMAGE_EXTS:
        raise ValueError(f"unsupported image type: {ext or '(none)'}")
    img = decode_image(image_bytes)
    run_quality_gate_for(rec, img, settings)  # same gate as the first image
    asset, _ = save_original(image_bytes, ext)
    _, meta = preprocess(img, PreprocessConfig())
    rec.preprocess_meta = meta
    ocr = run_ocr(img)
    entry = {"asset_name": asset, "label": label, "tokens": len(ocr.tokens),
             "created_at": utcnow()}
    rec.images.append(entry)
    base = list(rec.ocr.tokens) if rec.ocr else []
    merged = base + list(ocr.tokens)
    for i, t in enumerate(merged):
        t.index = i  # deterministic re-indexing
    if rec.ocr is None:
        from app.ocr.schemas import OcrResult
        rec.ocr = OcrResult(tokens=merged, image_width=img.shape[1],
                            image_height=img.shape[0])
    else:
        rec.ocr.tokens = merged
    run_extraction_stage(rec)
    run_analysis_stage(rec)
    # carry reviews forward by rule_id before overwriting findings
    carried = {f["rule_id"]: f.get("review") for f in rec.findings if f.get("review")}
    run_rules_stage(rec, threshold)
    for f in rec.findings:
        if f["rule_id"] in carried:
            f["review"] = carried[f["rule_id"]]
    pending_left = [f for f in rec.findings
                    if f["machine_status"] in ("POTENTIAL_NON_COMPLIANCE",
                                               "COULD_NOT_RELIABLY_VERIFY")
                    and not f.get("review")]
    rec.processing_state = REVIEW_COMPLETE if not pending_left else AWAITING_REVIEW
    return rec


def run_quality_gate_for(rec: ScanRecord, img, settings=None) -> None:
    """Quality gate on an already-decoded image (shared by create + add-image)."""
    from app.preprocessing.quality import QualityConfig, assess

    cfg = QualityConfig()
    if settings is not None:
        cfg = QualityConfig(min_width=settings.min_image_width,
                            min_height=settings.min_image_height,
                            blur_min=settings.blur_threshold)
    q = assess(img, cfg)
    rec.quality = QualityInfo(passed=q.passed, message=q.message, metrics=q.metrics)
    if not q.passed:
        rec.processing_state = QUALITY_REJECTED
        raise QualityRejected(q.message)


def run_extraction_stage(rec: ScanRecord) -> ScanRecord:
    """EXTRACTION_RUNNING → EXTRACTION_COMPLETE (§4 stages 8–10)."""
    from app.extraction.fields import extract_all

    rec.processing_state = EXTRACTION_RUNNING
    if rec.ocr is None:
        raise ValueError("extraction requires OCR output")
    fields = extract_all(rec.ocr.tokens, rec.ocr.image_width, rec.ocr.image_height)
    rec.fields = {k: v.model_dump() for k, v in fields.items()}
    rec.processing_state = EXTRACTION_COMPLETE
    return rec


def run_rules_stage(rec: ScanRecord, threshold: float = 0.70) -> ScanRecord:
    """RULE_EVALUATION_* → AWAITING_REVIEW (§4 stages 13–14). Rules from versioned JSON."""
    from app.rules.engine import evaluate
    from app.rules.loader import get_active_ruleset

    rec.processing_state = RULE_EVALUATION_RUNNING
    ruleset = get_active_ruleset()
    findings = evaluate(rec.fields, ruleset, threshold)
    rec.findings = [f.model_dump() for f in findings]
    rec.rule_set_version = ruleset["version"]
    rec.processing_state = RULE_EVALUATION_COMPLETE
    rec.processing_state = AWAITING_REVIEW
    return rec
