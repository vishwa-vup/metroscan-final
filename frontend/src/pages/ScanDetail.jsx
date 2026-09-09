import { useEffect, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { api } from "../api/client.js";
import { ReportActions } from "../components/Dashboard.jsx";
import EvidenceViewer from "../components/EvidenceViewer.jsx";
import OcrFieldList from "../components/OcrFieldList.jsx";
import OcrConfidenceList from "../components/OcrConfidenceList.jsx";
import RuleFindingCard from "../components/RuleFindingCard.jsx";
import ScanSummary, { ScanProgress } from "../components/ScanSummary.jsx";
import { CardSkeleton, ErrorBanner, LoadingState } from "../components/feedback.jsx";
import { PageHeading, PrimaryLink, SecondaryLink } from "../components/ui.jsx";

export default function ScanDetail() {
  const { id } = useParams();
  const { pathname } = useLocation();
  const userPortal = pathname.startsWith("/user");
  const base = userPortal ? "/user" : "";
  const [scan, setScan] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api(`/api/v1/scans/${id}`)
      .then((r) => r.json())
      .then(setScan)
      .catch((e) => setError(e.message));
  }, [id]);

  if (error) return <ErrorBanner title="Scan failed to load" message={error} />;
  if (!scan) return (
    <div className="space-y-4">
      <PageHeading kicker="Inspection / Evidence" title="Scan record" sub="Loading evidence, fields and findings." />
      <LoadingState what="Loading scan…" />
      <CardSkeleton lines={4} />
    </div>
  );

  const machine = (scan.findings || []).filter((f) => !f.review);
  const reviewed = (scan.findings || []).filter((f) => f.review);

  return (
    <div className="space-y-8">
      <PageHeading
        kicker="Inspection / Evidence"
        title={`Scan ${scan.scan_id.slice(0, 8)}`}
        sub={`${scan.filename} — machine analysis and inspector decisions stay separate.`}
        actions={<>
          <SecondaryLink to={`${base}/reports/${scan.scan_id}`}>Reports</SecondaryLink>
          {!userPortal && <PrimaryLink to={`/review/${scan.scan_id}`}>Inspector review</PrimaryLink>}
        </>}
      />

      <ScanSummary scan={scan} status="COULD_NOT_RELIABLY_VERIFY" />

      <div className="grid gap-8 xl:grid-cols-[60%_40%]">
        <section aria-label="Evidence">
          <EvidenceViewer scanId={scan.scan_id} boxes={(scan.findings || []).flatMap((f) => f.evidence_boxes || [])} />
        </section>
        <section aria-label="Machine findings">
          <h2 className="border-b border-rule pb-2 text-base font-bold tracking-tight text-ink">
            Machine findings <span className="tnum ml-1 text-xs font-semibold text-faint">{machine.length} pending</span>
          </h2>
          {machine.length ? (
            <ul className="divide-y divide-rule">
              {machine.map((f) => <RuleFindingCard key={f.rule_id} finding={f} />)}
            </ul>
          ) : (
            <p className="py-3 text-sm text-muted">No pending machine findings.</p>
          )}
          {reviewed.length > 0 && (
            <>
              <h2 className="mt-6 border-b border-rule pb-2 text-base font-bold tracking-tight text-ink">
                Inspector-confirmed <span className="tnum ml-1 text-xs font-semibold text-faint">{reviewed.length}</span>
              </h2>
              <ul className="divide-y divide-rule">
                {reviewed.map((f) => <RuleFindingCard key={f.rule_id} finding={f} />)}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Detected information">
          <h2 className="border-b border-rule pb-2 text-base font-bold tracking-tight text-ink">Detected information</h2>
          <div className="mt-1"><OcrFieldList fields={scan.fields} /></div>
          <details className="mt-3 text-sm">
            <summary className="cursor-pointer font-semibold text-muted hover:text-ink hover:underline">Token-level OCR (advanced)</summary>
            <div className="mt-2"><OcrConfidenceList tokens={scan.ocr?.tokens} /></div>
          </details>
        </section>
        <div className="space-y-8">
          <section aria-label="Processing record">
            <h2 className="border-b border-rule pb-2 text-base font-bold tracking-tight text-ink">Processing record</h2>
            <div className="mt-1"><ScanProgress state={scan.processing_state} /></div>
          </section>
          <section aria-label="Document output">
            <h2 className="border-b border-rule pb-2 text-base font-bold tracking-tight text-ink">Document output</h2>
            <div className="mt-3"><ReportActions scanId={scan.scan_id} /></div>
            <p className="mt-2 text-[13px] leading-relaxed text-muted">
              Machine findings are exported separately from human decisions, with reviewer, timestamps and versions.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
