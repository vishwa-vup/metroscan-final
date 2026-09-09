import ConfidenceBadge from "./ConfidenceBadge.jsx";

const LABELS = {
  manufacturer_name: "Manufacturer / packer / importer",
  manufacturer_address: "Address",
  net_quantity: "Net quantity",
  mrp: "MRP",
  date_of_manufacture: "Manufacture date",
  consumer_care: "Consumer care",
};

// FieldTable: FIELD / VALUE / CONFIDENCE rows for a human reviewer.
// Missing fields show "could not be verified from the provided image" — never invented.
export default function OcrFieldList({ fields }) {
  const keys = Object.keys(LABELS).filter((k) => fields?.[k]);
  if (!keys.length) return null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink text-left text-[11px] font-bold uppercase tracking-[0.1em] text-faint">
            <th scope="col" className="py-2 pr-4 font-bold">Field</th>
            <th scope="col" className="py-2 pr-4 font-bold">Value</th>
            <th scope="col" className="py-2 text-right font-bold">Confidence</th>
          </tr>
        </thead>
        <tbody>
          {keys.map((k) => {
            const f = fields[k];
            const missing = !f.value_raw;
            const low = !missing && (f.ocr_confidence ?? 1) < 0.7;
            return (
              <tr key={k} className={`border-b border-rule align-top last:border-b-0 ${low ? "bg-warnSoft/50" : ""}`}>
                <th scope="row" className="w-32 py-2 pr-4 text-left text-[13px] font-semibold text-muted">{LABELS[k]}</th>
                <td className="py-2 pr-4">
                  {missing ? (
                    <span className="italic text-muted">could not be verified from the provided image</span>
                  ) : (
                    <>
                      <span className="font-medium text-ink">{f.value_raw}</span>
                      {f.value_normalized && f.value_normalized !== f.value_raw && (
                        <span className="block text-[13px] text-muted">{f.value_normalized}</span>
                      )}
                      {f.candidates?.length > 1 && (
                        <span className="mt-0.5 block text-xs font-semibold text-warn">
                          {f.candidates.length} candidates — needs review
                        </span>
                      )}
                    </>
                  )}
                </td>
                <td className="whitespace-nowrap py-2 text-right">
                  {!missing && <ConfidenceBadge value={f.ocr_confidence ?? 0} />}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
