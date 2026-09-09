import { Link, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import { AuthProvider, RequireAuth, RequireRole, Unauthorized } from "./components/AuthContext.jsx";
import { AuthGuard, RoleGuard } from "./components/AuthGuard.jsx";
import { Icon } from "./components/icons.jsx";
import { Card, PrimaryLink, SecondaryLink } from "./components/ui.jsx";
import Capture from "./pages/Capture.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { InspectorLogin, UserLogin } from "./pages/Logins.jsx";
import Placeholder from "./pages/Placeholder.jsx";
import PortalSelect from "./pages/PortalSelect.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import Review from "./pages/Review.jsx";
import ScanDetail from "./pages/ScanDetail.jsx";
import Scans from "./pages/Scans.jsx";
import Upload from "./pages/Upload.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";

function NotFound() {
  return (
    <div className="mx-auto max-w-md rounded-card border border-slate-200 bg-white p-6 text-center shadow-card">
      <p className="text-base font-semibold text-ink">Page not found</p>
      <p className="mt-1 text-sm text-muted">The link may be wrong. Continue from your portal instead.</p>
      <p className="mt-3"><Link to="/login" className="font-semibold text-brand-primary hover:underline">Go to portal selection</Link></p>
    </div>
  );
}

// Routes: portal selection + role portals. User routes reuse the same pages
// (backend already scopes business users to their own scans); inspector-only
// review/admin routes are staff-guarded. Backend authorization stays authoritative.
export default function App() {
  return (
    <AuthProvider>
      <AppShell>
        <Routes>
          <Route path="/login" element={<PortalSelect />} />
          <Route path="/user/login" element={<UserLogin />} />
          <Route path="/inspector/login" element={<InspectorLogin />} />
          <Route path="/user/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
          <Route path="/user/scan" element={<RequireAuth><Capture /></RequireAuth>} />
          <Route path="/user/upload" element={<RequireAuth><Upload /></RequireAuth>} />
          <Route path="/user/scans" element={<RequireAuth><Scans /></RequireAuth>} />
          <Route path="/user/scan/:id" element={<RequireAuth><ScanDetail /></RequireAuth>} />
          <Route path="/user/reports/:id" element={<RequireAuth><ReportPage /></RequireAuth>} />
          <Route path="/capture" element={<AuthGuard><Capture /></AuthGuard>} />
          <Route path="/upload" element={<AuthGuard><Upload /></AuthGuard>} />
          <Route path="/scan/:id" element={<AuthGuard><ScanDetail /></AuthGuard>} />
          <Route path="/review/:id" element={<RequireRole roles={["inspector", "admin"]}><Review /></RequireRole>} />
          <Route path="/scans" element={<AuthGuard><Scans /></AuthGuard>} />
          <Route path="/dashboard" element={<AuthGuard><Dashboard /></AuthGuard>} />
          <Route path="/reports/:id" element={<AuthGuard><ReportPage /></AuthGuard>} />
          <Route path="/unauthorized" element={<Unauthorized />} />
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
                  <PrimaryLink to="/login"><Icon name="capture" /> Scan Product</PrimaryLink>
                  <SecondaryLink to="/user/upload" className="border-white/25 bg-transparent text-white hover:bg-white/10"><Icon name="upload" /> Upload Image</SecondaryLink>
                  <SecondaryLink to="/login" className="border-white/25 bg-transparent text-white hover:bg-white/10"><Icon name="dashboard" /> Choose Portal</SecondaryLink>
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </AppShell>
    </AuthProvider>
  );
}

