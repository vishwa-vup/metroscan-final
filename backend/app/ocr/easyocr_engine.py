"""EasyOCR wrapper — locked default OCR (§8 contract, §42 easyocr_engine tasks)."""

import time

import cv2

from app.ocr.schemas import OcrResult, OcrToken

_reader = None
_reader_factory = None  # test hook: inject a fake reader (no model download)


class OcrEngineError(RuntimeError):
    """Technical OCR failure (init or inference) — never a compliance verdict."""


def set_reader_factory(fn) -> None:
    global _reader_factory
    _reader_factory = fn


def reset_reader() -> None:
    global _reader, _reader_factory
    _reader = None
    _reader_factory = None


def get_reader(languages: tuple[str, ...] = ("en",)):
    global _reader
    if _reader is not None:
        return _reader
    if _reader_factory is not None:
        try:
            _reader = _reader_factory()
        except Exception as exc:  # contract 11: init failures are technical errors
            raise OcrEngineError(f"OCR initialization failed: {exc}") from exc
        return _reader
    try:
        import easyocr
        _reader = easyocr.Reader(list(languages), gpu=False)  # CPU default for demo
    except Exception as exc:  # contract 11: init failures are technical errors
        raise OcrEngineError(f"OCR initialization failed: {exc}") from exc
    return _reader


def _axis_aligned(pts) -> list[int]:
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return [int(min(xs)), int(min(ys)), int(max(xs)), int(max(ys))]


def run_ocr(image_bgr, languages: tuple[str, ...] = ("en",)) -> OcrResult:
    """Run OCR; raw output preserved 1:1 as tokens (contract 8),incl. low-conf (9)."""
    if image_bgr is None or getattr(image_bgr, "size", 0) == 0:
        raise OcrEngineError("empty image passed to OCR")
    h, w = image_bgr.shape[:2]
    reader = get_reader(languages)  # may raise OcrEngineError
    rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    t0 = time.perf_counter()
    try:
        raw = reader.readtext(rgb)
    except Exception as exc:
        raise OcrEngineError(f"OCR inference failed: {exc}") from exc
    duration_ms = (time.perf_counter() - t0) * 1000.0
    tokens = [
        OcrToken(text=str(text), confidence=float(conf), box=_axis_aligned(box),
                 box_convention="xyxy-top-left-origin", index=i)
        for i, (box, text, conf) in enumerate(raw or [])  # empty preserved (12)
    ]
    return OcrResult(tokens=tokens, image_width=int(w), image_height=int(h),
                     languages=list(languages), engine="easyocr", duration_ms=duration_ms)
