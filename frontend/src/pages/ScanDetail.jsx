import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { ReportActions } from "../components/Dashboard.jsx";
import EvidenceViewer from "../components/EvidenceViewer.jsx";
import OcrFieldList from "../components/OcrFieldList.jsx";
import OcrConfidenceList from "../components/OcrConfidenceList.jsx";
import RuleFindingCard from "../components/RuleFindingCard.jsx";
import ScanSummary, { ScanProgress } from "../components/ScanSummary.jsx";
import { CardSkeleton, ErrorBanner, LoadingState } from "../components/feedback.jsx";
import { Card, PageHeader, SecondaryLink, SectionTitle, TextLink } from "../components/ui.jsx";
import { useParams } from "react-router-dom";

export default function ScanDetail() {
  const { id } = useParams();
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
      <PageHeader title="Scan detail" sub="Evidence, extracted fields and rule findings." />
      <LoadingState what="Loading scan…" />
      <CardSkeleton lines={4} />
    </div>
  );

  const machine = (scan.findings || []).filter((f) => !f.review);
  const reviewed = (scan.findings || []).filter((f) => f.review);

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Scan ${scan.scan_id.slice(0, 8)}`}
        sub={`${scan.filename} — machine findings stay separate from inspector-confirmed results.`}
        actions={<>
          <SecondaryLink to={`/reports/${scan.scan_id}`}>Reports</SecondaryLink>
          <TextLink to={`/review/${scan.scan_id}`} className="inline-flex h-10 items-center rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white no-underline hover:bg-brand-primaryDark">Inspector review</TextLink>
        </>}
      />
      <ScanSummary scan={scan} status="COULD_NOT_RELIABLY_VERIFY" />
      <ScanProgress state={scan.processing_state} />
      <ReportActions scanId={scan.scan_id} />
      <div className="grid gap-3 xl:grid-cols-2">
        <EvidenceViewer scanId={scan.scan_id} boxes={(scan.findings || []).flatMap((f) => f.evidence_boxes || [])} />
        <OcrFieldList fields={scan.fields} />
      </div>
      <Card>
        <SectionTitle aside={<span className="tnum rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{machine.length} pending</span>}>
          Machine findings — awaiting review
        </SectionTitle>
        <div className="mt-3 space-y-2">
          {machine.length ? machine.map((f) => <RuleFindingCard key={f.rule_id} finding={f} />)
            : <p className="text-sm text-muted">No pending machine findings.</p>}
        </div>
      </Card>
      <Card>
        <SectionTitle aside={<span className="tnum rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">{reviewed.length} reviewed</span>}>
          Inspector-confirmed
        </SectionTitle>
        <div className="mt-3 space-y-2">
          {reviewed.length ? reviewed.map((f) => <RuleFindingCard key={f.rule_id} finding={f} />)
            : <p className="text-sm text-muted">Nothing confirmed yet — open inspector review to confirm or clear.</p>}
        </div>
      </Card>
      <OcrConfidenceList tokens={scan.ocr?.tokens} />
      <Card>
        <SectionTitle aside={<span className="tnum text-xs text-muted">{scan.ocr_tokens}</span>}>
          OCR tokens
        </SectionTitle>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {(scan.ocr?.tokens || []).map((t) => (
            <li key={t.index} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2.5 py-1.5">
              <span className="truncate font-mono text-xs">{t.text}</span>
              <span className="tnum shrink-0 text-xs text-muted">{Math.round(t.confidence * 100)}%</span>
            </li>
          ))}
        </ul>
      </Card>
      <div id="reviews" />
    </div>
  );
}

