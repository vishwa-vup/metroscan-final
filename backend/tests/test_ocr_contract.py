"""Phase 1: OCR contract tests (§8) with injected fake reader — no model download."""

import numpy as np
import pytest

from app.ocr import easyocr_engine as eng
from app.ocr.schemas import OcrResult
from app.preprocessing.image import decode_image

from make_label import make_label_png


class FakeReader:
    def __init__(self, rows):
        self._rows = rows

    def readtext(self, img):
        assert img.shape[2] == 3  # engine feeds RGB
        return self._rows


@pytest.fixture
def img():
    return decode_image(make_label_png())


def test_tokens_carry_text_confidence_box_index(img):
    eng.set_reader_factory(lambda: FakeReader([
        ([[10, 10], [100, 10], [100, 40], [10, 40]], "MRP: Rs 99.00", 0.95),
        ([[10, 50], [90, 50], [90, 80], [10, 80]], "Net Qty 500 g", 0.62),
    ]))
    try:
        res = eng.run_ocr(img)
    finally:
        eng.reset_reader()
    assert isinstance(res, OcrResult)
    assert [t.index for t in res.tokens] == [0, 1]
    assert res.tokens[0].box == [10, 10, 100, 40]
    assert res.tokens[0].box_convention == "xyxy-top-left-origin"
    assert res.tokens[0].confidence == pytest.approx(0.95)
    assert res.image_width == img.shape[1] and res.image_height == img.shape[0]
    assert res.engine == "easyocr"  # locked default surfaced


def test_empty_output_preserved_and_serializable(img):
    eng.set_reader_factory(lambda: FakeReader([]))
    try:
        res = eng.run_ocr(img)
    finally:
        eng.reset_reader()
    assert res.tokens == [] and res.raw_text == ""
    res.model_dump_json()  # serializable (contract 15)


def test_low_confidence_tokens_stay_inspectable(img):
    eng.set_reader_factory(lambda: FakeReader([([[0, 0], [5, 0], [5, 5], [0, 5]], "x", 0.11)]))
    try:
        res = eng.run_ocr(img)
    finally:
        eng.reset_reader()
    assert res.tokens[0].confidence == pytest.approx(0.11)  # not filtered (contract 9)


def test_init_failure_is_technical_error(img):
    def boom():
        raise RuntimeError("no models")
    eng.set_reader_factory(boom)
    try:
        with pytest.raises(eng.OcrEngineError):
            eng.run_ocr(img)
    finally:
        eng.reset_reader()


def test_empty_image_rejected():
    with pytest.raises(eng.OcrEngineError):
        eng.run_ocr(np.zeros((0, 0, 3), dtype=np.uint8))
