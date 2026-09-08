import { useState } from "react";
import { Link } from "react-router-dom";
import { downloadReport } from "../api/client.js";
import { EmptyState } from "./feedback.jsx";
import { Card, PrimaryButton, SecondaryButton, SelectInput, TextInput } from "./ui.jsx";

// DashboardCards §28 (Phase 5): confirmed and pending NEVER merged into one metric.
const CARDS = [
  ["total_scans", "Total scans", "📦", "border-slate-200"],
  ["pending_potential", "Pending potential issues", "⚠️", "border-amber-300"],
  ["pending_uncertain", "Pending uncertainty", "❓", "border-slate-300"],
  ["confirmed_issue", "Confirmed issues", "🔴", "border-rose-300"],
  ["confirmed_compliant", "Confirmed compliant reviews", "✅", "border-teal-300"],
  ["machine_verified", "Machine verified / appears compliant", "✅", "border-emerald-300"],
  ["quality_rejected", "Quality rejections", "📷", "border-slate-300"],
];

export default function DashboardCards({ summary }) {
  if (!summary) return <p>Loading…</p>;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {CARDS.map(([k, label, icon, accent]) => (
        <div key={k} className={`rounded-xl border-2 ${accent} bg-white p-4 shadow-sm`}>
          <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-500">
            <span aria-hidden="true">{icon}</span>
            <span>{label}</span>
          </div>
          <div className="tnum mt-1 text-3xl font-bold text-slate-900">{summary[k] ?? 0}</div>
        </div>
      ))}
    </div>
  );
}

// SearchFilters §28: text, status bucket, dates, inspector.
const STATUS_OPTS = [
  ["all", "all statuses"],
  ["pending_potential", "pending potential"],
  ["pending_uncertain", "pending uncertainty"],
  ["confirmed_issue", "confirmed issues"],
  ["confirmed_compliant", "confirmed compliant"],
  ["machine_verified", "machine verified"],
];

export function SearchFilters({ f, setF, onSearch }) {
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  return (
    <Card>
      <form
        className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]"
        onSubmit={(e) => { e.preventDefault(); onSearch(); }}
      >
        <TextInput placeholder="scan / product search" aria-label="scan or product search" value={f.q} onChange={set("q")} />
        <SelectInput aria-label="status filter" value={f.status} onChange={set("status")}>
          {STATUS_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </SelectInput>
        <TextInput aria-label="from date" type="date" value={f.date_from} onChange={set("date_from")} />
        <TextInput aria-label="to date" type="date" value={f.date_to} onChange={set("date_to")} />
        <TextInput placeholder="inspector" aria-label="inspector filter" value={f.inspector} onChange={set("inspector")} />
        <PrimaryButton type="submit">Search</PrimaryButton>
      </form>
    </Card>
  );
}

const BUCKET_LABEL = {
  pending_potential: "pending potential",
  pending_uncertain: "pending uncertainty",
  confirmed_issue: "confirmed issue",
  confirmed_compliant: "confirmed compliant",
  machine_verified: "machine verified",
};

// ScanTable §28: history with evidence drill-down + review history links.
export function ScanTable({ items }) {
  if (!items?.length) return <EmptyState what="No scans yet — upload a label to begin." />;
  return (
    <Card className="overflow-x-auto p-0">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-2">Scan</th><th className="px-4 py-2">File</th><th className="px-4 py-2">State</th><th className="px-4 py-2">Buckets</th><th className="px-4 py-2">Created</th><th className="px-4 py-2"><span className="sr-only">Open</span></th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr key={s.scan_id} className="border-t border-slate-100 hover:bg-slate-50">
              <td className="px-4 py-2 font-mono text-xs">{s.scan_id.slice(0, 8)}</td>
              <td className="max-w-[220px] truncate px-4 py-2">{s.filename}</td>
              <td className="px-4 py-2 text-xs text-slate-600">{s.processing_state}</td>
              <td className="px-4 py-2">
                <span className="flex flex-wrap gap-1">
                  {(s.buckets || []).map((b) => (
                    <span key={b} className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{BUCKET_LABEL[b] || b}</span>
                  ))}
                </span>
              </td>
              <td className="tnum px-4 py-2 text-slate-600">{(s.created_at || "").slice(0, 10)}</td>
              <td className="whitespace-nowrap px-4 py-2">
                <Link className="mr-3 font-medium text-indigo-700 underline-offset-2 hover:underline" to={`/scan/${s.scan_id}`}>detail</Link>
                <Link className="font-medium text-indigo-700 underline-offset-2 hover:underline" to={`/review/${s.scan_id}`}>review</Link>
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
        {busy === "pdf" ? "Preparing…" : "📄 PDF report"}
      </PrimaryButton>
      <SecondaryButton disabled={!!busy} onClick={() => go("docx")}>
        {busy === "docx" ? "Preparing…" : "📝 Editable DOCX"}
      </SecondaryButton>
    </div>
  );
}

