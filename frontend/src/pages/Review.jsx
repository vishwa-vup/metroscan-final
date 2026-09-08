import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import EvidenceViewer, { InspectorReviewPanel } from "../components/EvidenceViewer.jsx";
import OcrFieldList from "../components/OcrFieldList.jsx";
import RuleFindingCard from "../components/RuleFindingCard.jsx";
import { ErrorBanner, LoadingState } from "../components/feedback.jsx";
import { Card, PageHeader, SectionTitle, TextLink } from "../components/ui.jsx";
import { useParams } from "react-router-dom";

// Review page §28 route /review/:id (Phase 4): evidence-first inspector workflow.
export default function Review() {
  const { id } = useParams();
  const [scan, setScan] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(() => {
    api(`/api/v1/scans/${id}`)
      .then((r) => r.json())
      .then((s) => setScan({
        ...s,
        findings: (s.findings || []).map((f) => ({ ...f, scan_id: s.scan_id })),
      }))
      .catch((e) => setError(e.message));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  if (error) return <ErrorBanner message={error} />;
  if (!scan) return <LoadingState what="Loading review…" />;
  const pending = scan.findings.filter((f) => !f.review);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Inspector review"
        sub={`${pending.length} pending · ${scan.findings.length - pending.length} resolved`}
        actions={<TextLink to={`/scan/${id}`}>← scan detail</TextLink>}
      />
      <EvidenceViewer scanId={id} boxes={pending.flatMap((f) => f.evidence_boxes || [])} />
      <div className="grid gap-4 lg:grid-cols-2">
        <OcrFieldList fields={scan.fields} />
        <div className="space-y-3">
          {scan.findings.map((f) => (
            <div key={f.rule_id} className="space-y-2">
              <RuleFindingCard finding={f} />
              <InspectorReviewPanel finding={f} onReviewed={load} />
            </div>
          ))}
        </div>
      </div>
      {scan.reviews?.length > 0 && (
        <Card>
          <SectionTitle>Review history</SectionTitle>
          <ul className="mt-2 space-y-1 text-sm text-slate-600">
            {scan.reviews.map((r, i) => (
              <li key={i} className="tnum">{r.at} — {r.reviewer} {r.action}ed {r.rule_id} ({r.prev_status} → {r.new_status})</li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
