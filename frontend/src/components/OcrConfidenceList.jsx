import { useState } from "react";

// Level 2 confidence display: every token with its own confidence bar.
// Advanced section — field table above is the primary reading.
export default function OcrConfidenceList({ tokens }) {
  const [showLowOnly, setShowLowOnly] = useState(false);
  if (!tokens?.length) return null;
  const rows = showLowOnly ? tokens.filter((t) => t.confidence < 0.7) : tokens;
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <p className="tnum text-xs text-muted">{tokens.length} tokens</p>
        <label className="flex cursor-pointer items-center gap-1.5 text-xs font-semibold text-muted">
          <input type="checkbox" checked={showLowOnly} onChange={(e) => setShowLowOnly(e.target.checked)} className="h-3.5 w-3.5 accent-[#1D4ED8]" />
          Low confidence only
        </label>
      </div>
      <ul className="mt-2 max-h-56 space-y-0 overflow-y-auto border-t border-rule text-sm">
        {rows.map((t) => {
          const pct = Math.round(t.confidence * 100);
          const low = t.confidence < 0.7;
          return (
            <li key={t.index} className="flex items-center gap-2 border-b border-rule py-1.5">
              <span className="w-1/2 truncate font-mono text-xs">{t.text}</span>
              <span aria-hidden="true" className="h-1.5 w-24 shrink-0 overflow-hidden rounded-sm bg-tone">
                <span className={`block h-full ${low ? "bg-warn" : "bg-ok"}`} style={{ width: `${pct}%` }} />
              </span>
              <span className={`tnum text-xs ${low ? "font-bold text-warn" : "text-muted"}`}>{pct}%</span>
            </li>
          );
        })}
        {!rows.length && <li className="py-2 text-[13px] text-muted">No low-confidence tokens.</li>}
      </ul>
    </div>
  );
}
