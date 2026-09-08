"""Principal-display-panel analysis via OpenCV contours (§19). Heuristic with
explicit uncertainty — detector failure never implies legal failure (§19.8)."""

import cv2
import numpy as np
from pydantic import BaseModel


class PanelResult(BaseModel):
    found: bool
    box: list[int] = []  # xyxy panel candidate
    confidence: float = 0.0  # geometry confidence, NOT legal certainty
    method: str = "contour-heuristic"
    note: str = ""


def detect_panel(gray: np.ndarray) -> PanelResult:
    g = gray if len(gray.shape) == 2 else cv2.cvtColor(gray, cv2.COLOR_BGR2GRAY)
    h, w = g.shape[:2]
    blurred = cv2.GaussianBlur(g, (5, 5), 0)
    edges = cv2.Canny(blurred, 50, 150)
    contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    best, best_score = None, 0.0
    for c in contours:
        area = cv2.contourArea(c)
        if area < 0.05 * w * h or area > 0.95 * w * h:
            continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)
        rect_score = 1.0 if len(approx) == 4 else 0.5
        x, y, cw, ch = cv2.boundingRect(c)
        fill = area / max(cw * ch, 1.0)
        score = rect_score * (0.5 + 0.5 * fill)
        if score > best_score:
            best, best_score = (x, y, x + cw, y + ch), score
    if best is None:
        return PanelResult(found=False, note="no panel contour established; uncertainty preserved")
    x1, y1, x2, y2 = (int(v) for v in best)
    return PanelResult(found=True, box=[x1, y1, x2, y2],
                       confidence=round(min(best_score, 1.0), 3),
                       note="heuristic contour candidate")


def containment(field_box: list, panel_box: list) -> float:
    """Fraction of the field box area inside the panel (0..1)."""
    ix1, iy1 = max(field_box[0], panel_box[0]), max(field_box[1], panel_box[1])
    ix2, iy2 = min(field_box[2], panel_box[2]), min(field_box[3], panel_box[3])
    inter = max(ix2 - ix1, 0) * max(iy2 - iy1, 0)
    area = max(field_box[2] - field_box[0], 1) * max(field_box[3] - field_box[1], 1)
    return inter / area


def placement_info(field_box: list | None, panel: PanelResult,
                   geom_conf_min: float = 0.6) -> dict:
    """Supplementary placement verdict for the rule engine: passed / failed / unknown."""
    if not field_box or not panel.found:
        return {}  # unknown → engine keeps uncertainty, never a violation
    if panel.confidence < geom_conf_min:
        return {}
    ratio = containment(field_box, panel.box)
    if ratio >= 0.8:
        return {"passed": True, "note": f"field {ratio:.0%} inside panel candidate",
                "panel_box": panel.box, "overlap": round(ratio, 3),
                "uncertainty": "contour heuristic; inspector to confirm"}
    return {"passed": False, "note": f"field only {ratio:.0%} inside panel candidate",
            "panel_box": panel.box, "overlap": round(ratio, 3),
            "uncertainty": "contour heuristic; pending inspector review"}
