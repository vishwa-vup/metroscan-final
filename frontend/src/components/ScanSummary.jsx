import StatusBadge from "./StatusBadge.jsx";
import { Card } from "./ui.jsx";

// ScanSummary §28: header block for a scan — identity, state, versions.
export default function ScanSummary({ scan, status }) {
  return (
    <Card className="border-slate-300">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Scan</p>
          <h1 className="font-mono text-xl font-bold text-slate-900">{scan.scan_id.slice(0, 8)}</h1>
          <p className="mt-1 text-sm text-slate-600">
            {scan.filename} · pipeline {scan.pipeline_version} · rules {scan.rule_set_version || "—"}
          </p>
        </div>
        <StatusBadge status={status} />
      </div>
    </Card>
  );
}

// ScanProgress §28: machine processing states (§26), distinct from compliance status.
const STAGES = ["RECEIVED", "QUALITY_CHECKING", "PREPROCESSING", "OCR_RUNNING", "OCR_COMPLETE", "EXTRACTION_COMPLETE", "AWAITING_REVIEW", "REVIEW_COMPLETE", "COMPLETE"];

export function ScanProgress({ state }) {
  const idx = STAGES.indexOf(state);
  return (
    <Card>
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">Processing progress</p>
      <ol className="flex flex-wrap gap-1.5" aria-label="Processing progress">
        {STAGES.map((s, i) => (
          <li
            key={s}
            aria-current={i === idx ? "step" : undefined}
            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${
              i < idx ? "border-slate-300 bg-slate-100 text-slate-600"
              : i === idx ? "border-indigo-600 bg-indigo-600 text-white"
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
