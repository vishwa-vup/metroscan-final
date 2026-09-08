"""Single internal report DTO feeding both PDF and DOCX (§22 req 3)."""

LIMITATIONS = [
    "Single-image inspection: declarations on unseen faces report as could-not-verify.",
    "OCR + regex/proximity extraction can misread stylized or multilingual text.",
    "Placement contours are heuristic; readability estimates carry uncertainty.",
    "Rule citations stay at Rule level until verified against the official e-Gazette.",
]

DISCLAIMER = ("Decision support only: machine flags are potential non-compliance pending "
              "inspector review, never an autonomous legal verdict.")


def build_dto(rec, ruleset_version: str = "") -> dict:
    findings = rec.findings if isinstance(rec, dict) else None
    if findings is None:
        findings = [f if isinstance(f, dict) else f.model_dump() for f in (rec.findings or [])]
        fields = rec.fields or {}
        ocr = rec.ocr.model_dump() if rec.ocr else None
        meta = {"scan_id": rec.scan_id, "filename": rec.filename,
                "processing_state": rec.processing_state, "created_at": rec.created_at,
                "pipeline_version": rec.pipeline_version,
                "rule_set_version": rec.rule_set_version or ruleset_version,
                "reviews": rec.reviews or []}
    else:
        fields, ocr = rec.get("fields", {}), rec.get("ocr")
        meta = {"scan_id": rec.get("scan_id"), "filename": rec.get("filename"),
                "processing_state": rec.get("processing_state"),
                "created_at": rec.get("created_at"),
                "pipeline_version": rec.get("pipeline_version"),
                "rule_set_version": rec.get("rule_set_version") or ruleset_version,
                "reviews": rec.get("reviews", [])}
    machine = [f for f in findings if not f.get("review")]
    human = [f for f in findings if f.get("review")]
    return {"meta": meta, "fields": fields, "ocr": ocr, "machine_findings": machine,
            "human_decisions": human, "limitations": LIMITATIONS, "disclaimer": DISCLAIMER}
