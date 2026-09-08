import { useState } from "react";
import { Link, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell.jsx";
import { AuthGuard, RoleGuard } from "./components/AuthGuard.jsx";
import { Card } from "./components/ui.jsx";
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
              <div className="bg-slate-900 px-6 py-8 text-white sm:px-10">
                <h1 className="text-3xl font-bold tracking-tight">MetroScan</h1>
                <p className="mt-2 max-w-xl text-slate-300">
                  AI-assisted Legal Metrology compliance scanner — decision support only.
                  Potential non-compliance, pending inspector review. Never an autonomous legal verdict.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <Link to="/capture" className="inline-flex items-center rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400">📷 Capture a label</Link>
                  <Link to="/upload" className="inline-flex items-center rounded-lg border border-white/25 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">Upload an image</Link>
                  <Link to="/dashboard" className="inline-flex items-center rounded-lg border border-white/25 px-4 py-2 text-sm font-medium text-white hover:bg-white/10">Open dashboard</Link>
                </div>
              </div>
              <div className="grid gap-3 p-6 sm:grid-cols-3">
                {[
                  ["1 · Capture", "Phone camera or gallery — quality gate stops poor shots early."],
                  ["2 · Verify", "OCR + rules with confidence, clauses and evidence beside the photo."],
                  ["3 · Decide", "Inspectors confirm or clear; reports export to PDF and DOCX."],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-sm font-semibold text-slate-900">{t}</p>
                    <p className="mt-0.5 text-sm text-slate-600">{d}</p>
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

