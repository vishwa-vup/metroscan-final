import { Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import { AuthGuard, RoleGuard } from "./components/AuthGuard.jsx";
import { Icon } from "./components/icons.jsx";
import { Card, PrimaryLink, SecondaryLink } from "./components/ui.jsx";
import Capture from "./pages/Capture.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Login from "./pages/Login.jsx";
import Placeholder from "./pages/Placeholder.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import Review from "./pages/Review.jsx";
import ScanDetail from "./pages/ScanDetail.jsx";
import Scans from "./pages/Scans.jsx";
import Upload from "./pages/Upload.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";

// Routes §28 (Phase 7: all routes live; guards are usability, backend enforces).
export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/capture" element={<AuthGuard><Capture /></AuthGuard>} />
        <Route path="/upload" element={<AuthGuard><Upload /></AuthGuard>} />
        <Route path="/scan/:id" element={<AuthGuard><ScanDetail /></AuthGuard>} />
        <Route path="/review/:id" element={<AuthGuard><Review /></AuthGuard>} />
        <Route path="/scans" element={<AuthGuard><Scans /></AuthGuard>} />
        <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
        <Route path="/reports/:id" element={<AuthGuard><ReportPage /></AuthGuard>} />
        <Route path="/admin/users" element={<AuthGuard><RoleGuard roles={["admin"]}><AdminUsers /></RoleGuard></AuthGuard>} />
        <Route path="/admin/rules" element={<AuthGuard><RoleGuard roles={["admin"]}><Placeholder title="Admin rules" hint="Rule listing is live at /api/v1/rules; version switching is an ops action." /></RoleGuard></AuthGuard>} />
        <Route
          path="/"
          element={
            <Card className="overflow-hidden p-0">
              <div className="bg-brand-navy px-6 py-10 text-white sm:px-10">
                <p className="text-xs font-semibold uppercase tracking-widest text-brand-highlight">SIH26034 · Decision support only</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">MetroScan</h1>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-300">
                  AI-assisted Legal Metrology compliance scanner.
                  Potential non-compliance, pending inspector review. Never an autonomous legal verdict.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <PrimaryLink to="/capture"><Icon name="capture" /> Capture a label</PrimaryLink>
                  <SecondaryLink to="/upload" className="border-white/25 bg-transparent text-white hover:bg-white/10"><Icon name="upload" /> Upload an image</SecondaryLink>
                  <SecondaryLink to="/dashboard" className="border-white/25 bg-transparent text-white hover:bg-white/10"><Icon name="dashboard" /> Open dashboard</SecondaryLink>
                </div>
              </div>
              <div className="grid gap-3 p-6 sm:grid-cols-3">
                {[
                  ["1 · Capture", "Phone camera or gallery — quality gate stops poor shots early."],
                  ["2 · Verify", "OCR + rules with confidence, clauses and evidence beside the photo."],
                  ["3 · Decide", "Inspectors confirm or clear; reports export to PDF and DOCX."],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-card border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-ink">{t}</p>
                    <p className="mt-1 text-sm leading-relaxed text-muted">{d}</p>
                  </div>
                ))}
              </div>
            </Card>
          }
        />
      </Routes>
    </AppShell>
  );
}

