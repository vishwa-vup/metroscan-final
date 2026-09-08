"""OCR contract schemas (§8). Box convention: [x1, y1, x2, y2] ints, top-left origin."""

from pydantic import BaseModel, Field


class OcrToken(BaseModel):
    text: str
    confidence: float = Field(ge=0.0, le=1.0)
    box: list[int]  # [x1, y1, x2, y2]
    box_convention: str = "xyxy-top-left-origin"
    index: int


class OcrResult(BaseModel):
    tokens: list[OcrToken] = []
    image_width: int
    image_height: int
    languages: list[str] = ["en"]
    engine: str = "easyocr"
    duration_ms: float = 0.0

    @property
    def raw_text(self) -> str:
        return "\n".join(t.text for t in self.tokens)
