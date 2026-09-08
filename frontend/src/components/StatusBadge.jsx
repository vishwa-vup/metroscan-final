// StatusBadge §28: text label + icon, never color-only meaning.
// Tinted per state; labels are contractual (tests + judge wording).
const MAP = {
  VERIFIED_APPEARS_COMPLIANT: { icon: "✅", label: "Verified / appears compliant", cls: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  POTENTIAL_NON_COMPLIANCE: { icon: "⚠️", label: "Potential non-compliance", cls: "border-amber-300 bg-amber-50 text-amber-900" },
  COULD_NOT_RELIABLY_VERIFY: { icon: "❓", label: "Could not reliably verify", cls: "border-slate-300 bg-slate-100 text-slate-700" },
  INSPECTOR_CONFIRMED_ISSUE: { icon: "🔴", label: "Inspector-confirmed issue", cls: "border-rose-300 bg-rose-50 text-rose-900" },
  INSPECTOR_CONFIRMED_COMPLIANT: { icon: "✅", label: "Inspector-confirmed compliant", cls: "border-teal-300 bg-teal-50 text-teal-900" },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || { icon: "❓", label: status || "Unknown", cls: "border-slate-300 bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium ${s.cls}`}>
      <span aria-hidden="true">{s.icon}</span>
      <span>{s.label}</span>
    </span>
  );
}
