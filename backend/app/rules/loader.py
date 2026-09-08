"""JSON rule loading + validation + versioning (§17 loader tasks, §42)."""

import json
from pathlib import Path

REQUIRED_PROPS = ["rule_id", "version", "clause", "title", "field", "applicability",
                  "check_type", "parameters", "evidence_required", "message_pass",
                  "message_pending", "legal_note", "source_reference", "active"]

SUPPORTED_CHECKS = {"present", "complete", "placement", "readability"}

RULES_DIR = Path(__file__).resolve().parent


class RuleValidationError(ValueError):
    """Malformed rule set — rejected, never evaluated (§17 req 3)."""


def validate_ruleset(data: dict) -> list[str]:
    errors = []
    if not isinstance(data, dict) or "version" not in data or "rules" not in data:
        return ["ruleset must be an object with 'version' and 'rules'"]
    if not isinstance(data["rules"], list) or not data["rules"]:
        return ["ruleset must contain a non-empty 'rules' list"]
    seen = set()
    for i, r in enumerate(data["rules"]):
        tag = r.get("rule_id", f"index {i}")
        for p in REQUIRED_PROPS:
            if p not in r:
                errors.append(f"{tag}: missing property '{p}'")
        if r.get("rule_id") in seen:
            errors.append(f"{tag}: duplicate rule_id")
        seen.add(r.get("rule_id"))
        if r.get("check_type") not in SUPPORTED_CHECKS:
            errors.append(f"{tag}: unknown check_type '{r.get('check_type')}'")
        if "Rule " not in str(r.get("clause", "")):
            errors.append(f"{tag}: clause must cite a Rule (e.g. 'Rule 6')")
    return errors


def load_ruleset(path: str | Path) -> dict:
    try:
        data = json.loads(Path(path).read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        raise RuleValidationError(f"cannot load ruleset: {exc}") from exc
    errors = validate_ruleset(data)
    if errors:
        raise RuleValidationError("; ".join(errors))
    return data


def available_versions() -> list[str]:
    out = []
    for p in sorted(RULES_DIR.glob("ruleset_v*.json")):
        try:
            out.append(json.loads(p.read_text(encoding="utf-8"))["version"])
        except (OSError, KeyError, json.JSONDecodeError):
            continue
    return out


_ACTIVE_VERSION = "1.1"  # v1.0 stays loadable; historical evaluations keep "1.0"


def get_active_ruleset() -> dict:
    data = load_ruleset(RULES_DIR / "ruleset_v1.json")
    if data["version"] != _ACTIVE_VERSION and _ACTIVE_VERSION not in available_versions():
        raise RuleValidationError(f"active ruleset version {_ACTIVE_VERSION} not found")
    # v1 file holds version 1.0; later versions add their own files (Phase 6: v1.1).
    for p in sorted(RULES_DIR.glob("ruleset_v*.json")):
        data = load_ruleset(p)
        if data["version"] == _ACTIVE_VERSION:
            return data
    raise RuleValidationError(f"active ruleset version {_ACTIVE_VERSION} not found")


def set_active_version(version: str) -> dict:
    global _ACTIVE_VERSION
    if version not in available_versions():
        raise RuleValidationError(f"unknown ruleset version '{version}'")
    _ACTIVE_VERSION = version
    return get_active_ruleset()
