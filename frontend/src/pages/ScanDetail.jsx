import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { ReportActions } from "../components/Dashboard.jsx";
import EvidenceViewer from "../components/EvidenceViewer.jsx";
import OcrFieldList from "../components/OcrFieldList.jsx";
import OcrConfidenceList from "../components/OcrConfidenceList.jsx";
import RuleFindingCard from "../components/RuleFindingCard.jsx";
import ScanSummary, { ScanProgress } from "../components/ScanSummary.jsx";
import { ErrorBanner, LoadingState } from "../components/feedback.jsx";
import { Card, SectionTitle, TextLink } from "../components/ui.jsx";
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

  if (error) return <ErrorBanner message={error} />;
  if (!scan) return <LoadingState what="Loading scan…" />;
  return (
    <div className="space-y-4">
      <ScanSummary scan={scan} status="COULD_NOT_RELIABLY_VERIFY" />
      <ScanProgress state={scan.processing_state} />
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <TextLink to={`/review/${scan.scan_id}`}>Inspector review →</TextLink>
        <TextLink to={`/reports/${scan.scan_id}`}>Reports →</TextLink>
      </div>
      <ReportActions scanId={scan.scan_id} />
      <EvidenceViewer scanId={scan.scan_id} boxes={(scan.findings || []).flatMap((f) => f.evidence_boxes || [])} />
      <OcrFieldList fields={scan.fields} />
      <Card>
        <SectionTitle aside={<span className="tnum text-xs text-slate-500">{(scan.findings || []).length}</span>}>
          Rule findings
        </SectionTitle>
        <div className="mt-3 space-y-2">
          {(scan.findings || []).map((f) => (
            <RuleFindingCard key={f.rule_id} finding={f} />
          ))}
        </div>
      </Card>
      <OcrConfidenceList tokens={scan.ocr?.tokens} />
      <Card>
        <SectionTitle aside={<span className="tnum text-xs text-slate-500">{scan.ocr_tokens}</span>}>
          OCR tokens
        </SectionTitle>
        <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
          {(scan.ocr?.tokens || []).map((t) => (
            <li key={t.index} className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1">
              <span className="truncate font-mono text-xs">{t.text}</span>
              <span className="tnum shrink-0 text-xs text-slate-500">{Math.round(t.confidence * 100)}%</span>
            </li>
          ))}
        </ul>
      </Card>
      <div id="reviews" />
    </div>
  );
}

