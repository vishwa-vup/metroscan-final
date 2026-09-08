"""Five-state workflow model (§6). Machine states derive from confidence + rule outcome."""

VERIFIED_APPEARS_COMPLIANT = "VERIFIED_APPEARS_COMPLIANT"
POTENTIAL_NON_COMPLIANCE = "POTENTIAL_NON_COMPLIANCE"
COULD_NOT_RELIABLY_VERIFY = "COULD_NOT_RELIABLY_VERIFY"
INSPECTOR_CONFIRMED_ISSUE = "INSPECTOR_CONFIRMED_ISSUE"
INSPECTOR_CONFIRMED_COMPLIANT = "INSPECTOR_CONFIRMED_COMPLIANT"

MACHINE_STATUSES = {VERIFIED_APPEARS_COMPLIANT, POTENTIAL_NON_COMPLIANCE,
                    COULD_NOT_RELIABLY_VERIFY}
PENDING_STATUSES = {POTENTIAL_NON_COMPLIANCE, COULD_NOT_RELIABLY_VERIFY}
CONFIRMED_STATUSES = {INSPECTOR_CONFIRMED_ISSUE, INSPECTOR_CONFIRMED_COMPLIANT}

PENDING_WORDING = "potential non-compliance, pending inspector review"
NOT_VISIBLE_WORDING = "could not be verified from the provided image"


def decide(confidence: float | None, rule_passed: bool, threshold: float = 0.70) -> str:
    """Confidence below threshold → ❓ regardless of rule outcome (§6 decision logic)."""
    if confidence is None or confidence < threshold:
        return COULD_NOT_RELIABLY_VERIFY
    return VERIFIED_APPEARS_COMPLIANT if rule_passed else POTENTIAL_NON_COMPLIANCE
