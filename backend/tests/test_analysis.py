"""Phase 6: placement + readability tests (§§19–20) — gates 8–9 stay uncertainty-safe."""

import sys
from pathlib import Path

import cv2
import numpy as np
import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.analysis.placement import containment, detect_panel, placement_info  # noqa: E402
from app.analysis.readability import (  # noqa: E402
    barcode_scale,
    calibrate_reference,
    estimate_text_height,
    readability_info,
)
from app.rules import engine as eng  # noqa: E402
from app.rules.loader import get_active_ruleset  # noqa: E402


def _panel_image():
    img = np.zeros((600, 800, 3), dtype=np.uint8)
    cv2.rectangle(img, (100, 80), (700, 520), (255, 255, 255), -1)  # label face
    cv2.putText(img, "Net Qty 500 g", (200, 300), cv2.FONT_HERSHEY_SIMPLEX, 1.2, (0, 0, 0), 3)
    return img


def test_contour_finds_simple_rectangular_label():
    panel = detect_panel(_panel_image())
    assert panel.found and panel.confidence > 0
    x1, y1, x2, y2 = panel.box
    assert x1 < 150 and y1 < 130 and x2 > 650 and y2 > 470  # roughly the drawn face


def test_blank_image_is_unknown_not_failure():
    panel = detect_panel(np.zeros((400, 400, 3), dtype=np.uint8))
    assert not panel.found
    assert placement_info([10, 10, 50, 50], panel) == {}  # uncertainty, never violation


def test_containment_math():
    assert containment([0, 0, 10, 10], [0, 0, 10, 10]) == pytest.approx(1.0)
    assert containment([0, 0, 10, 10], [20, 20, 30, 30]) == pytest.approx(0.0)
    assert containment([0, 0, 10, 10], [5, 0, 15, 10]) == pytest.approx(0.5)


def test_outside_panel_with_confidence_is_pending_with_uncertainty():
    rs = get_active_ruleset()
    field = {"value_raw": "500 g", "confidence": 0.9, "evidence_boxes": [[700, 500, 790, 540]],
             "meta": {"placement": {"passed": False, "note": "field only 0% inside",
                                    "uncertainty": "contour heuristic; pending inspector review"}}}
    r7 = next(x for x in eng.evaluate({"net_quantity": field}, rs) if x.rule_id == "R7")
    assert r7.machine_status == "POTENTIAL_NON_COMPLIANCE"  # human still decides
    assert "pending inspector review" in r7.message


def test_missing_analysis_is_uncertain_never_potential():
    rs = get_active_ruleset()
    field = {"value_raw": "500 g", "confidence": 0.95, "evidence_boxes": [[0, 0, 10, 10]],
             "meta": {}}
    for rid in ("R7", "R8"):
        rx = next(x for x in eng.evaluate({"net_quantity": field}, rs) if x.rule_id == rid)
        assert rx.machine_status == "COULD_NOT_RELIABLY_VERIFY", rid  # gate 8/9


def test_calibration_math_exact():
    cal = calibrate_reference(ref_width_mm=10.0, ref_pixel_width=100.0)
    assert cal.px_per_mm == pytest.approx(10.0) and cal.method == "reference-card"
    est = estimate_text_height([0, 0, 50, 40], cal)  # 40px at 10px/mm
    assert est.height_mm == pytest.approx(4.0)
    assert est.uncertainty_mm == pytest.approx(0.6)  # ±15%, stated
    with pytest.raises(ValueError):
        calibrate_reference(0, 100)


def test_barcode_fallback_is_wide_and_labeled():
    cal = barcode_scale(barcode_pixel_width=434.0)  # ~31.35mm EAN-13 at mid magnification
    assert cal.method == "barcode-fallback"
    est = estimate_text_height([0, 0, 50, 40], cal)
    ref = estimate_text_height([0, 0, 50, 40],
                               calibrate_reference(31.35, 434.0 / 1.4))
    assert est.uncertainty_mm > ref.uncertainty_mm  # fallback band wider by construction
    assert "barcode" in est.note
    assert readability_info([0, 0, 10, 10], None) == {}  # no calibration → no claim
