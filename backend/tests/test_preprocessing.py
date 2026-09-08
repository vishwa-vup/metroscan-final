"""Phase 1: preprocessing unit tests (§10 rules 7/10/11, §32)."""

import cv2
import numpy as np

from app.preprocessing.image import (
    PreprocessConfig,
    decode_image,
    denoise,
    deskew,
    enhance_contrast,
    preprocess,
    to_grayscale,
)

from make_label import make_label_png


def _img():
    return decode_image(make_label_png())


def test_each_transformation_independently():
    img = _img()
    gray = to_grayscale(img)
    assert len(gray.shape) == 2
    assert denoise(gray).shape == gray.shape
    assert enhance_contrast(gray).shape == gray.shape
    out, angle = deskew(gray)
    assert out.shape == gray.shape and isinstance(angle, float)


def test_combined_pipeline_and_metadata():
    img = _img()
    work, meta = preprocess(img, PreprocessConfig())
    assert meta.working_width > 0 and "grayscale" in meta.steps
    assert meta.params["denoise_h"] == 10.0  # thresholds configurable + recorded


def test_original_immutable_and_deterministic():
    img = _img()
    snapshot = img.copy()
    preprocess(img, PreprocessConfig())
    assert np.array_equal(img, snapshot)
    w1, _ = preprocess(img, PreprocessConfig())
    w2, _ = preprocess(img, PreprocessConfig())
    assert np.array_equal(w1, w2)


def test_decode_rejects_empty_and_corrupt():
    for bad in (b"", b"not-an-image"):
        try:
            decode_image(bad)
        except ValueError:
            continue
        raise AssertionError("should have raised")
    assert decode_image(make_label_png()).shape[0] > 0
    assert cv2 is not None


def test_exif_orientation_honoured():
    """Phone photo stored 400x200 with Orientation=6 must decode as 200x400."""
    from io import BytesIO

    from PIL import Image
    from PIL.Image import Exif

    img = Image.new("RGB", (400, 200), "white")
    ex = Exif()
    ex[274] = 6  # rotate 90 CW to display upright
    buf = BytesIO()
    img.save(buf, format="JPEG", exif=ex)
    decoded = decode_image(buf.getvalue())
    assert decoded.shape[:2] == (400, 200)
