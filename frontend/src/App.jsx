import { Link, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import { AuthProvider, RequireAuth, RequireRole, Unauthorized } from "./components/AuthContext.jsx";
import { AuthGuard, RoleGuard } from "./components/AuthGuard.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import { PrimaryLink } from "./components/ui.jsx";
import Capture from "./pages/Capture.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import { InspectorLogin, UserLogin } from "./pages/Logins.jsx";
import Placeholder from "./pages/Placeholder.jsx";
import PortalSelect from "./pages/PortalSelect.jsx";
import Profile from "./pages/Profile.jsx";
import ReportPage from "./pages/ReportPage.jsx";
import Review from "./pages/Review.jsx";
import ScanDetail from "./pages/ScanDetail.jsx";
import Scans from "./pages/Scans.jsx";
import Upload from "./pages/Upload.jsx";
import AdminUsers from "./pages/AdminUsers.jsx";

function NotFound() {
  return (
    <div className="mx-auto max-w-md border-t-2 border-ink px-1 py-8">
      <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-faint">404</p>
      <p className="mt-1 text-xl font-bold tracking-tight text-ink">Page not found</p>
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
        <ErrorBoundary>
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
          <Route path="/user/profile" element={<RequireAuth><Profile /></RequireAuth>} />
          <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
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
            <div className="mx-auto max-w-3xl pb-4 pt-6 sm:pt-10">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-faint">
                <span aria-hidden="true" className="inline-block h-2 w-2 bg-brand-primary" />
                MetroScan · Inspection intelligence
              </p>
              <h1 className="mt-3 text-4xl font-bold leading-[1.08] tracking-tight text-ink sm:text-5xl">
                Packaged-commodity compliance, inspected properly.
              </h1>
              <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-muted">
                Photograph a label. MetroScan extracts the declarations, checks them
                against configured rules, and files everything as evidence for
                inspector review.
              </p>
              <div className="mt-5">
                <PrimaryLink to="/login" className="h-11 px-6">Open portal</PrimaryLink>
              </div>
              <dl className="mt-10 grid gap-6 border-t-2 border-ink pt-5 sm:grid-cols-3">
                {[
                  ["01 · Capture", "Evidence image", "Camera or file upload with a quality gate up front."],
                  ["02 · Analyse", "OCR + extraction + rules", "Declarations, confidence scores, and cited clauses."],
                  ["03 · Review", "Inspector confirmation", "A person confirms or clears every finding."],
                ].map(([k, t, d]) => (
                  <div key={k}>
                    <dt className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{k}</dt>
                    <dd className="mt-1 text-[15px] font-bold text-ink">{t}</dd>
                    <dd className="mt-0.5 text-sm leading-relaxed text-muted">{d}</dd>
                  </div>
                ))}
              </dl>
            </div>
          }
        />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </ErrorBoundary>
      </AppShell>
    </AuthProvider>
  );
}

