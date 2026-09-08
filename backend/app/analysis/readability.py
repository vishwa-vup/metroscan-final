"""Readability / font-size analysis (§20). Reference-card calibration is primary;
barcode is an approximate fallback with stated uncertainty — never exact (§20.9–10)."""

from pydantic import BaseModel

UNCERTAINTY_REL = 0.15  # ±15% geometry uncertainty on text-height estimates


class Calibration(BaseModel):
    px_per_mm: float
    method: str  # "reference-card" | "barcode-fallback"
    ref_note: str = ""


class SizeEstimate(BaseModel):
    height_mm: float
    uncertainty_mm: float
    method: str
    note: str = ""


def calibrate_reference(ref_width_mm: float, ref_pixel_width: float) -> Calibration:
    """Reference card/ruler sharing the image geometry (§20.1–4)."""
    if ref_width_mm <= 0 or ref_pixel_width <= 0:
        raise ValueError("calibration needs positive reference width")
    return Calibration(px_per_mm=ref_pixel_width / ref_width_mm,
                       method="reference-card",
                       ref_note=f"{ref_pixel_width}px = {ref_width_mm}mm")


def barcode_scale(barcode_pixel_width: float, nominal_modules: int = 95,
                  module_mm: float = 0.33, mag_low: float = 0.8,
                  mag_high: float = 2.0) -> Calibration:
    """GS1 magnification varies ~0.8×–2.0× nominal: return the midpoint scale and let
    callers widen uncertainty across the full magnification band."""
    if barcode_pixel_width <= 0:
        raise ValueError("barcode width must be positive")
    nominal_mm = nominal_modules * module_mm
    mid_mag = (mag_low + mag_high) / 2.0
    return Calibration(px_per_mm=barcode_pixel_width / (nominal_mm * mid_mag),
                       method="barcode-fallback",
                       ref_note=(f"barcode fallback: {nominal_modules} modules × {module_mm}mm "
                                 f"at ×{mag_low}–×{mag_high}; approximate only"))


def estimate_text_height(box: list, cal: Calibration) -> SizeEstimate:
    px_h = max(box[3] - box[1], 1)
    mm = px_h / cal.px_per_mm
    if cal.method == "barcode-fallback":
        # full magnification band as uncertainty (never fake precision, §20.8)
        lo = px_h / (cal.px_per_mm * (2.0 / 1.4))
        hi = px_h / (cal.px_per_mm * (0.8 / 1.4))
        unc = (hi - lo) / 2.0
        note = "barcode fallback — wide uncertainty band; prefer reference-card calibration"
    else:
        unc = mm * UNCERTAINTY_REL
        note = "reference-card scale ±15% geometry uncertainty"
    return SizeEstimate(height_mm=round(mm, 2), uncertainty_mm=round(unc, 2),
                        method=cal.method, note=note)


def readability_info(field_box: list | None, cal: Calibration | None) -> dict:
    if not field_box or cal is None:
        return {}  # no calibration → uncertainty, never a claim (§20.12)
    est = estimate_text_height(field_box, cal)
    return {"passed": None, "estimate_mm": est.height_mm,
            "uncertainty_mm": est.uncertainty_mm, "method": est.method, "note": est.note}
