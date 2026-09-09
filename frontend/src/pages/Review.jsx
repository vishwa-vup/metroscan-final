import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import EvidenceViewer, { InspectorReviewPanel } from "../components/EvidenceViewer.jsx";
import OcrFieldList from "../components/OcrFieldList.jsx";
import RuleFindingCard from "../components/RuleFindingCard.jsx";
import { ErrorBanner, LoadingState } from "../components/feedback.jsx";
import { PageHeading, TextLink } from "../components/ui.jsx";
import { formatDate } from "../utils/format.js";
import { useParams } from "react-router-dom";

// Inspector decision workflow: machine analysis (neutral, technical) is kept
// visually separate from the inspector decision (authoritative, auditable).
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

  if (error) return <ErrorBanner title="Review failed to load" message={error} />;
  if (!scan) return <LoadingState what="Loading review…" />;
  const pending = scan.findings.filter((f) => !f.review);
  return (
    <div className="space-y-8">
      <PageHeading
        kicker="Human decision / Review"
        title={`Review ${scan.scan_id.slice(0, 8)}`}
        sub={`${pending.length} pending · ${scan.findings.length - pending.length} resolved · ${scan.filename}`}
        actions={<TextLink to={`/scan/${id}`}>← Scan detail</TextLink>}
      />

      <div className="grid gap-8 xl:grid-cols-[55%_45%]">
        <section aria-label="Evidence">
          <EvidenceViewer scanId={id} boxes={pending.flatMap((f) => f.evidence_boxes || [])} />
        </section>
        <section aria-label="Machine analysis">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Machine analysis — advisory only</p>
          <h2 className="mt-0.5 border-b border-rule pb-2 text-base font-bold tracking-tight text-muted">What the system found</h2>
          {scan.findings.length ? (
            <ul className="divide-y divide-rule">
              {scan.findings.map((f) => <RuleFindingCard key={f.rule_id} finding={f} />)}
            </ul>
          ) : (
            <p className="py-3 text-sm text-muted">No machine findings on this scan.</p>
          )}
        </section>
      </div>

      <section aria-label="Inspector decision" className="border-t-2 border-ink pt-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Inspector decision — authoritative</p>
        <h2 className="mt-0.5 text-xl font-bold tracking-tight text-ink">Record decisions</h2>
        <div className="mt-4 space-y-6">
          {pending.map((f) => (
            <div key={f.rule_id} className="border-b border-rule pb-5 last:border-b-0">
              <p className="tnum font-mono text-xs text-faint">{f.rule_id} · {f.clause}</p>
              <p className="mt-0.5 text-sm font-medium text-ink">{f.message}</p>
              <div className="mt-2"><InspectorReviewPanel finding={f} onReviewed={load} /></div>
            </div>
          ))}
          {!pending.length && <p className="text-sm text-muted">Nothing awaiting decision.</p>}
        </div>
      </section>

      <div className="grid gap-8 lg:grid-cols-2">
        <section aria-label="Detected information">
          <h2 className="border-b border-rule pb-2 text-base font-bold tracking-tight text-ink">Detected information</h2>
          <div className="mt-1"><OcrFieldList fields={scan.fields} /></div>
        </section>
        {scan.reviews?.length > 0 && (
          <section aria-label="Decision record">
            <h2 className="border-b border-rule pb-2 text-base font-bold tracking-tight text-ink">Decision record</h2>
            <ul className="mt-1">
              {scan.reviews.map((r, i) => (
                <li key={i} className="tnum border-b border-rule py-2 text-[13px] text-muted last:border-b-0">
                  <span className="font-bold text-ink">{r.reviewer}</span> {r.action}ed {r.rule_id} · {formatDate(r.at)} · {r.prev_status} → {r.new_status}
                  {r.note && <span className="block text-muted">“{r.note}”</span>}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
