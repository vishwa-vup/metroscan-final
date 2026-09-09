// StatusLabel (was StatusBadge): small rectangular marker with icon + text,
// never color-only. Labels are contractual (tests + legal wording).
import { Icon } from "./icons.jsx";

const MAP = {
  VERIFIED_APPEARS_COMPLIANT: { icon: "check", label: "Verified / appears compliant", cls: "border-ok text-ok" },
  POTENTIAL_NON_COMPLIANCE: { icon: "warn", label: "Potential non-compliance", cls: "border-warn text-warn" },
  COULD_NOT_RELIABLY_VERIFY: { icon: "unknown", label: "Could not reliably verify", cls: "border-faint text-muted" },
  INSPECTOR_CONFIRMED_ISSUE: { icon: "issue", label: "Inspector-confirmed issue", cls: "border-bad text-bad" },
  INSPECTOR_CONFIRMED_COMPLIANT: { icon: "check", label: "Inspector-confirmed compliant", cls: "border-ok text-ok" },
  // API bucket aliases (lowercase) mapped to the same semantics:
  pending_potential: { icon: "warn", label: "Pending potential", cls: "border-warn text-warn" },
  pending_uncertain: { icon: "unknown", label: "Pending uncertainty", cls: "border-faint text-muted" },
  confirmed_issue: { icon: "issue", label: "Confirmed issue", cls: "border-bad text-bad" },
  confirmed_compliant: { icon: "check", label: "Confirmed compliant", cls: "border-ok text-ok" },
  machine_verified: { icon: "check", label: "Machine verified", cls: "border-ok text-ok" },
};

export default function StatusBadge({ status }) {
  const s = MAP[status] || { icon: "unknown", label: status || "Unknown", cls: "border-faint text-muted" };
  return (
    <span className={`inline-flex items-center gap-1.5 border-l-[3px] bg-surface py-0.5 pl-2 pr-1 text-[13px] font-semibold leading-snug ${s.cls}`}>
      <Icon name={s.icon} className="[&_svg]:h-3.5 [&_svg]:w-3.5" />
      <span>{s.label}</span>
    </span>
  );
}
