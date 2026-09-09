import { useParams } from "react-router-dom";
import { ReportActions } from "../components/Dashboard.jsx";
import { PageHeading, TextLink } from "../components/ui.jsx";

export default function ReportPage() {
  const { id } = useParams();
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <PageHeading
        kicker="Document output / Reports"
        title="Reports"
        sub={`Generated from scan ${id}. Machine findings are exported separately from human decisions.`}
        actions={<TextLink to={`/scan/${id}`}>← Back to scan</TextLink>}
      />
      <div className="border-t-2 border-ink py-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Document output</p>
        <div className="mt-2"><ReportActions scanId={id} /></div>
        <dl className="mt-3 space-y-0 text-[13px]">
          <div className="flex justify-between gap-4 border-b border-rule py-1.5">
            <dt className="font-bold text-ink">PDF</dt>
            <dd className="text-muted">Fixed compliance report with evidence attached.</dd>
          </div>
          <div className="flex justify-between gap-4 border-b border-rule py-1.5">
            <dt className="font-bold text-ink">DOCX</dt>
            <dd className="text-muted">Editable version of the same record.</dd>
          </div>
        </dl>
      </div>
      <p className="text-xs leading-relaxed text-faint">
        Re-click a format to retry a failed download. Files generate on demand from the stored scan record.
      </p>
    </div>
  );
}
