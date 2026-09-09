import StatusBadge from "./StatusBadge.jsx";

const BAR = {
  VERIFIED_APPEARS_COMPLIANT: "border-ok",
  POTENTIAL_NON_COMPLIANCE: "border-warn",
  COULD_NOT_RELIABLY_VERIFY: "border-faint",
  INSPECTOR_CONFIRMED_ISSUE: "border-bad",
  INSPECTOR_CONFIRMED_COMPLIANT: "border-ok",
};

// FindingRow: status marker + rule reference + message + confidence +
// evidence reference + review state, separated by dividers — not cards.
export default function RuleFindingCard({ finding }) {
  const reviewed = Boolean(finding.review);
  const status = reviewed ? finding.review.new_status : finding.machine_status;
  return (
    <li className={`border-l-2 py-3 pl-3 ${BAR[status] || "border-rule"}`}>
      <StatusBadge status={status} />
      <p className="tnum mt-1.5 font-mono text-xs text-faint">{finding.rule_id} · {finding.clause}</p>
      <p className="mt-0.5 text-sm leading-relaxed text-ink">{finding.message}</p>
      <p className="tnum mt-1 text-xs text-muted">
        OCR confidence {Math.round((finding.ocr_confidence ?? 0) * 100)}%
        {finding.evidence_boxes?.length > 0 && ` · Evidence ${String(finding.evidence_boxes.length).padStart(2, "0")}`}
        {` · rules v${finding.ruleset_version}`}
      </p>
      <details className="mt-1.5 text-xs">
        <summary className="cursor-pointer font-semibold text-muted hover:text-ink hover:underline">
          {reviewed ? "Inspector record" : "Technical detail"}
        </summary>
        {reviewed ? (
          <p className="mt-1 leading-relaxed text-muted">
            {finding.review.reviewer} → {finding.review.action} · {finding.review.at}
            {finding.review.note && <> — “{finding.review.note}”</>}
          </p>
        ) : (
          <p className="mt-1 leading-relaxed text-muted">
            Field {finding.field}. Machine finding — awaiting inspector review.
          </p>
        )}
      </details>
    </li>
  );
}
