import { useState } from "react";
import { Link } from "react-router-dom";
import { downloadReport } from "../api/client.js";
import { formatDate } from "../utils/format.js";
import { EmptyState } from "./feedback.jsx";
import { Icon } from "./icons.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { Card, MetricCard, PrimaryButton, SecondaryButton, SelectInput, TextInput } from "./ui.jsx";

// DashboardCards v1.0: balanced 4+3 metric grid, compact cards, real data only.
// Confirmed and pending are NEVER merged. No fabricated trends/percentages.
const PRIMARY = [
  ["total_scans", "Total scans", "All scans in scope", "scans", "border-slate-200"],
  ["pending_potential", "Pending review", "Potential issues awaiting inspector", "warn", "border-amber-300"],
  ["confirmed_issue", "Confirmed issues", "Inspector-confirmed, counted separately", "issue", "border-rose-300"],
  ["confirmed_compliant", "Confirmed compliant", "Inspector-cleared reviews", "check", "border-teal-300"],
];

const SECONDARY = [
  ["pending_uncertain", "Pending uncertainty", "Needs a closer look", "unknown", "border-slate-300"],
  ["machine_verified", "Machine verified", "Appears compliant, not a legal verdict", "check", "border-emerald-200"],
  ["quality_rejected", "Quality rejections", "Too blurry / small — retake", "capture", "border-slate-300"],
];

export default function DashboardCards({ summary }) {
  if (!summary) return <p>Loading…</p>;
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {PRIMARY.map(([k, label, hint, icon, accent]) => (
          <MetricCard key={k} label={label} hint={hint} accent={accent}
            icon={<Icon name={icon} className="text-muted" />} value={summary[k] ?? 0} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-3">
        {SECONDARY.map(([k, label, hint, icon, accent]) => (
          <MetricCard key={k} label={label} hint={hint} accent={accent}
            icon={<Icon name={icon} className="text-muted" />} value={summary[k] ?? 0} />
        ))}
      </div>
    </div>
  );
}

// IssueBreakdown: simple real-data-only breakdown (no chart lib).
// Renders nothing when there is no data — never fake chart lines.
export function IssueBreakdown({ summary }) {
  if (!summary) return null;
  const total = (summary.pending_potential ?? 0) + (summary.confirmed_issue ?? 0) + (summary.confirmed_compliant ?? 0) + (summary.machine_verified ?? 0);
  if (!total) return null;
  const segs = [
    ["Pending", summary.pending_potential ?? 0, "#F5B942"],
    ["Confirmed issues", summary.confirmed_issue ?? 0, "#EF5B6B"],
    ["Confirmed compliant", summary.confirmed_compliant ?? 0, "#14b8a6"],
    ["Machine verified", summary.machine_verified ?? 0, "#20C997"],
  ].filter(([, v]) => v > 0);
  let acc = 0;
  const bars = segs.map(([label, v, color]) => {
    const w = (v / total) * 100;
    const seg = { label, v, color, x: acc };
    acc += w;
    return { ...seg, w };
  });
  return (
    <Card>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold tracking-tight text-ink">Issue breakdown</h2>
        <span className="tnum text-xs text-muted">{total} classified</span>
      </div>
      <div className="mt-3 flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100" role="img" aria-label={`Issue breakdown across ${segs.length} categories`}>
        {bars.map((b) => (
          <span key={b.label} title={`${b.label}: ${b.v}`} style={{ width: `${b.w}%`, background: b.color }} />
        ))}
      </div>
      <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
        {bars.map((b) => (
          <li key={b.label} className="flex items-center gap-2 text-sm">
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
            <span className="text-slate-600">{b.label}</span>
            <span className="tnum ml-auto font-semibold text-ink">{b.v}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

const STATUS_OPTS = [
  ["all", "All statuses"],
  ["pending_potential", "Pending potential"],
  ["pending_uncertain", "Pending uncertainty"],
  ["confirmed_issue", "Confirmed issues"],
  ["confirmed_compliant", "Confirmed compliant"],
  ["machine_verified", "Machine verified"],
];

export function SearchFilters({ f, setF, onSearch }) {
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Card>
      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
      >
        <TextInput placeholder="Scan or product search" aria-label="scan or product search" value={f.q} onChange={set("q")} />
        <SelectInput aria-label="status filter" value={f.status} onChange={set("status")}>
          {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </SelectInput>
        <TextInput aria-label="from date" type="date" value={f.date_from} onChange={set("date_from")} />
        <TextInput aria-label="to date" type="date" value={f.date_to} onChange={set("date_to")} />
        <TextInput placeholder="Inspector" aria-label="inspector filter" value={f.inspector} onChange={set("inspector")} />
        <PrimaryButton type="submit">Search</PrimaryButton>
      </form>
    </Card>
  );
}

// ScanTable v1.0: operational history, compact table, status badges.
// Same API fields; rows link to detail + review. Empty state has one action.
export function ScanTable({ items }) {
  if (!items?.length) return <EmptyState title="No scans yet" icon="scans" what="Upload a label or capture one with the camera — it will appear here with its status and evidence." actionTo="/upload" actionLabel="Upload a label" />;
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[680px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50/60 text-left text-xs font-semibold uppercase tracking-wide text-muted">
            <th scope="col" className="px-4 py-2.5">Scan</th>
            <th scope="col" className="px-4 py-2.5">File</th>
            <th scope="col" className="px-4 py-2.5">Status</th>
            <th scope="col" className="px-4 py-2.5">Created</th>
            <th scope="col" className="px-4 py-2.5"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.scan_id} className="border-t border-slate-100 transition-colors first:border-t-0 hover:bg-slate-50">
              <td className="px-4 py-2.5 font-mono text-xs text-slate-600">{s.scan_id.slice(0, 8)}</td>
              <td className="max-w-[240px] truncate px-4 py-2.5 font-medium text-ink">{s.filename}</td>
              <td className="px-4 py-2.5">
                <span className="flex flex-wrap gap-1">
                  {(s.buckets || []).length
                    ? (s.buckets || []).map((b) => <StatusBadge key={b} status={b} />)
                    : <span className="text-xs text-muted">{s.processing_state}</span>}
                </span>
              </td>
              <td className="tnum whitespace-nowrap px-4 py-2.5 text-slate-600">{formatDate(s.created_at)}</td>
              <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link className="mr-3 font-semibold text-brand-primary underline-offset-2 hover:underline" to={`/scan/${s.scan_id}`}>Detail</Link>
                <Link className="font-semibold text-brand-primary underline-offset-2 hover:underline" to={`/review/${s.scan_id}`}>Review</Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

// ReportActions §28: PDF + editable DOCX downloads (retry = click again).
// Token-authenticated blob download — plain links cannot send the JWT.
export function ReportActions({ scanId }) {
  const [busy, setBusy] = useState(null);
  async function go(fmt) {
    setBusy(fmt);
    try {
      await downloadReport(scanId, fmt);
    } finally {
      setBusy(null);
    }
  }
  return (
    <div className="flex flex-wrap gap-2">
      <PrimaryButton disabled={!!busy} onClick={() => go("pdf")}>
        <Icon name="file" />
        {busy === "pdf" ? "Preparing…" : "PDF report"}
      </PrimaryButton>
      <SecondaryButton disabled={!!busy} onClick={() => go("docx")}>
        <Icon name="file" />
        {busy === "docx" ? "Preparing…" : "Editable DOCX"}
      </SecondaryButton>
    </div>
  );
}

