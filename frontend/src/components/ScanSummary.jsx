import StatusBadge from "./StatusBadge.jsx";
import { formatDate } from "../utils/format.js";

// Identity header: scan id, file, timestamp, pipeline state, advisory status.
// Flat, no decoration — the evidence below is the visual focus.
export default function ScanSummary({ scan, status }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-8 gap-y-3 border-b-2 border-ink pb-3">
      <div className="min-w-0">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Scan record</p>
        <h1 className="tnum mt-0.5 font-mono text-2xl font-bold tracking-tight text-ink">{scan.scan_id.slice(0, 8)}</h1>
        <p className="mt-1 text-sm text-muted">
          {scan.filename} · {formatDate(scan.created_at)} · pipeline {scan.pipeline_version} · rules {scan.rule_set_version || "—"}
        </p>
      </div>
      <div className="flex flex-col items-start gap-1.5 sm:items-end">
        <StatusBadge status={status} />
        <p className="tnum font-mono text-xs text-faint">{scan.processing_state}</p>
      </div>
    </div>
  );
}

// ProcessTimeline: numbered vertical pipeline. Machine progress states —
// distinct from compliance status.
const STAGES = [
  ["RECEIVED", "Image received"],
  ["QUALITY", "Quality checks"],
  ["PREPROCESSING", "Contrast / orientation normalization"],
  ["OCR", "Text extraction"],
  ["EXTRACTION", "Mandatory declarations identified"],
  ["RULE ANALYSIS", "Rules evaluated"],
  ["REVIEW", "Inspector decision"],
];

const STATE_TO_STAGE = {
  RECEIVED: 0,
  QUALITY_CHECKING: 1,
  QUALITY_REJECTED: 1,
  PREPROCESSING: 2,
  OCR_RUNNING: 3,
  OCR_COMPLETE: 4,
  EXTRACTION_RUNNING: 4,
  EXTRACTION_COMPLETE: 5,
  RULE_EVALUATION_RUNNING: 5,
  RULE_EVALUATION_COMPLETE: 6,
  AWAITING_REVIEW: 6,
  REVIEW_COMPLETE: 6,
  REPORT_GENERATING: 6,
  COMPLETE: 6,
  FAILED: 3,
};

function stageIndex(state) {
  return STATE_TO_STAGE[state] ?? 0;
}

export function ScanProgress({ state }) {
  const idx = stageIndex(state);
  const finished = state === "COMPLETE" || state === "REVIEW_COMPLETE";
  return (
    <ol aria-label="Processing record">
      {STAGES.map(([s, desc], i) => {
        const done = finished || i < idx;
        const current = !finished && i === idx;
        return (
          <li key={s} aria-current={current ? "step" : undefined} className="flex gap-3 border-b border-rule py-2 last:border-b-0">
            <span aria-hidden="true" className={`tnum mt-0.5 text-xs font-bold ${done || current ? "text-ink" : "text-faint"}`}>
              {String(i + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <p className={`font-mono text-xs font-bold tracking-wide ${done || current ? "text-ink" : "text-faint"}`}>{s}</p>
              <p className="text-[13px] text-muted">{current ? `${desc} — in progress` : done ? desc : "waiting"}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
