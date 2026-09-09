import { useState } from "react";
import ImageUploader from "../components/ImageUploader.jsx";
import QualityResultCard from "../components/QualityResultCard.jsx";
import { Card, PageHeader, PrimaryLink, TextLink } from "../components/ui.jsx";

const STEPS = ["Image quality check", "OCR extraction", "Product information", "Compliance analysis"];

export default function Upload() {
  const [scan, setScan] = useState(null);
  const [rejected, setRejected] = useState(null);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Upload a label"
        sub="JPG, PNG or WebP up to 10 MB. Quality gate, OCR, extraction and rules run automatically."
      />
      <div className="grid gap-3 xl:grid-cols-[1.4fr_1fr]">
        <ImageUploader
          onResult={(s) => { setScan(s); setRejected(null); }}
          onRejected={(r) => { setRejected(r); setScan(null); }}
          completed={Boolean(scan || rejected)}
        />
        <Card>
          <h2 className="text-base font-semibold tracking-tight text-ink">What happens next</h2>
          <ol className="mt-3 space-y-2.5">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-start gap-2.5 text-sm">
                <span aria-hidden="true" className="tnum flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white">
                  {i + 1}
                </span>
                <span className="pt-0.5 text-slate-600">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-muted">
            Results are machine findings — potential issues stay pending until an inspector reviews them. Nothing here is a legal verdict.
          </p>
        </Card>
      </div>
      <QualityResultCard rejected={rejected} />
      {scan && (
        <Card className="border-brand-primary/30 bg-brand-primary/[.05]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-ink">Scan created</p>
              <p className="text-[13px] text-muted">State <span className="tnum font-mono text-xs">{scan.processing_state}</span></p>
            </div>
            <PrimaryLink to={`/scan/${scan.scan_id}`}>Open scan detail</PrimaryLink>
          </div>
          <TextLink to={`/review/${scan.scan_id}`} className="mt-2 inline-block text-sm">Go to inspector review</TextLink>
        </Card>
      )}
    </div>
  );
}
