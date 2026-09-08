// QualityResultCard v1.0: quality diagnostics + recapture guidance (same data).
import { Icon } from "./icons.jsx";

export default function QualityResultCard({ rejected }) {
  if (!rejected) return null;
  return (
    <div role="alert" className="rounded-card border border-amber-300 bg-amber-50 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <Icon name="capture" />
        {rejected.message}
      </p>
      <p className="mt-1 text-[13px] leading-relaxed text-amber-800">
        Diagnostics: {JSON.stringify(rejected.metrics)} — recapture closer, steadier, in better light.
      </p>
    </div>
  );
}
