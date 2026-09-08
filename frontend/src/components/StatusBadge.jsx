// StatusBadge v1.0 (frontend-only): text + icon, never color-only.
// Labels are contractual; mapping preserves backend status semantics.
import { Icon } from "./icons.jsx";

const MAP = {
  VERIFIED_APPEARS_COMPLIANT: { icon: "check", label: "Verified / appears compliant", cls: "border-emerald-300 bg-emerald-50 text-emerald-900" },
  POTENTIAL_NON_COMPLIANCE: { icon: "warn", label: "Potential non-compliance", cls: "border-amber-300 bg-amber-50 text-amber-900" },
  COULD_NOT_RELIABLY_VERIFY: { icon: "unknown", label: "Could not reliably verify", cls: "border-slate-300 bg-slate-100 text-slate-700" },
  INSPECTOR_CONFIRMED_ISSUE: { icon: "issue", label: "Inspector-confirmed issue", cls: "border-rose-300 bg-rose-50 text-rose-900" },
  INSPECTOR_CONFIRMED_COMPLIANT: { icon: "check", label: "Inspector-confirmed compliant", cls: "border-teal-300 bg-teal-50 text-teal-900" },
  // API bucket aliases (lowercase) mapped to the same semantics:
  pending_potential: { icon: "warn", label: "Pending potential", cls: "border-amber-300 bg-amber-50 text-amber-900" },
  pending_uncertain: { icon: "unknown", label: "Pending uncertainty", cls: "border-slate-300 bg-slate-100 text-slate-700" },
  confirmed_issue: { icon: "issue", label: "Confirmed issue", cls: "border-rose-300 bg-rose-50 text-rose-900" },
  confirmed_compliant: { icon: "check", label: "Confirmed compliant", cls: "border-teal-300 bg-teal-50 text-teal-900" },
  machine_verified: { icon: "check", label: "Machine verified", cls: "border-emerald-200 bg-emerald-50/60 text-emerald-900" },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || { icon: "unknown", label: status || "Unknown", cls: "border-slate-300 bg-slate-100 text-slate-700" };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
      <Icon name={s.icon} className="[&_svg]:h-3.5 [&_svg]:w-3.5" />
      <span>{s.label}</span>
    </span>
  );
}
