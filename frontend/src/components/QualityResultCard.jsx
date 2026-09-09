// Quality gate outcome: calm alert strip with diagnostics + recapture guidance.
import { Icon } from "./icons.jsx";

export default function QualityResultCard({ rejected }) {
  if (!rejected) return null;
  return (
    <div role="alert" className="border-l-[3px] border-warn bg-warnSoft/40 py-2 pl-3 pr-2">
      <p className="flex items-center gap-1.5 text-sm font-bold text-warn">
        <Icon name="capture" className="[&_svg]:h-4 [&_svg]:w-4" />
        Quality rejected
      </p>
      <p className="mt-0.5 text-sm text-ink">{rejected.message}</p>
      <p className="tnum mt-1 font-mono text-xs text-muted">{JSON.stringify(rejected.metrics)}</p>
      <p className="mt-1 text-[13px] text-muted">Recapture closer, steadier, in better light.</p>
    </div>
  );
}
