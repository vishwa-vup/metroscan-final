// ConfidenceBadge §28: OCR confidence as text + bar — never number-only ambiguity,
// always paired with the value it qualifies.
export default function ConfidenceBadge({ value = 0, lowAt = 0.7 }) {
  const pct = Math.round((value ?? 0) * 100);
  const low = (value ?? 0) < lowAt;
  return (
    <span className="inline-flex items-center gap-1.5" title={low ? "below 70% threshold — needs a closer look" : "at or above 70% threshold"}>
      <span aria-hidden="true" className="inline-block h-1.5 w-16 overflow-hidden rounded-sm bg-tone">
        <span className={`block h-full ${low ? "bg-warn" : "bg-ok"}`} style={{ width: `${pct}%` }} />
      </span>
      <span className={`tnum text-sm ${low ? "font-bold text-warn" : "text-muted"}`}>{pct}%{low ? " — verify" : ""}</span>
    </span>
  );
}
