"""Image quality gate (§9). Runs BEFORE OCR; failure stops the normal path with the
required recapture message — never a compliance status (§9 rule 12)."""

import numpy as np
from pydantic import BaseModel

from app.preprocessing.image import brightness_contrast, blur_score, to_grayscale

RECAPTURE_MESSAGE = "image quality too low — please upload a clearer or closer photo"


class QualityConfig(BaseModel):
    min_width: int = 400
    min_height: int = 400
    blur_min: float = 60.0
    brightness_min: float = 35.0
    contrast_min: float = 12.0


class QualityResult(BaseModel):
    passed: bool
    message: str = ""
    metrics: dict = {}


def assess(img: np.ndarray, cfg: QualityConfig | None = None) -> QualityResult:
    cfg = cfg or QualityConfig()
    h, w = img.shape[:2]
    gray = to_grayscale(img)
    blur = blur_score(gray)
    bright, contrast = brightness_contrast(gray)
    metrics = {"width": w, "height": h, "blur": round(blur, 2),
               "brightness": round(bright, 2), "contrast": round(contrast, 2)}
    reasons = []
    if w < cfg.min_width or h < cfg.min_height:
        reasons.append(f"too small ({w}x{h})")
    if blur < cfg.blur_min:
        reasons.append(f"blurry (score {blur:.1f})")
    if bright < cfg.brightness_min:
        reasons.append(f"too dark (mean {bright:.1f})")
    if contrast < cfg.contrast_min:
        reasons.append(f"low contrast (std {contrast:.1f})")
    if reasons:
        return QualityResult(passed=False, message=RECAPTURE_MESSAGE, metrics=metrics)
    return QualityResult(passed=True, metrics=metrics)
