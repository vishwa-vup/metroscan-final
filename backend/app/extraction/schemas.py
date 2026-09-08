"""Extraction schemas: candidates ranked, alternatives preserved, confidence propagated."""

from pydantic import BaseModel, Field


class Candidate(BaseModel):
    value_raw: str
    value_normalized: str = ""
    box: list[int] = []  # union evidence box, xyxy-top-left-origin
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    score: float = 0.0  # lower = better; deterministic tie-break by token order
    signals: dict = {}  # same_line / aligned / anchor_distance_norm / ...
    source_token_indices: list[int] = []


class ExtractedField(BaseModel):
    key: str
    value_raw: str = ""  # NEVER fabricated: "" means not found (§7)
    value_normalized: str = ""
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
    ocr_confidence: float = Field(default=0.0, ge=0.0, le=1.0)  # min source-token conf
    evidence_boxes: list[list[int]] = []
    candidates: list[Candidate] = []  # competing alternatives, best-first
    transforms: list[str] = []  # normalization steps applied (recorded, §11.10)
    meta: dict = {}  # role / unit-kind / partial flags — never invented values
