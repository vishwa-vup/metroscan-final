import StatusBadge from "./StatusBadge.jsx";
import { Card } from "./ui.jsx";

// ScanSummary v1.0: identity + status header. Same fields, stronger hierarchy.
export default function ScanSummary({ scan, status }) {
  return (
    <Card className="border-slate-200">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Scan</p>
          <h1 className="tnum font-mono text-xl font-bold tracking-tight text-ink">{scan.scan_id.slice(0, 8)}</h1>
          <p className="mt-1 truncate text-sm text-muted">
            {scan.filename} · pipeline {scan.pipeline_version} · rules {scan.rule_set_version || "—"}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
    </Card>
  );
}

// ScanProgress v1.0: machine processing states, distinct from compliance status.
// Compact stepper; current step highlighted, completed steps muted.
const STAGES = ["RECEIVED", "QUALITY_CHECKING", "PREPROCESSING", "OCR_RUNNING", "OCR_COMPLETE", "EXTRACTION_COMPLETE", "AWAITING_REVIEW", "REVIEW_COMPLETE", "COMPLETE"];

export function ScanProgress({ state }) {
  const idx = STAGES.indexOf(state);
  return (
    <Card>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Processing progress</p>
      <ol className="flex flex-wrap gap-1.5" aria-label="Processing progress">
        {STAGES.map((s, i) => (
          <li
            key={s}
            aria-current={i === idx ? "step" : undefined}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              i < idx ? "border-slate-300 bg-slate-100 text-slate-600"
              : i === idx ? "border-brand-primary bg-brand-primary text-white"
              : "border-slate-200 text-slate-400"
            }`}
          >
            {s}
          </li>
        ))}
      </ol>
    </Card>
  );
}
