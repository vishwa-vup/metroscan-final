import { Card, SectionTitle } from "./ui.jsx";

// OcrConfidenceList — Level 2 confidence display enhancement (§39 feat 3):
// every token with its own confidence bar next to the value.
export default function OcrConfidenceList({ tokens }) {
  if (!tokens?.length) return null;
  return (
    <Card>
      <SectionTitle aside={<span className="tnum text-xs text-slate-500">{tokens.length} tokens</span>}>
        OCR confidence per token
      </SectionTitle>
      <ul className="mt-3 max-h-56 space-y-1.5 overflow-y-auto text-sm">
        {tokens.map((t) => {
          const pct = Math.round(t.confidence * 100);
          const low = t.confidence < 0.7;
          return (
            <li key={t.index} className="flex items-center gap-2">
              <span className="w-1/2 truncate font-mono text-xs">{t.text}</span>
              <span aria-hidden="true" className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-slate-200">
                <span className={`block h-full rounded-full ${low ? "bg-amber-500" : "bg-emerald-600"}`} style={{ width: `${pct}%` }} />
              </span>
              <span className={`tnum text-xs ${low ? "font-semibold text-amber-700" : "text-slate-500"}`}>{pct}%</span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
