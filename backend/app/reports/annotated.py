"""Annotated evidence images (§39 Level 2 feat 4). Drawn on an in-memory copy —
the stored original is never modified (§27 rule 4)."""

from io import BytesIO

from PIL import Image, ImageDraw

COLORS = {
    "VERIFIED_APPEARS_COMPLIANT": (34, 139, 34),
    "POTENTIAL_NON_COMPLIANCE": (200, 120, 0),
    "COULD_NOT_RELIABLY_VERIFY": (90, 90, 200),
    "INSPECTOR_CONFIRMED_ISSUE": (200, 30, 30),
    "INSPECTOR_CONFIRMED_COMPLIANT": (34, 139, 34),
}


def render_annotated(image_bytes: bytes, findings: list) -> bytes:
    img = Image.open(BytesIO(image_bytes)).convert("RGB")
    draw = ImageDraw.Draw(img)
    for f in findings or []:
        status = (f.get("review") or {}).get("new_status") or f.get("machine_status", "")
        color = COLORS.get(status, (120, 120, 120))
        for box in f.get("evidence_boxes", []) or []:
            x1, y1, x2, y2 = (int(v) for v in box)
            draw.rectangle([x1, y1, x2, y2], outline=color, width=3)
            draw.text((x1 + 2, max(y1 - 14, 0)), str(f.get("rule_id", "")), fill=color)
    buf = BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()
