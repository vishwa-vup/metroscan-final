"""PDF reports via ReportLab — locked (§22). Regenerable: generation is retried by re-calling."""

from io import BytesIO

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm
from reportlab.platypus import Image as RLImage
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer
from reportlab.lib.styles import getSampleStyleSheet


def render_pdf(dto: dict, evidence_path: str | None = None) -> bytes:
    buf = BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=A4)
    st = getSampleStyleSheet()
    story = [Paragraph("MetroScan Compliance Report", st["Title"]),
             Paragraph(dto["disclaimer"], st["Normal"]), Spacer(1, 6)]
    m = dto["meta"]
    story.append(Paragraph(
        f"Scan {m['scan_id']} · {m['filename']} · state {m['processing_state']}<br/>"
        f"Pipeline {m['pipeline_version']} · Rules {m['rule_set_version']} · {m['created_at']}",
        st["Normal"]))
    if evidence_path:
        try:
            story += [Spacer(1, 6), RLImage(evidence_path, width=120 * mm,
                                            height=90 * mm, kind="proportional")]
        except Exception:
            story.append(Paragraph("(original evidence image unavailable)", st["Normal"]))
    story += [Spacer(1, 6), Paragraph("Extracted declarations (with OCR confidence)",
                                      st["Heading2"])]
    for key, f in (dto["fields"] or {}).items():
        val = f.get("value_raw") or "could not be verified from the provided image"
        story.append(Paragraph(f"<b>{key}</b>: {val} "
                               f"(OCR {float(f.get('ocr_confidence', 0)):.0%})", st["Normal"]))
    story.append(Paragraph("Machine findings (pending review)", st["Heading2"]))
    for x in dto["machine_findings"] or ["(none)"]:
        story.append(Paragraph(str(x if isinstance(x, str) else
                                       f"{x['rule_id']} {x['clause']} [{x['machine_status']}] "
                                       f"{x['message']} (evidence regions: "
                                       f"{len(x.get('evidence_boxes', []))})"), st["Normal"]))
    story.append(Paragraph("Inspector decisions", st["Heading2"]))
    for x in dto["human_decisions"] or ["(none)"]:
        if isinstance(x, str):
            story.append(Paragraph(x, st["Normal"]))
        else:
            r = x["review"]
            story.append(Paragraph(f"{x['rule_id']}: {r['reviewer']} → {r['new_status']} "
                                   f"at {r['at']} — {r.get('note', '')}", st["Normal"]))
    story.append(Paragraph("Limitations", st["Heading2"]))
    for lim in dto["limitations"]:
        story.append(Paragraph(f"• {lim}", st["Normal"]))
    doc.build(story)
    return buf.getvalue()
