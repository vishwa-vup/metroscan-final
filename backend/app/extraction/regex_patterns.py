"""Structured patterns (§42 regex_patterns tasks) + configurable keyword aliases (§11.2)."""

import re

# Keyword aliases are module-level lists so deployments can extend them without
# touching logic. Matching is case-insensitive, punctuation-tolerant.
MRP_KEYS = ["mrp", "maximum retail price", "max retail price", "retail price"]
NETQTY_KEYS = ["net qty", "net quantity", "net weight", "net content", "net wt",
               "net vol", "net volume", "quantity"]
MFG_KEYS = ["mfg", "manufactured", "manufacturing", "mfd", "packed on", "packed",
            "date of manufacture", "month of manufacture"]
EXPIRY_KEYS = ["exp", "expiry", "expires", "best before", "use by", "use before"]
CONSUMER_KEYS = ["consumer care", "customer care", "consumer complaints",
                 "toll free", "helpline", "contact", "care "]
MFR_KEYS = ["manufacturer", "manufactured by", "mfd by", "packer", "packed by",
            "importer", "imported by", "marketer", "marketed by", "mktd"]

MONEY_RE = re.compile(
    r"(?:(₹|Rs\.?|INR)\s?)?(\d{1,3}(?:,\d{2,3})+(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)")
QTY_RE = re.compile(
    r"(\d+(?:\.\d+)?)\s?(kg|kilogram(?:s)?|g|gram(?:s)?|mg|L|litre(?:s)?|liter(?:s)?|ml)\b",
    re.IGNORECASE)
DIM_RE = re.compile(r"\d+\s?[x×]\s?\d+", re.IGNORECASE)  # dimensions ≠ net qty (§14.8)
MONTH_YEAR_RE = re.compile(
    r"\b((?:0?[1-9]|1[0-2])[/\-.](?:19|20)\d{2}|(?:19|20)\d{2}[/\-.](?:0?[1-9]|1[0-2])|"
    r"(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*[,\s]+(?:19|20)\d{2})\b",
    re.IGNORECASE)
FULL_DATE_RE = re.compile(
    r"\b((?:0?[1-9]|[12]\d|3[01])[/\-.](?:0?[1-9]|1[0-2])[/\-.](?:19|20)\d{2})\b")
PHONE_RE = re.compile(
    r"(?<!\d)(?:\+91[\s\-]?|0[\s\-]?)?(?:[6-9](?:[\s\-]?\d){9}|1800(?:[\s\-]?\d){6,7})(?!\d)")
EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")

MASS_UNITS = {"kg", "kilogram", "kilograms", "g", "gram", "grams", "mg"}
VOLUME_UNITS = {"l", "litre", "litres", "liter", "liters", "ml"}


def _norm_unit(u: str) -> str:
    if u == "L":
        return "L"  # capital-L litre avoids 1/l confusion; canonical per label convention
    u = u.lower()
    return {"kilograms": "kg", "kilogram": "kg", "grams": "g", "gram": "g",
            "litres": "L", "litre": "L", "liters": "L", "liter": "L"}.get(u, u)


def unit_kind(unit: str) -> str:
    u = _norm_unit(unit).lower()  # "L" and "l" both volume
    if u in MASS_UNITS:
        return "mass"
    if u in VOLUME_UNITS:
        return "volume"
    return "unknown"


def normalize_unit(unit: str) -> str:
    return _norm_unit(unit)


def key_hit(text: str, keys: list[str]) -> bool:
    t = text.lower()
    return any(k in t for k in keys)
