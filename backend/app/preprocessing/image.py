"""OpenCV preprocessing (§10). Original evidence stays immutable; all work on a copy."""

import math

import cv2
import numpy as np
from pydantic import BaseModel


class PreprocessConfig(BaseModel):
    grayscale: bool = True
    denoise_h: float = 10.0
    clahe_clip: float = 2.0
    deskew: bool = True
    max_dim: int = 2000  # downscale working copy only if larger; original untouched


class PreprocessMeta(BaseModel):
    steps: list[str] = []
    params: dict = {}
    working_width: int = 0
    working_height: int = 0


def to_grayscale(img: np.ndarray) -> np.ndarray:
    if len(img.shape) == 2:
        return img
    return cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)


def denoise(gray: np.ndarray, h: float = 10.0) -> np.ndarray:
    if h <= 0:
        return gray
    return cv2.fastNlMeansDenoising(gray, None, h, 7, 21)


def enhance_contrast(gray: np.ndarray, clip: float = 2.0) -> np.ndarray:
    if clip <= 0:
        return gray
    clahe = cv2.createCLAHE(clipLimit=clip, tileGridSize=(8, 8))
    return clahe.apply(gray)


def deskew(gray: np.ndarray) -> tuple[np.ndarray, float]:
    """Estimate skew via min-area rect of dark pixels; rotate to correct. Returns (img, angle)."""
    _, bw = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    coords = cv2.findNonZero(bw)
    if coords is None:
        return gray, 0.0
    angle = cv2.minAreaRect(coords)[-1]
    if angle < -45:
        angle = -(90 + angle)
    else:
        angle = -angle
    if abs(angle) < 0.5 or abs(angle) > 15:
        return gray, 0.0  # avoid aggressive filtering (§10 rule 12)
    h, w = gray.shape[:2]
    m = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
    return cv2.warpAffine(gray, m, (w, h), flags=cv2.INTER_CUBIC,
                          borderMode=cv2.BORDER_REPLICATE), angle


def preprocess(image_bgr: np.ndarray, cfg: PreprocessConfig | None = None
               ) -> tuple[np.ndarray, PreprocessMeta]:
    cfg = cfg or PreprocessConfig()
    if image_bgr is None or image_bgr.size == 0:
        raise ValueError("empty image")
    work = image_bgr.copy()  # original immutable (§10 rule 1)
    meta = PreprocessMeta(params=cfg.model_dump())
    h, w = work.shape[:2]
    if max(h, w) > cfg.max_dim:
        scale = cfg.max_dim / max(h, w)
        work = cv2.resize(work, (int(w * scale), int(h * scale)))
        meta.steps.append(f"resize:{scale:.3f}")
    if cfg.grayscale:
        work = to_grayscale(work)
        meta.steps.append("grayscale")
    if cfg.denoise_h > 0:
        work = denoise(work, cfg.denoise_h)
        meta.steps.append("denoise")
    if cfg.clahe_clip > 0:
        work = enhance_contrast(work, cfg.clahe_clip)
        meta.steps.append("contrast")
    if cfg.deskew:
        work, angle = deskew(work)
        meta.steps.append(f"deskew:{angle:.2f}")
    meta.working_height, meta.working_width = work.shape[:2]
    return work, meta


def decode_image(image_bytes: bytes) -> np.ndarray:
    """Decode uploads to BGR, honouring EXIF orientation (phone cameras)."""
    if not image_bytes:
        raise ValueError("empty file")
    try:
        from io import BytesIO

        from PIL import Image, ImageOps

        pil = ImageOps.exif_transpose(Image.open(BytesIO(image_bytes))).convert("RGB")
        return cv2.cvtColor(np.array(pil), cv2.COLOR_RGB2BGR)
    except ValueError:
        raise
    except Exception as exc:
        raise ValueError(f"corrupt or undecodable image: {exc}") from exc


def blur_score(gray: np.ndarray) -> float:
    g = to_grayscale(gray) if len(gray.shape) == 3 else gray
    return float(cv2.Laplacian(g, cv2.CV_64F).var())


def brightness_contrast(gray: np.ndarray) -> tuple[float, float]:
    g = to_grayscale(gray).astype(np.float64) if len(gray.shape) == 3 else gray.astype(np.float64)
    return float(g.mean()), float(g.std())
