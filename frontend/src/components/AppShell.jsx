import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { isStaffRole, useAuth } from "./AuthContext.jsx";
import { Icon } from "./icons.jsx";
import { ToastHost, toast } from "./Toast.jsx";

const STAFF_NAV = [
  ["/dashboard", "Dashboard", "dashboard"],
  ["/scans", "Inspection Queue", "scans"],
  ["/capture", "Capture", "capture"],
  ["/upload", "Upload", "upload"],
  ["/profile", "Profile", "profile"],
];

// User portal: only self-service destinations (backend scopes business users
// to their own scans; review/admin routes stay staff-only).
const USER_NAV = [
  ["/user/dashboard", "Dashboard", "dashboard"],
  ["/user/scan", "Scan Product", "capture"],
  ["/user/upload", "Upload Image", "upload"],
  ["/user/scans", "My Scans", "scans"],
  ["/user/profile", "Profile", "profile"],
];

function sideCls({ isActive }) {
  return `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
    isActive
      ? "bg-brand-primary text-white shadow-sm"
      : "text-slate-300 hover:bg-white/10 hover:text-white"
  }`;
}

// AppShell v1.1: navy sidebar + quiet topbar + mobile nav, role-aware links.
// Same auth behavior via central context; logout toast; backend untouched.
export default function AppShell({ children }) {
  const { auth, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const initial = (auth?.email || "?").slice(0, 1).toUpperCase();
  const NAV = isStaffRole(auth?.role) || !auth ? STAFF_NAV : USER_NAV;

  function doLogout() {
    logout();
    toast("Logged out.");
    nav("/login");
  }

  return (
    <div className="flex min-h-screen bg-canvas text-ink">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-brand-navy text-white md:flex" aria-label="Primary">
        <Link to="/" className="flex items-center gap-2.5 px-5 pb-5 pt-6">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-brand-primary text-base font-bold text-white">
            M
          </span>
          <span className="leading-tight">
            <span className="block text-[15px] font-bold tracking-tight">MetroScan</span>
            <span className="block text-[11px] font-medium text-slate-400">Inspection intelligence</span>
          </span>
        </Link>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV.map(([to, label, icon]) => (
            <NavLink key={to} to={to} className={sideCls}>
              <Icon name={icon} />
              {label}
            </NavLink>
          ))}
          <span className="flex-1" />
          <div className="mb-2 rounded-card border border-white/10 bg-white/5 p-3">
            <p className="text-xs font-semibold text-slate-200">Decision support only</p>
            <p className="mt-0.5 text-xs leading-snug text-slate-400">Machine flags need inspector review.</p>
          </div>
        </nav>
        <div className="border-t border-white/10 p-3">
          {auth?.email ? (
            <div className="flex items-center gap-2.5">
              <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-highlight/30 text-sm font-bold text-white">
                {initial}
              </span>
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-semibold text-white">{auth.email}</span>
                <span className="block text-xs capitalize text-slate-400">{auth.role}</span>
              </span>
              <button
                aria-label="Log out"
                title="Log out"
                className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
                onClick={() => { doLogout(); }}
              >
                <Icon name="logout" />
              </button>
            </div>
          ) : (
            <NavLink to="/login" className={sideCls}>Login</NavLink>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-shell items-center gap-2 px-4">
            <button
              className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 md:hidden"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <Link to="/" className="flex items-center gap-2 font-bold tracking-tight md:hidden">
              <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-primary text-sm text-white">M</span>
              MetroScan
            </Link>
            <span className="flex-1" />
            {auth?.email ? (
              <span className="flex items-center gap-2.5">
                <span className="hidden text-[13px] text-muted sm:inline">
                  <span className="font-semibold text-ink">{auth.email}</span>
                  <span className="ml-1.5 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold capitalize text-slate-600">{auth.role}</span>
                </span>
                <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-navy text-xs font-bold text-white sm:hidden md:flex">
                  {initial}
                </span>
                <button
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 md:hidden"
                  onClick={() => { doLogout(); }}
                >
                  Logout
                </button>
              </span>
            ) : (
              <Link to="/login" className="text-sm font-semibold text-brand-primary hover:underline">Login</Link>
            )}
          </div>
          {/* Mobile nav */}
          {open && (
            <nav className="border-t border-slate-200 bg-brand-navy px-3 py-2 md:hidden" aria-label="Primary mobile">
              {NAV.map(([to, label, icon]) => (
                <NavLink key={to} to={to} className={sideCls} onClick={() => setOpen(false)}>
                  <Icon name={icon} />
                  {label}
                </NavLink>
              ))}
            </nav>
          )}
        </header>

        <main className="mx-auto w-full max-w-shell flex-1 space-y-4 px-4 py-6">{children}</main>
        <ToastHost />
        <footer className="border-t border-slate-200 bg-white">
          <p className="mx-auto max-w-shell px-4 py-3 text-xs leading-relaxed text-muted">
            MetroScan is decision support only — potential non-compliance, pending inspector review. Never an autonomous legal verdict.
          </p>
        </footer>
      </div>
    </div>
  );
}
