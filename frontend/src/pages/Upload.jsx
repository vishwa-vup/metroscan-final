import { useState } from "react";
import { useLocation } from "react-router-dom";
import ImageUploader from "../components/ImageUploader.jsx";
import QualityResultCard from "../components/QualityResultCard.jsx";
import { ErrorBanner } from "../components/feedback.jsx";
import { PageHeading, PrimaryLink, TextLink } from "../components/ui.jsx";

// Document-intake workstation: 65% workspace, 35% rail with constraints.
export default function Upload() {
  const { pathname } = useLocation();
  const userPortal = pathname.startsWith("/user");
  const detailBase = userPortal ? "/user" : "";
  const [scan, setScan] = useState(null);
  const [rejected, setRejected] = useState(null);
  const [error, setError] = useState("");
  return (
    <div className="space-y-6">
      <PageHeading
        kicker="Intake / New scan"
        title="New scan"
        sub="JPG, PNG or WebP up to 10 MB. Quality gate, OCR, extraction and rules run automatically."
      />
      {error && <ErrorBanner title="Upload failed" message={error} />}
      <div className="grid gap-8 xl:grid-cols-[65%_35%]">
        <ImageUploader
          onResult={(s) => { setScan(s); setRejected(null); setError(""); }}
          onRejected={(r) => { setRejected(r); setScan(null); }}
          onError={(m) => setError(m)}
          completed={Boolean(scan || rejected)}
        />
        <aside className="space-y-5 text-sm">
          <div>
            <h2 className="border-b border-rule pb-2 text-base font-bold tracking-tight text-ink">File constraints</h2>
            <dl className="mt-2 space-y-1.5 text-[13px]">
              {[["Formats", "JPG · PNG · WebP"], ["Size limit", "10 MB"], ["Originals", "Preserved unmodified"]].map(([t, d]) => (
                <div key={t} className="flex justify-between gap-2 border-b border-rule py-1.5 last:border-b-0">
                  <dt className="text-muted">{t}</dt>
                  <dd className="tnum font-semibold text-ink">{d}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div>
            <h2 className="border-b border-rule pb-2 text-base font-bold tracking-tight text-ink">After upload</h2>
            <ol className="mt-2 space-y-0">
              {["Image quality check", "OCR extraction", "Product information", "Compliance analysis"].map((s, i) => (
                <li key={s} className="flex gap-3 border-b border-rule py-1.5 text-[13px] last:border-b-0">
                  <span aria-hidden="true" className="tnum font-bold text-faint">0{i + 1}</span>
                  <span className="text-muted">{s}</span>
                </li>
              ))}
            </ol>
            <p className="mt-3 text-xs leading-relaxed text-faint">
              Machine findings stay pending until an inspector reviews them. Nothing here is a legal verdict.
            </p>
          </div>
        </aside>
      </div>
      <QualityResultCard rejected={rejected} />
      {scan && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-y-2 border-ink py-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Scan recorded</p>
            <p className="tnum mt-0.5 font-mono text-sm text-ink">{scan.scan_id.slice(0, 8)} · {scan.processing_state}</p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <TextLink to={`${detailBase}/review/${scan.scan_id}`}>Inspector review</TextLink>
            <PrimaryLink to={`${detailBase}/scan/${scan.scan_id}`}>Open evidence</PrimaryLink>
          </div>
        </div>
      )}
    </div>
  );
}
