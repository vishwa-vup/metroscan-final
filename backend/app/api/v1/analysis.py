"""Analysis endpoints — Phase 8: barcode scale estimation (fallback, uncertainty stated)."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.analysis.readability import barcode_scale
from app.auth.rbac import get_current_user

router = APIRouter(prefix="/analysis", tags=["analysis"])


class ScaleBody(BaseModel):
    barcode_pixel_width: float
    nominal_modules: int = 95
    module_mm: float = 0.33


@router.post("/scale")
def scale(body: ScaleBody, user: dict = Depends(get_current_user)):
    """Estimate px-per-mm from a measured barcode width. Fallback only: GS1
    magnification varies, so the full band is returned — never exact (§20.9–10)."""
    try:
        cal = barcode_scale(body.barcode_pixel_width, body.nominal_modules, body.module_mm)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))
    nominal_mm = body.nominal_modules * body.module_mm
    return {"px_per_mm": round(cal.px_per_mm, 3),
            "band_low": round(body.barcode_pixel_width / (nominal_mm * 2.0), 3),
            "band_high": round(body.barcode_pixel_width / (nominal_mm * 0.8), 3),
            "method": cal.method,
            "warning": ("approximate fallback only — reference-card calibration is preferred; "
                        "never present barcode-derived sizes as exact legal measurements.")}
