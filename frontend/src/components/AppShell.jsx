import { Link, NavLink, useNavigate } from "react-router-dom";
import { clearAuth, getAuth } from "../api/client.js";

const NAV = [
  ["/capture", "Capture"],
  ["/upload", "Upload"],
  ["/scans", "Scans"],
  ["/dashboard", "Dashboard"],
];

function navCls({ isActive }) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
    isActive ? "bg-white/15 text-white" : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;
}

// AppShell §28: sticky branded header, active-section nav, session chip,
// legal-scope footer. Semantic landmarks; keyboard-focusable throughout.
export default function AppShell({ children }) {
  const auth = getAuth();
  const nav = useNavigate();
  return (
    <div className="flex min-h-screen flex-col bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-10 bg-slate-900 text-white shadow">
        <nav className="mx-auto flex max-w-6xl flex-wrap items-center gap-1 px-4 py-3" aria-label="Primary">
          <Link to="/" className="mr-3 flex items-center gap-2 font-bold tracking-tight">
            <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500 text-sm">M</span>
            MetroScan
          </Link>
          {NAV.map(([to, label]) => (
            <NavLink key={to} to={to} className={navCls}>{label}</NavLink>
          ))}
          <span className="flex-1" />
          {auth?.email ? (
            <span className="flex items-center gap-2 text-sm">
              <span className="hidden rounded-full bg-white/10 px-3 py-1 text-slate-200 sm:inline">
                {auth.email} · {auth.role}
              </span>
              <button
                className="rounded-lg border border-white/25 px-3 py-1.5 text-sm font-medium hover:bg-white/10"
                onClick={() => { clearAuth(); nav("/login"); }}
              >
                Logout
              </button>
            </span>
          ) : (
            <NavLink to="/login" className={navCls}>Login</NavLink>
          )}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 space-y-4 px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white">
        <p className="mx-auto max-w-6xl px-4 py-3 text-xs text-slate-500">
          MetroScan is decision support only — potential non-compliance, pending inspector review. Never an autonomous legal verdict.
        </p>
      </footer>
    </div>
  );
}
