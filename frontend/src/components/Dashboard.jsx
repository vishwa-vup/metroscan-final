import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { downloadReport } from "../api/client.js";
import { formatDate } from "../utils/format.js";
import { EmptyState } from "./feedback.jsx";
import { Icon } from "./icons.jsx";
import StatusBadge from "./StatusBadge.jsx";
import { PrimaryButton, SecondaryButton, SelectInput, TextInput } from "./ui.jsx";

// MetricStrip: one ruled information system instead of floating cards.
// Confirmed and pending are NEVER merged. No fabricated trends/percentages.
const STRIP = [
  ["total_scans", "Total scans"],
  ["pending_potential", "Pending review"],
  ["confirmed_issue", "Confirmed issues"],
  ["confirmed_compliant", "Confirmed compliant"],
];

export default function DashboardCards({ summary }) {
  if (!summary) return <p>Loading…</p>;
  const extra = [
    ["pending_uncertain", "Uncertain"],
    ["machine_verified", "Machine verified"],
    ["quality_rejected", "Quality rejections"],
  ];
  return (
    <div>
      <dl className="grid grid-cols-2 border-y-2 border-ink lg:grid-cols-4">
        {STRIP.map(([k, label], i) => (
          <div key={k} className={`px-4 py-3 ${i > 0 ? "border-l border-rule" : ""} ${i === 2 ? "max-lg:border-l-0 max-lg:border-t max-lg:border-rule" : ""} ${i === 3 ? "max-lg:border-t max-lg:border-rule" : ""}`}>
            <dt className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">{label}</dt>
            <dd className="tnum mt-0.5 text-[2rem] font-bold leading-none tracking-tight text-ink">{summary[k] ?? 0}</dd>
          </div>
        ))}
      </dl>
      <p className="tnum mt-2 text-[13px] text-muted">
        {extra.map(([k, label]) => `${label} ${summary[k] ?? 0}`).join(" · ")}
      </p>
    </div>
  );
}

// Classification: restrained horizontal bar, muted tones, real data only.
// Renders nothing when there is no data — never fake chart lines.
export function IssueBreakdown({ summary }) {
  if (!summary) return null;
  const total = (summary.pending_potential ?? 0) + (summary.confirmed_issue ?? 0) + (summary.confirmed_compliant ?? 0) + (summary.machine_verified ?? 0);
  if (!total) return null;
  const segs = [
    ["Pending", summary.pending_potential ?? 0, "#92600A"],
    ["Confirmed issues", summary.confirmed_issue ?? 0, "#B3261E"],
    ["Confirmed compliant", summary.confirmed_compliant ?? 0, "#2E7D4F"],
    ["Machine verified", summary.machine_verified ?? 0, "#5C6470"],
  ].filter(([, v]) => v > 0);
  return (
    <div>
      <div className="flex h-2 w-full overflow-hidden rounded-sm bg-tone" role="img" aria-label={`Classification across ${segs.length} categories, ${total} classified`}>
        {segs.map(([label, v, color]) => (
          <span key={label} title={`${label}: ${v}`} style={{ width: `${(v / total) * 100}%`, background: color }} />
        ))}
      </div>
      <ul className="tnum mt-2 flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-muted">
        {segs.map(([label, v]) => (
          <li key={label}><span className="font-bold text-ink">{v}</span> {label.toLowerCase()}</li>
        ))}
      </ul>
    </div>
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
    <form
      aria-label="Scan filters"
      className="flex flex-wrap items-end gap-2 border-y border-rule bg-surface px-3 py-2.5"
      onSubmit={(e) => { e.preventDefault(); onSearch(); }}
    >
      <label className="min-w-[180px] flex-[2_2_180px] text-xs font-semibold text-muted">
        Search
        <TextInput placeholder="Scan or product" aria-label="scan or product search" value={f.q} onChange={set("q")} />
      </label>
      <label className="min-w-[140px] flex-1 text-xs font-semibold text-muted">
        Status
        <SelectInput aria-label="status filter" value={f.status} onChange={set("status")}>
          {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </SelectInput>
      </label>
      <label className="text-xs font-semibold text-muted">
        From
        <TextInput aria-label="from date" type="date" value={f.date_from} onChange={set("date_from")} />
      </label>
      <label className="text-xs font-semibold text-muted">
        To
        <TextInput aria-label="to date" type="date" value={f.date_to} onChange={set("date_to")} />
      </label>
      <label className="min-w-[130px] flex-1 text-xs font-semibold text-muted">
        Inspector
        <TextInput placeholder="Name" aria-label="inspector filter" value={f.inspector} onChange={set("inspector")} />
      </label>
      <PrimaryButton type="submit">Search</PrimaryButton>
    </form>
  );
}

// ScanTable: dense enterprise table on desktop, structured list on mobile.
// Links follow the current portal (staff /scan + /review, users /user/...).
export function ScanTable({ items }) {
  const { pathname } = useLocation();
  const userPortal = pathname.startsWith("/user");
  const detailFor = (id) => `${userPortal ? "/user" : ""}/scan/${id}`;
  const reviewFor = (id) => `${userPortal ? "/user" : ""}/review/${id}`;
  if (!items?.length) return <EmptyState title="No scans recorded" icon="scans" what="No inspections are available for this account." actionTo={userPortal ? "/user/scan" : "/upload"} actionLabel="Start a scan" />;
  return (
    <>
      <div className="overflow-x-auto">
        <table className="hidden w-full min-w-[720px] border-collapse text-sm md:table">
          <thead>
            <tr className="border-b border-ink text-left text-[11px] font-bold uppercase tracking-[0.1em] text-faint">
              <th scope="col" className="py-2 pr-4 font-bold">Scan</th>
              <th scope="col" className="py-2 pr-4 font-bold">File</th>
              <th scope="col" className="py-2 pr-4 font-bold">Status</th>
              <th scope="col" className="py-2 pr-4 font-bold">Uploaded</th>
              <th scope="col" className="py-2 text-right font-bold"><span className="sr-only">Open</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((s) => (
              <tr key={s.scan_id} className="border-b border-rule transition-colors last:border-b-0 hover:bg-tone/60">
                <td className="py-2 pr-4 font-mono text-xs text-muted">{s.scan_id.slice(0, 8)}</td>
                <td className="max-w-[260px] truncate py-2 pr-4 font-medium text-ink">{s.filename}</td>
                <td className="py-2 pr-4">
                  {(s.buckets || []).length
                    ? <span className="flex flex-wrap gap-x-3 gap-y-1">{(s.buckets || []).map((b) => <StatusBadge key={b} status={b} />)}</span>
                    : <span className="text-[13px] text-muted">{s.processing_state}</span>}
                </td>
                <td className="tnum whitespace-nowrap py-2 pr-4 text-[13px] text-muted">{formatDate(s.created_at)}</td>
                <td className="whitespace-nowrap py-2 text-right text-[13px]">
                  <Link className="mr-3 font-semibold text-brand-primary hover:underline" to={detailFor(s.scan_id)}>Open</Link>
                  {!userPortal && <Link className="font-semibold text-brand-primary hover:underline" to={reviewFor(s.scan_id)}>Review</Link>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="divide-y divide-rule border-t border-rule md:hidden">
        {items.map((s) => (
          <li key={s.scan_id} className="py-3">
            <div className="flex items-baseline justify-between gap-2">
              <Link to={detailFor(s.scan_id)} className="truncate text-sm font-bold text-ink hover:underline">{s.filename}</Link>
              <span className="tnum shrink-0 font-mono text-xs text-faint">{s.scan_id.slice(0, 8)}</span>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {(s.buckets || []).map((b) => <StatusBadge key={b} status={b} />)}
              <span className="tnum text-xs text-faint">{formatDate(s.created_at)}</span>
            </div>
          </li>
        ))}
      </ul>
    </>
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

