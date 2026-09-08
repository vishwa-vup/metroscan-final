// QualityResultCard §28: quality diagnostics or the recapture message (§9.11).
export default function QualityResultCard({ rejected }) {
  if (!rejected) return null;
  return (
    <div role="alert" className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <p className="flex items-center gap-2 font-semibold text-amber-900">
        <span aria-hidden="true">📷</span> {rejected.message}
      </p>
      <p className="mt-1 text-sm text-amber-800">
        Diagnostics: {JSON.stringify(rejected.metrics)} — recapture closer, steadier, in better light.
      </p>
    </div>
  );
}
