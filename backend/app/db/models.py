"""PostgreSQL entities (§23). Generic column types: production runs PostgreSQL
(DATABASE_URL); automated tests use a SQLite file as transport for the same models."""

from datetime import datetime, timezone

from sqlalchemy import JSON, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


def utcnow():
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), default="")
    role: Mapped[str] = mapped_column(String(32), default="inspector", index=True)
    business_id: Mapped[int | None] = mapped_column(ForeignKey("businesses.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Business(Base):
    __tablename__ = "businesses"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Product(Base):
    __tablename__ = "products"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.id"), index=True)
    name: Mapped[str] = mapped_column(String(255), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Scan(Base):
    __tablename__ = "scans"
    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    filename: Mapped[str] = mapped_column(String(255), default="")
    width: Mapped[int] = mapped_column(Integer, default=0)
    height: Mapped[int] = mapped_column(Integer, default=0)
    processing_state: Mapped[str] = mapped_column(String(32), default="RECEIVED", index=True)
    rule_set_version: Mapped[str] = mapped_column(String(16), default="")
    pipeline_version: Mapped[str] = mapped_column(String(32), default="")
    asset_name: Mapped[str] = mapped_column(String(128), default="")
    business_id: Mapped[int | None] = mapped_column(ForeignKey("businesses.id"),
                                                   nullable=True, index=True)
    created_by: Mapped[str] = mapped_column(String(255), default="", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow,
                                                index=True)


class OcrToken(Base):
    __tablename__ = "ocr_tokens"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scan_id: Mapped[str] = mapped_column(ForeignKey("scans.id"), index=True)
    idx: Mapped[int] = mapped_column(Integer, default=0)
    text: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    x1: Mapped[int] = mapped_column(Integer, default=0)
    y1: Mapped[int] = mapped_column(Integer, default=0)
    x2: Mapped[int] = mapped_column(Integer, default=0)
    y2: Mapped[int] = mapped_column(Integer, default=0)


class ExtractedField(Base):
    __tablename__ = "extracted_fields"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scan_id: Mapped[str] = mapped_column(ForeignKey("scans.id"), index=True)
    key: Mapped[str] = mapped_column(String(64), index=True)
    value_raw: Mapped[str] = mapped_column(Text, default="")
    value_normalized: Mapped[str] = mapped_column(Text, default="")
    confidence: Mapped[float] = mapped_column(Float, default=0.0)
    ocr_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    boxes: Mapped[list] = mapped_column(JSON, default=list)
    candidates: Mapped[list] = mapped_column(JSON, default=list)
    transforms: Mapped[list] = mapped_column(JSON, default=list)
    meta: Mapped[dict] = mapped_column(JSON, default=dict)


class RuleEvaluation(Base):
    __tablename__ = "rule_evaluations"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scan_id: Mapped[str] = mapped_column(ForeignKey("scans.id"), index=True)
    rule_id: Mapped[str] = mapped_column(String(16), index=True)
    clause: Mapped[str] = mapped_column(String(32), default="")
    field: Mapped[str] = mapped_column(String(64), default="")
    machine_status: Mapped[str] = mapped_column(String(40), default="", index=True)
    message: Mapped[str] = mapped_column(Text, default="")
    ocr_confidence: Mapped[float] = mapped_column(Float, default=0.0)
    ruleset_version: Mapped[str] = mapped_column(String(16), default="")
    review: Mapped[dict | None] = mapped_column(JSON, nullable=True)


class InspectorReview(Base):
    __tablename__ = "inspector_reviews"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scan_id: Mapped[str] = mapped_column(ForeignKey("scans.id"), index=True)
    rule_id: Mapped[str] = mapped_column(String(16), default="")
    action: Mapped[str] = mapped_column(String(16), default="")
    reviewer: Mapped[str] = mapped_column(String(255), default="", index=True)
    note: Mapped[str] = mapped_column(Text, default="")
    prev_status: Mapped[str] = mapped_column(String(40), default="")
    new_status: Mapped[str] = mapped_column(String(40), default="")
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Report(Base):
    __tablename__ = "reports"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scan_id: Mapped[str] = mapped_column(ForeignKey("scans.id"), index=True)
    format: Mapped[str] = mapped_column(String(8), default="pdf")
    byte_size: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class RuleSetVersion(Base):
    __tablename__ = "ruleset_versions"
    version: Mapped[str] = mapped_column(String(16), primary_key=True)
    rules_json: Mapped[dict] = mapped_column(JSON, default=dict)
    loaded_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditEvent(Base):
    __tablename__ = "audit_events"
    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    scan_id: Mapped[str | None] = mapped_column(String(64), nullable=True, index=True)
    actor: Mapped[str] = mapped_column(String(255), default="")
    action: Mapped[str] = mapped_column(String(64), default="", index=True)
    detail: Mapped[str] = mapped_column(Text, default="")
    at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
