import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { isStaffRole, useAuth } from "../components/AuthContext.jsx";
import DashboardCards, { IssueBreakdown, ScanTable } from "../components/Dashboard.jsx";
import { EmptyState, ErrorBanner, LoadingState } from "../components/feedback.jsx";
import { PageHeading, PrimaryLink, SecondaryLink } from "../components/ui.jsx";

export default function Dashboard() {
  const { role } = useAuth();
  const userPortal = !isStaffRole(role);
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/dashboard/summary").then((r) => r.json()).then(setSummary).catch((e) => setError(e.message));
    api("/api/v1/scans?page=1&size=8").then((r) => r.json()).then(setRecent).catch(() => {});
  }, []);

  const isEmpty = summary && (summary.total_scans ?? 0) === 0;
  const scanTo = userPortal ? "/user/scan" : "/capture";
  const uploadTo = userPortal ? "/user/upload" : "/upload";
  const scansTo = userPortal ? "/user/scans" : "/scans";

  return (
    <div className="space-y-8">
      <PageHeading
        kicker={userPortal ? "Workspace / Overview" : "Inspection operations / Overview"}
        title={userPortal ? "Welcome back" : "Inspection overview"}
        sub={userPortal
          ? "Your scans, their states, and what needs attention."
          : "Current scan activity, review workload, and confirmed outcomes."}
        actions={<>
          <SecondaryLink to={uploadTo}>Upload image</SecondaryLink>
          <PrimaryLink to={scanTo}>New scan</PrimaryLink>
        </>}
      />

      {error && <ErrorBanner title="Dashboard failed to load" message={error} />}
      {!summary && !error && <LoadingState what="Loading overview…" />}
      {summary && !isEmpty && <DashboardCards summary={summary} />}

      {isEmpty ? (
        <EmptyState
          title="No scans recorded"
          icon="capture"
          what="No inspections are available for this account."
          actionTo={scanTo}
          actionLabel="Start a scan"
        />
      ) : (
        <>
          <section aria-labelledby="queue-heading">
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
              <h2 id="queue-heading" className="text-lg font-bold tracking-tight text-ink">Review queue</h2>
              <SecondaryLink to={scansTo} className="h-8 px-3 text-[13px]">All scans</SecondaryLink>
            </div>
            <div className="mt-1">
              {!recent && <LoadingState what="Loading queue…" />}
              {recent && <ScanTable items={recent.items?.slice(0, 8)} />}
            </div>
          </section>

          <section aria-labelledby="class-heading" className="grid gap-8 lg:grid-cols-2">
            <div>
              <h2 id="class-heading" className="border-b border-rule pb-2 text-lg font-bold tracking-tight text-ink">Classification</h2>
              <div className="mt-3"><IssueBreakdown summary={summary} /></div>
            </div>
            <div>
              <h2 className="border-b border-rule pb-2 text-lg font-bold tracking-tight text-ink">How review works</h2>
              <ol className="mt-3 space-y-0 text-sm">
                {[
                  ["Machine flags", "OCR and rules mark potential issues with clause and evidence."],
                  ["Inspector reviews", "A person confirms a real problem or clears it."],
                  ["Report", "Export PDF and editable DOCX with evidence attached."],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3 border-b border-rule py-2 last:border-b-0">
                    <span aria-hidden="true" className="tnum text-xs font-bold text-faint">0{i + 1}</span>
                    <span><span className="font-bold text-ink">{t}.</span> <span className="text-muted">{d}</span></span>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
