import ConfidenceBadge from "./ConfidenceBadge.jsx";
import { Card, SectionTitle } from "./ui.jsx";

const LABELS = {
  manufacturer_name: "Manufacturer / packer / importer",
  manufacturer_address: "Address",
  net_quantity: "Net quantity",
  mrp: "MRP",
  date_of_manufacture: "Manufacture date",
  consumer_care: "Consumer care",
};

// OcrFieldList §28: raw + normalized + OCR confidence per field.
// Missing fields show "could not be verified from the provided image" — never invented.
export default function OcrFieldList({ fields }) {
  const keys = Object.keys(LABELS).filter((k) => fields?.[k]);
  if (!keys.length) return null;
  return (
    <Card>
      <SectionTitle>Extracted declarations</SectionTitle>
      <ul className="mt-3 space-y-2 text-sm">
        {keys.map((k) => {
          const f = fields[k];
          const missing = !f.value_raw;
          return (
            <li key={k} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{LABELS[k]}</div>
              {missing ? (
                <div className="mt-0.5 italic text-slate-500">could not be verified from the provided image</div>
              ) : (
                <div className="mt-0.5 space-y-0.5">
                  <div className="font-medium text-slate-900">{f.value_raw}</div>
                  {f.value_normalized && f.value_normalized !== f.value_raw && (
                    <div className="text-slate-500">Normalized: {f.value_normalized}</div>
                  )}
                  <div className="flex flex-wrap items-center gap-1.5 text-slate-500">
                    <span>OCR confidence:</span> <ConfidenceBadge value={f.ocr_confidence ?? 0} />
                    {f.candidates?.length > 1 && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        {f.candidates.length} candidates (ambiguous — needs review)
                      </span>
                    )}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
