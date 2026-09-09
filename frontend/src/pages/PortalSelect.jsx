// Workspace selection: two operational entrances, distinct accent cues.
// No registration offered for inspectors.
import { Link, Navigate } from "react-router-dom";
import { homeFor, useAuth } from "../components/AuthContext.jsx";

export default function PortalSelect() {
  const { auth, role } = useAuth();
  if (auth?.access_token) return <Navigate to={homeFor(role)} replace />;
  return (
    <div className="mx-auto w-full max-w-3xl px-4 pt-6 sm:pt-10">
      <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-faint">
        <span aria-hidden="true" className="inline-block h-2 w-2 bg-brand-primary" />
        Metroscan
      </p>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">Select workspace</h1>
      <div className="mt-6 grid gap-px overflow-hidden rounded-lg border border-rule bg-rule sm:grid-cols-2">
        <Link to="/user/login" className="group border-l-4 border-l-brand-primary bg-surface p-6 hover:bg-tone/60">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-primary">Business</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-ink">Manage product scans</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">Capture labels, follow analysis, keep your history.</p>
          <p className="mt-3 text-sm font-semibold text-ink group-hover:underline">Enter user portal →</p>
        </Link>
        <Link to="/inspector/login" className="group border-l-4 border-l-teal-700 bg-surface p-6 hover:bg-tone/60">
          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-teal-800">Inspector</p>
          <p className="mt-1 text-xl font-bold tracking-tight text-ink">Review inspection evidence</p>
          <p className="mt-1 text-sm leading-relaxed text-muted">Confirm or clear findings. Staff accounts only.</p>
          <p className="mt-3 text-sm font-semibold text-ink group-hover:underline">Enter inspector portal →</p>
        </Link>
      </div>
    </div>
  );
}
