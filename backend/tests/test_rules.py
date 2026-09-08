"""Phase 3: rule engine tests — five-state semantics (gate 4), validation, versioning."""

import copy
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.rules import engine as eng  # noqa: E402
from app.rules.loader import (  # noqa: E402
    RuleValidationError,
    get_active_ruleset,
    load_ruleset,
    validate_ruleset,
)
from app.rules.statuses import decide  # noqa: E402
from auth_helper import authed, init_test_db, teardown_test_db  # noqa: E402


def F(raw, conf, boxes=None, meta=None):
    return {"value_raw": raw, "value_normalized": raw, "confidence": conf,
            "ocr_confidence": conf, "evidence_boxes": boxes or [[0, 0, 10, 10]],
            "candidates": [], "transforms": [], "meta": meta or {}}


def full_fields():
    return {
        "manufacturer_name": F("Mfd by FreshFarm", 0.88),
        "manufacturer_address": F("Plot 12, Pune", 0.85),
        "net_quantity": F("500 g", 0.90),
        "mrp": F("Rs 99.00", 0.92),
        "date_of_manufacture": F("03/2025", 0.87),
        "consumer_care": F("1800-1, a@b.in", 0.80,
                           meta={"partial": False, "has_phone": True, "has_email": True}),
    }


def test_decide_five_state_logic():
    assert decide(0.9, True) == "VERIFIED_APPEARS_COMPLIANT"
    assert decide(0.9, False) == "POTENTIAL_NON_COMPLIANCE"
    assert decide(0.5, True) == "COULD_NOT_RELIABLY_VERIFY"  # low conf beats pass
    assert decide(0.5, False) == "COULD_NOT_RELIABLY_VERIFY"  # ...and fail
    assert decide(0.70, True) == "VERIFIED_APPEARS_COMPLIANT"  # boundary inclusive
    assert decide(0.699, True) == "COULD_NOT_RELIABLY_VERIFY"
    assert decide(None, True) == "COULD_NOT_RELIABLY_VERIFY"


def test_gate4_engine_semantics():
    rs = get_active_ruleset()
    assert rs["version"] == "1.1"  # R7/R8 activated in Phase 6
    assert sum(1 for r in rs["rules"] if r["active"]) == 8
    f = eng.evaluate(full_fields(), rs)
    core = [x for x in f if x.rule_id in ("R1", "R2", "R3", "R4", "R5")]
    assert all(x.machine_status == "VERIFIED_APPEARS_COMPLIANT" for x in core)
    assert all(x.clause.startswith("Rule ") and x.evidence_boxes for x in f)
    assert all(x.ruleset_version == "1.1" for x in f)  # version stored with evaluation
    r7 = next(x for x in f if x.rule_id == "R7")
    # no analysis evidence on bare fixtures → safe uncertainty, never a violation
    assert r7.machine_status == "COULD_NOT_RELIABLY_VERIFY"


def test_ruleset_history_preserved():
    from pathlib import Path as _P
    v10 = load_ruleset(str(_P(__file__).resolve().parents[1] / "app" / "rules" / "ruleset_v1.json"))
    assert v10["version"] == "1.0"  # old version stays loadable
    f = eng.evaluate(full_fields(), v10)
    assert len(f) == 6 and all(x.ruleset_version == "1.0" for x in f)  # history keeps its version


def test_partial_contact_is_pending_not_violation():
    rs = get_active_ruleset()
    fields = full_fields()
    fields["consumer_care"] = F("1800-123", 0.80,
                                meta={"partial": True, "has_phone": True, "has_email": False})
    r6 = [x for x in eng.evaluate(fields, rs) if x.rule_id == "R6"][0]
    assert r6.machine_status == "POTENTIAL_NON_COMPLIANCE"
    assert "pending inspector review" in r6.message


def test_missing_is_never_a_violation_claim():
    rs = get_active_ruleset()
    fields = full_fields()
    fields["mrp"] = F("", 0.0, boxes=[])
    r4 = [x for x in eng.evaluate(fields, rs) if x.rule_id == "R4"][0]
    assert r4.machine_status == "COULD_NOT_RELIABLY_VERIFY"
    assert "could not be verified from the provided image" in r4.message
    for x in eng.evaluate(fields, rs):
        assert "LEGALLY" not in x.message and "NON-COMPLIANT" not in x.message.upper().replace(
            "NON-COMPLIANCE", "")


def test_low_confidence_maps_to_uncertain():
    rs = get_active_ruleset()
    fields = full_fields()
    fields["net_quantity"] = F("500 g", 0.40)
    r3 = [x for x in eng.evaluate(fields, rs) if x.rule_id == "R3"][0]
    assert r3.machine_status == "COULD_NOT_RELIABLY_VERIFY"


def test_loader_rejects_malformed_and_unknown():
    rs = get_active_ruleset()
    bad = copy.deepcopy(rs)
    del bad["rules"][0]["clause"]
    assert validate_ruleset(bad)  # errors listed
    try:
        import json, tempfile, os
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
            json.dump(bad, fh)
            name = fh.name
        try:
            load_ruleset(name)
        finally:
            os.unlink(name)
    except RuleValidationError:
        pass
    else:
        raise AssertionError("malformed ruleset must be rejected")
    bad2 = copy.deepcopy(rs)
    bad2["rules"][0]["check_type"] = "vibes"
    assert any("unknown check_type" in e for e in validate_ruleset(bad2))
    with __import__("pytest").raises(ValueError):
        eng.evaluate(full_fields(), bad2)


def test_deterministic_and_versioned():
    rs = get_active_ruleset()
    a = eng.evaluate(full_fields(), rs)
    b = eng.evaluate(full_fields(), rs)
    assert a == b


def test_rules_api_and_scan_e2e(tmp_path, monkeypatch):
    from app.ocr import easyocr_engine as engocr
    from app.services import scan_pipeline as pipe
    from make_label import make_label_png

    class FakeReader:
        def readtext(self, img):
            return [([[60, 140], [560, 140], [560, 190], [60, 190]], "Mfd by FreshFarm", 0.88)]

    monkeypatch.setenv("STORAGE_DIR", str(tmp_path))
    init_test_db(tmp_path, monkeypatch)
    pipe._store = None
    engocr.set_reader_factory(FakeReader)
    try:
        c = TestClient(app)
        h_insp, _ = authed(c, "inspector", "rules@t.local")
        h_admin, _ = authed(c, "admin", "rulesroot@t.local")
        assert c.get("/api/v1/rules", headers=h_insp).json()["version"] == "1.1"
        bad = get_active_ruleset()
        bad["rules"] = []
        # validate is admin-only; admin gets the schema verdict
        assert c.post("/api/v1/rules/validate", headers=h_insp,
                      json={"ruleset": bad}).status_code == 403
        assert c.post("/api/v1/rules/validate", headers=h_admin,
                      json={"ruleset": bad}).status_code == 422
        r = c.post("/api/v1/scans", headers=h_insp,
                   files={"image": ("l.png", make_label_png(), "image/png")})
        assert r.status_code == 201, r.text
        body = r.json()
        assert body["processing_state"] == "AWAITING_REVIEW"
        by_id = {x["rule_id"]: x for x in body["findings"]}
        assert by_id["R1"]["machine_status"] == "VERIFIED_APPEARS_COMPLIANT"
        # everything else invisible on this stub image → honest uncertainty
        assert by_id["R4"]["machine_status"] == "COULD_NOT_RELIABLY_VERIFY"
    finally:
        engocr.reset_reader()
        pipe._store = None
        teardown_test_db()
