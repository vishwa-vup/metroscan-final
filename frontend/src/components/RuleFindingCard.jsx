import StatusBadge from "./StatusBadge.jsx";
import { Card } from "./ui.jsx";

const ACCENT = {
  VERIFIED_APPEARS_COMPLIANT: "border-l-emerald-500",
  POTENTIAL_NON_COMPLIANCE: "border-l-amber-500",
  COULD_NOT_RELIABLY_VERIFY: "border-l-slate-400",
  INSPECTOR_CONFIRMED_ISSUE: "border-l-rose-600",
  INSPECTOR_CONFIRMED_COMPLIANT: "border-l-teal-500",
};

// RuleFindingCard §28: clause + reason + evidence + machine/human separation.
export default function RuleFindingCard({ finding }) {
  const reviewed = Boolean(finding.review);
  const status = reviewed ? finding.review.new_status : finding.machine_status;
  return (
    <Card className={`border-l-4 text-sm ${ACCENT[status] || "border-l-slate-300"}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-mono text-xs text-slate-500">{finding.rule_id} · {finding.clause}</span>
        <StatusBadge status={status} />
      </div>
      <p className="mt-1.5 text-slate-800">{finding.message}</p>
      <details className="mt-2 rounded-lg bg-slate-50 px-2.5 py-1.5 text-xs text-slate-600">
        <summary className="cursor-pointer font-semibold text-slate-700 hover:underline">
          Finding details
        </summary>
        <p className="mt-1">
          Field: {finding.field} · OCR confidence: <span className="tnum">{Math.round((finding.ocr_confidence ?? 0) * 100)}%</span>
          {finding.evidence_boxes?.length > 0 && ` · ${finding.evidence_boxes.length} evidence region(s)`}
          {` · rules v${finding.ruleset_version}`}
        </p>
        {reviewed ? (
          <p className="mt-1">
            Inspector {finding.review.reviewer} → {finding.review.action} at {finding.review.at}
            {finding.review.note && `: “${finding.review.note}”`}
          </p>
        ) : (
          <p className="mt-1 italic text-slate-500">Machine finding — awaiting inspector review.</p>
        )}
      </details>
    </Card>
  );
}
