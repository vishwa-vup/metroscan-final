"""Field extractors (§§11–16, §42 fields tasks). Deterministic, total, never fabricating."""

import re

from app.extraction.proximity import anchor_score, edge_aligned, norm_distance, same_line
from app.extraction.regex_patterns import (
    CONSUMER_KEYS,
    DIM_RE,
    EMAIL_RE,
    EXPIRY_KEYS,
    FULL_DATE_RE,
    MFR_KEYS,
    MFG_KEYS,
    MONEY_RE,
    MONTH_YEAR_RE,
    MRP_KEYS,
    NETQTY_KEYS,
    PHONE_RE,
    QTY_RE,
    key_hit,
    normalize_unit,
    unit_kind,
)
from app.extraction.schemas import Candidate, ExtractedField
from app.ocr.schemas import OcrToken

AMBIGUITY_PENALTY = 0.7
PARTIAL_PENALTY = 0.8
NO_ANCHOR_PENALTY = 0.6


class _Line:
    def __init__(self, text, box, idxs, confs):
        self.text = text
        self.box = box
        self.idxs = idxs
        self.confs = confs

    @property
    def conf(self):
        return min(self.confs) if self.confs else 0.0


def group_lines(tokens: list[OcrToken]) -> list[_Line]:
    ordered = sorted(tokens, key=lambda t: (t.box[1], t.box[0]))
    if not ordered:
        return []
    heights = sorted(max(t.box[3] - t.box[1], 1) for t in ordered)
    tol = max(heights[len(heights) // 2] * 0.6, 2.0)
    lines, cur = [], []
    for t in ordered:
        if cur and t.box[1] > max(c.box[3] for c in cur) + tol:
            lines.append(_finish(cur))
            cur = []
        cur.append(t)
    if cur:
        lines.append(_finish(cur))
    return lines


def _finish(ts) -> _Line:
    ts = sorted(ts, key=lambda t: t.box[0])
    box = [min(t.box[0] for t in ts), min(t.box[1] for t in ts),
           max(t.box[2] for t in ts), max(t.box[3] for t in ts)]
    return _Line(" ".join(t.text for t in ts), box,
                 [t.index for t in ts], [t.confidence for t in ts])


def _spans(rx: re.Pattern, text: str):
    return [(m.start(), m.end(), m) for m in rx.finditer(text)]


def _missing(key: str) -> ExtractedField:
    return ExtractedField(key=key)  # value_raw "" — never fabricated


def _ranked_anchor_search(lines, span_rx, anchor_keys, w, h, exclude_rx=None,
                          min_conf=0.0):
    """Generic anchored search: spans ranked by anchor proximity; alternatives kept."""
    anchors = [ln for ln in lines if key_hit(ln.text, anchor_keys)]
    cands: list[Candidate] = []
    order = 0
    for ln in lines:
        for s, e, m in _spans(span_rx, ln.text):
            if exclude_rx and any(a <= s < b or a < e <= b or (s <= a and e >= b)
                                  for a, b, _ in _spans(exclude_rx, ln.text)):
                continue
            raw = m.group(0)
            if not raw.strip():
                continue
            best_d, line_hit, align_hit = 1.0, False, False
            if anchors:
                ds = []
                for an in anchors:
                    ds.append(norm_distance(ln.box, an.box, w, h))
                    line_hit = line_hit or same_line(ln.box, an.box)
                    align_hit = align_hit or edge_aligned(ln.box, an.box, w)
                best_d = min(ds)
            score = anchor_score(best_d, line_hit, align_hit, has_anchor=bool(anchors))
            cands.append(Candidate(value_raw=raw, box=list(ln.box), confidence=ln.conf,
                                   score=score,
                                   signals={"anchor_distance_norm": round(best_d, 4),
                                            "same_line": line_hit, "aligned": align_hit,
                                            "anchored": bool(anchors)},
                                   source_token_indices=list(ln.idxs)))
            order += 1
    cands.sort(key=lambda c: (c.score, c.source_token_indices[0]
                              if c.source_token_indices else order))
    return cands, bool(anchors)


def _pick(key, cands, normalize, anchored, extra_meta=None):
    if not cands:
        return _missing(key)
    best = cands[0]
    conf = best.confidence
    transforms = list(getattr(normalize, "_steps", []))
    norm = normalize(best.value_raw)
    if len(cands) > 1 and (cands[1].score - best.score) < 0.05:
        conf *= AMBIGUITY_PENALTY  # unresolved ambiguity → lower conf → review (§12.9)
        transforms.append("ambiguity-penalty:0.7")
    if not anchored:
        conf *= NO_ANCHOR_PENALTY
        transforms.append("no-anchor-penalty:0.6")
    return ExtractedField(key=key, value_raw=best.value_raw, value_normalized=norm,
                          confidence=round(min(conf, 1.0), 4), ocr_confidence=best.confidence,
                          evidence_boxes=[c.box for c in cands[:3]],
                          candidates=cands[:3], transforms=transforms,
                          meta=extra_meta or {})


def _norm_money(raw: str) -> str:
    m = MONEY_RE.search(raw)
    num = m.group(2).replace(",", "") if m else raw
    sym = m.group(1) if m and m.group(1) else ""
    cur = {"₹": "INR", "Rs": "INR", "Rs.": "INR", "INR": "INR"}.get(sym, "INR")
    return f"{num} {cur}"
_norm_money._steps = ["strip-commas", "currency-canonical"]  # type: ignore[attr-defined]


def extract_mrp(lines, w, h) -> ExtractedField:
    cands, anchored = _ranked_anchor_search(lines, MONEY_RE, MRP_KEYS, w, h)
    if not anchored:
        # No MRP context anywhere: never crown a bare number (§12.11–13).
        return _missing("mrp")
    # Symbol-free bare numbers (pincodes, counts, fragments like " 500") are
    # dropped unless on the SAME LINE as an anchor; symbol is supporting
    # evidence only (§12.6), proximity decides.
    kept = [c for c in cands
            if re.search(r"₹|Rs\.?|INR", c.value_raw)
            or (c.signals.get("same_line")
                and c.signals.get("anchor_distance_norm", 1.0) <= 0.30)]
    kept.sort(key=lambda c: (c.score, c.source_token_indices[0]
                             if c.source_token_indices else 0))
    return _pick("mrp", kept, _norm_money, anchored)


def _norm_qty(raw: str) -> str:
    m = QTY_RE.search(raw)
    if not m:
        return raw
    return f"{m.group(1)} {normalize_unit(m.group(2))}"
_norm_qty._steps = ["unit-canonical-spacing"]  # type: ignore[attr-defined]


def extract_net_quantity(lines, w, h) -> ExtractedField:
    cands, anchored = _ranked_anchor_search(lines, QTY_RE, NETQTY_KEYS, w, h,
                                            exclude_rx=DIM_RE)
    kinds = {unit_kind(QTY_RE.search(c.value_raw).group(2)) for c in cands[:1]
             if QTY_RE.search(c.value_raw)}
    meta = {"unit_kind": next(iter(kinds), "unknown")} if cands else {}
    return _pick("net_quantity", cands, _norm_qty, anchored, meta)


def _norm_date(raw: str) -> str:
    m = FULL_DATE_RE.search(raw)
    if m:
        d, mo, y = re.split(r"[/\-.]", m.group(1))
        return f"{y}-{mo.zfill(2)}-{d.zfill(2)}"
    m = MONTH_YEAR_RE.search(raw)
    if m:
        return m.group(1)  # month-year kept as seen; normalize only if unambiguous
    return raw
_norm_date._steps = ["iso-date-when-unambiguous"]  # type: ignore[attr-defined]


def extract_manufacture_date(lines, w, h) -> ExtractedField:
    cands, anchored = _ranked_anchor_search(lines, MONTH_YEAR_RE, MFG_KEYS, w, h)
    c2, _ = _ranked_anchor_search(lines, FULL_DATE_RE, MFG_KEYS, w, h)
    cands = sorted(cands + c2,
                   key=lambda c: (c.score, c.source_token_indices[0]
                                  if c.source_token_indices else 0))
    # expiry kept separate (§13.4): record sighting, never merge into mfg value.
    exp, _ = _ranked_anchor_search(lines, MONTH_YEAR_RE, EXPIRY_KEYS, w, h)
    exp2, _ = _ranked_anchor_search(lines, FULL_DATE_RE, EXPIRY_KEYS, w, h)
    meta = {}
    if exp or exp2:
        meta["expiry_seen"] = (exp + exp2)[0].value_raw
    return _pick("date_of_manufacture", cands, _norm_date, anchored, meta)


def extract_consumer_care(lines, w, h) -> ExtractedField:
    cands, anchored = _ranked_anchor_search(lines, PHONE_RE, CONSUMER_KEYS, w, h)
    mails, anchored_m = _ranked_anchor_search(lines, EMAIL_RE, CONSUMER_KEYS, w, h)
    if not anchored and not anchored_m:
        # Never infer contact from arbitrary digits (§16.6).
        return _missing("consumer_care")
    allc = sorted(cands + mails,
                  key=lambda c: (c.score, c.source_token_indices[0]
                                 if c.source_token_indices else 0))
    if not allc:
        return _missing("consumer_care")
    has_phone = any(PHONE_RE.search(c.value_raw) for c in allc)
    has_mail = any(EMAIL_RE.search(c.value_raw) for c in allc)
    partial = not (has_phone and has_mail)
    best = allc[0]
    conf = best.confidence * (PARTIAL_PENALTY if partial else 1.0)
    if len(allc) > 1 and (allc[1].score - best.score) < 0.05:
        conf *= AMBIGUITY_PENALTY
    return ExtractedField(
        key="consumer_care",
        value_raw="; ".join(dict.fromkeys(c.value_raw for c in allc[:3])),
        value_normalized="; ".join(dict.fromkeys(c.value_raw for c in allc[:3])),
        confidence=round(min(conf, 1.0), 4), ocr_confidence=best.confidence,
        evidence_boxes=[c.box for c in allc[:3]], candidates=allc[:3],
        transforms=(["partial-contact"] if partial else []),
        meta={"partial": partial, "has_phone": has_phone, "has_email": has_mail})


def _role_of(text: str) -> str:
    t = text.lower()
    roles = set()
    if "import" in t:
        roles.add("importer")
    if "pack" in t:
        roles.add("packer")
    if "manufact" in t or "mfd" in t or "market" in t or "mktd" in t:
        roles.add("manufacturer")
    if len(roles) != 1:
        return "ambiguous"
    return next(iter(roles))


def extract_manufacturer(lines, w, h) -> tuple[ExtractedField, ExtractedField]:
    anchors = [(i, ln) for i, ln in enumerate(lines) if key_hit(ln.text, MFR_KEYS)]
    if not anchors:
        return _missing("manufacturer_name"), _missing("manufacturer_address")
    ai, anchor = min(anchors, key=lambda p: p[1].box[1])  # topmost anchor
    roles = {_role_of(ln.text) for _, ln in anchors}
    role = next(iter(roles)) if len(roles) == 1 else "ambiguous"
    name = ExtractedField(
        key="manufacturer_name", value_raw=anchor.text, value_normalized=anchor.text,
        confidence=round(anchor.conf, 4), ocr_confidence=anchor.conf,
        evidence_boxes=[list(anchor.box)], candidates=[],
        transforms=[], meta={"role": role,
                             "role_candidates": sorted(roles)})  # §15.7 exposed
    # multiline address reconstruction (§15.3): following lines, same paragraph —
    # stopping at lines that belong to other declarations (§15.6).
    addr_lines = []
    for ln in lines[ai + 1: ai + 4]:
        if ln.box[1] - anchor.box[3] > 3 * max(anchor.box[3] - anchor.box[1], 1):
            break
        if key_hit(ln.text, MRP_KEYS + NETQTY_KEYS + MFG_KEYS + EXPIRY_KEYS + CONSUMER_KEYS):
            break
        if re.search(r"₹|Rs\.?|INR", ln.text) or QTY_RE.search(ln.text) \
                or MONTH_YEAR_RE.search(ln.text) or FULL_DATE_RE.search(ln.text):
            break  # bare numbers (pincodes) do NOT stop the address
        addr_lines.append(ln)
    if not addr_lines:
        return name, _missing("manufacturer_address")
    addr = ExtractedField(
        key="manufacturer_address",
        value_raw=" ".join(ln.text for ln in addr_lines),
        value_normalized=" ".join(ln.text for ln in addr_lines),
        confidence=round(min([anchor.conf] + [ln.conf for ln in addr_lines]), 4),
        ocr_confidence=min([anchor.conf] + [ln.conf for ln in addr_lines]),
        evidence_boxes=[list(ln.box) for ln in addr_lines],
        candidates=[], transforms=["multiline-merge"],
        meta={"lines": len(addr_lines)})
    return name, addr


def extract_all(tokens: list[OcrToken], width: int, height: int) -> dict[str, ExtractedField]:
    """Total + deterministic (§11.17): fixed input → identical output, never raises."""
    lines = group_lines(tokens or [])
    name, addr = extract_manufacturer(lines, width, height)
    out = {
        "manufacturer_name": name,
        "manufacturer_address": addr,
        "net_quantity": extract_net_quantity(lines, width, height),
        "mrp": extract_mrp(lines, width, height),
        "date_of_manufacture": extract_manufacture_date(lines, width, height),
        "consumer_care": extract_consumer_care(lines, width, height),
    }
    return out
