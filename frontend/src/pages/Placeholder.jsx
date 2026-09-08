import { Card, PageHeader } from "../components/ui.jsx";

export default function Placeholder({ title, hint }) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} />
      <Card>
        <p className="text-sm text-slate-600">{hint}</p>
      </Card>
    </div>
  );
}
