import { useParams } from "react-router-dom";
import { ReportActions } from "../components/Dashboard.jsx";
import { Card, PageHeader, TextLink } from "../components/ui.jsx";

export default function ReportPage() {
  const { id } = useParams();
  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        sub="One internal report feeds both formats — re-click to retry."
        actions={<TextLink to={`/scan/${id}`}>← back to scan</TextLink>}
      />
      <Card>
        <ReportActions scanId={id} />
        <p className="mt-3 text-sm text-slate-600">
          PDF (ReportLab) and editable DOCX (python-docx) list machine findings separately
          from human decisions, with reviewer, timestamps, versions and limitations.
        </p>
      </Card>
    </div>
  );
}
