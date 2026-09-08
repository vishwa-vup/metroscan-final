"""Phase 6: quality gate tests (§9 rules 10–19) — gate 7 (reject unsuitable images)."""

import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.preprocessing.image import decode_image  # noqa: E402
from app.preprocessing.quality import RECAPTURE_MESSAGE, assess  # noqa: E402
from app.services import scan_pipeline as pipe  # noqa: E402
from auth_helper import authed, init_test_db, teardown_test_db  # noqa: E402
from make_label import make_label_png  # noqa: E402

EXACT = "image quality too low — please upload a clearer or closer photo"
assert RECAPTURE_MESSAGE == EXACT  # required user-facing message, verbatim


def _variant(kind: str) -> bytes:
    img = decode_image(make_label_png())
    if kind == "sharp":
        return make_label_png()
    if kind == "blurry":
        out = cv2.GaussianBlur(img, (25, 25), 0)
    elif kind == "dark":
        out = (img * 0.12).astype(np.uint8)
    elif kind == "lowcontrast":
        gray = np.full_like(img, 128)
        out = cv2.addWeighted(img, 0.12, gray, 0.88, 0)
    elif kind == "small":
        tiny = np.array(Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB)).resize((200, 150)))
        out = cv2.cvtColor(tiny, cv2.COLOR_RGB2BGR)
    else:
        raise AssertionError(kind)
    ok, buf = cv2.imencode(".png", out)
    assert ok
    return bytes(buf)


def test_sharp_passes_blurry_small_dark_lowcontrast_fail():
    assert assess(decode_image(_variant("sharp"))).passed
    for kind in ("blurry", "small", "dark", "lowcontrast"):
        q = assess(decode_image(_variant(kind)))
        assert not q.passed, kind
        assert q.message == EXACT and q.metrics  # diagnostics kept (§9.9)


def test_rotated_image_still_assessable():
    img = decode_image(make_label_png())
    h, w = img.shape[:2]
    m = cv2.getRotationMatrix2D((w / 2, h / 2), 8, 1.0)
    rot = cv2.warpAffine(img, m, (w, h), borderMode=cv2.BORDER_REPLICATE)
    assert assess(rot).passed  # modest rotation is handled downstream, not rejected


def test_api_rejects_poor_image_with_recapture_message(tmp_path, monkeypatch):
    from app.ocr import easyocr_engine as engocr

    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    init_test_db(tmp_path, monkeypatch)
    pipe._store = None
    engocr.set_reader_factory(lambda: None)
    try:
        c = TestClient(app)
        headers, _ = authed(c, "inspector", "qual@t.local")
        c.headers.update(headers)
        r = c.post("/api/v1/scans", files={"image": ("b.png", _variant("blurry"), "image/png")})
        assert r.status_code == 422, r.text
        assert r.json()["detail"]["message"] == EXACT
        sid = r.json()["detail"]["scan_id"]
        scan = c.get(f"/api/v1/scans/{sid}").json()
        assert scan["processing_state"] == "QUALITY_REJECTED"
        assert scan["findings"] == []  # rejection is not a compliance status (§9.12)
        s = c.get("/api/v1/dashboard/summary").json()
        assert s["quality_rejected"] >= 1
    finally:
        engocr.reset_reader()
        pipe._store = None
        teardown_test_db()
