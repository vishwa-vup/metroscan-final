import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { isStaffRole, useAuth } from "../components/AuthContext.jsx";
import DashboardCards, { IssueBreakdown, ScanTable } from "../components/Dashboard.jsx";
import { CardSkeleton, EmptyState, ErrorBanner, LoadingState } from "../components/feedback.jsx";
import { Icon } from "../components/icons.jsx";
import { Card, PageHeader, PrimaryLink, SecondaryLink } from "../components/ui.jsx";

export default function Dashboard() {
  const { role } = useAuth();
  const userPortal = !isStaffRole(role);
  const [summary, setSummary] = useState(null);
  const [recent, setRecent] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api("/api/v1/dashboard/summary").then((r) => r.json()).then(setSummary).catch((e) => setError(e.message));
    api("/api/v1/scans?page=1&size=5").then((r) => r.json()).then(setRecent).catch(() => {});
  }, []);

  const isEmpty = summary && (summary.total_scans ?? 0) === 0;
  const scanTo = userPortal ? "/user/scan" : "/capture";
  const uploadTo = userPortal ? "/user/upload" : "/upload";
  const scansTo = userPortal ? "/user/scans" : "/scans";

  return (
    <div className="space-y-4">
      <PageHeader
        title={userPortal ? "Welcome back" : "Dashboard"}
        sub={userPortal
          ? "Review your recent scans and start a new product scan."
          : "Inspection overview for today — machine findings stay separate from inspector-confirmed results."}
        actions={<>
          <SecondaryLink to={uploadTo}><Icon name="upload" /> Upload Image</SecondaryLink>
          <PrimaryLink to={scanTo}><Icon name="plus" /> Scan Product</PrimaryLink>
        </>}
      />
      {error && <ErrorBanner title="Dashboard failed to load" message={error} />}
      {!summary && !error && (
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <CardSkeleton lines={2} /><CardSkeleton lines={2} /><CardSkeleton lines={2} /><CardSkeleton lines={2} />
        </div>
      )}
      {summary && <DashboardCards summary={summary} />}
      {summary && !isEmpty && (
        <div className="grid gap-3 xl:grid-cols-2">
          <IssueBreakdown summary={summary} />
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold tracking-tight text-ink">How review works</h2>
            </div>
            <ol className="mt-3 space-y-2 text-sm leading-relaxed text-slate-600">
              <li><span className="font-semibold text-ink">1. Machine flags.</span> OCR + rules mark potential issues with clause + evidence.</li>
              <li><span className="font-semibold text-ink">2. Inspector reviews.</span> Confirm a real problem or clear it — never auto-verdict.</li>
              <li><span className="font-semibold text-ink">3. Report.</span> Export PDF + editable DOCX with evidence attached.</li>
            </ol>
          </Card>
        </div>
      )}
      {isEmpty && (
        <EmptyState
          title="No scans yet — ready for your first label"
          icon="capture"
          what="Capture or upload a product label. Quality check, OCR, extraction and rule analysis run automatically, then results appear here."
          actionTo={scanTo}
          actionLabel="Start your first scan"
        />
      )}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-semibold tracking-tight text-ink">Recent scans</h2>
          <SecondaryLink to={scansTo} className="h-9 px-3 text-[13px]">View all</SecondaryLink>
        </div>
        {!recent && !isEmpty && <LoadingState what="Loading recent scans…" />}
        {recent && <ScanTable items={recent.items?.slice(0, 5)} />}
      </div>
      <Card className="border-slate-200 bg-slate-50">
        <p className="text-[13px] leading-relaxed text-slate-600">Confirmed issues are counted separately from pending machine flags — never merged into one violation metric. MetroScan is decision support only.</p>
      </Card>
    </div>
  );
}
