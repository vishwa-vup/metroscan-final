import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import DashboardCards from "../components/Dashboard.jsx";
import { LoadingState } from "../components/feedback.jsx";
import { Card, PageHeader } from "../components/ui.jsx";

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  useEffect(() => {
    api("/api/v1/dashboard/summary").then((r) => r.json()).then(setSummary).catch(() => {});
  }, []);
  return (
    <div className="space-y-4">
      <PageHeader title="Dashboard" sub="Operational overview — inspectors see everything, businesses see their own scans." />
      {summary ? <DashboardCards summary={summary} /> : <LoadingState what="Loading dashboard…" />}
      <Card className="border-slate-200 bg-slate-50">
        <p className="text-sm text-slate-600">Confirmed issues are counted separately from pending machine flags — never merged into one violation metric.</p>
      </Card>
    </div>
  );
}
