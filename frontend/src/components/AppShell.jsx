import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { isStaffRole, useAuth } from "./AuthContext.jsx";
import { Icon } from "./icons.jsx";
import { ToastHost, toast } from "./Toast.jsx";

const STAFF_WORKSPACE = [
  ["/dashboard", "Dashboard", "dashboard"],
  ["/scans", "Inspection Queue", "scans"],
  ["/capture", "Capture", "capture"],
  ["/upload", "Upload", "upload"],
];
const STAFF_ACCOUNT = [["/profile", "Profile", "profile"]];

// User portal: only self-service destinations (backend scopes business users
// to their own scans; review/admin routes stay staff-only).
const USER_WORKSPACE = [
  ["/user/dashboard", "Dashboard", "dashboard"],
  ["/user/scan", "Scan Product", "capture"],
  ["/user/upload", "Upload Image", "upload"],
  ["/user/scans", "My Scans", "scans"],
];
const USER_ACCOUNT = [["/user/profile", "Profile", "profile"]];

function sideCls({ isActive }) {
  return `relative flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm transition-colors ${
    isActive
      ? "bg-white/[.07] font-semibold text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-brand-highlight"
      : "font-medium text-slate-400 hover:bg-white/[.04] hover:text-slate-100"
  }`;
}

function NavGroup({ label, items, onNav }) {
  return (
    <div>
      <p className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">{label}</p>
      <div className="space-y-0.5">
        {items.map(([to, itemLabel, icon]) => (
          <NavLink key={to} to={to} className={sideCls} onClick={onNav}>
            <Icon name={icon} className="[&_svg]:h-4 [&_svg]:w-4" />
            {itemLabel}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

// Operational control-panel shell: typographic lockup, grouped navigation
// with a single active-rule cue, quiet topbar, subtle legal footer.
export default function AppShell({ children }) {
  const { auth, logout } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const initial = (auth?.email || "?").slice(0, 1).toUpperCase();
  const staff = isStaffRole(auth?.role) || !auth;
  const WORKSPACE = staff ? STAFF_WORKSPACE : USER_WORKSPACE;
  const ACCOUNT = staff ? STAFF_ACCOUNT : USER_ACCOUNT;

  function doLogout() {
    logout();
    toast("Logged out.");
    nav("/login");
  }

  return (
    <div className="flex min-h-screen bg-paper text-ink">
      {/* Desktop rail */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-brand-navy text-white md:flex" aria-label="Primary">
        <Link to="/" className="block px-5 pb-4 pt-6">
          <span className="flex items-center gap-2">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 bg-brand-highlight" />
            <span className="text-[15px] font-bold tracking-[0.08em]">METROSCAN</span>
          </span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.22em] text-slate-500">
            Inspection intelligence
          </span>
        </Link>
        <div className="mx-5 border-t border-white/10" aria-hidden="true" />
        <nav className="flex flex-1 flex-col gap-5 overflow-y-auto px-3 py-4">
          <NavGroup label="Workspace" items={WORKSPACE} />
          <NavGroup label="Account" items={ACCOUNT} />
          <span className="flex-1" />
          <p className="border-l-2 border-white/20 px-3 py-1 text-[11px] leading-snug text-slate-400">
            Decision support only. Machine flags need inspector review.
          </p>
        </nav>
        <div className="border-t border-white/10 px-5 py-3">
          {auth?.email ? (
            <div className="flex items-center gap-2.5">
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-semibold text-white">{auth.email}</span>
                <span className="block text-[11px] uppercase tracking-[0.12em] text-slate-500">{auth.role}</span>
              </span>
              <button
                aria-label="Log out"
                title="Log out"
                className="rounded-md p-2 text-slate-400 hover:bg-white/10 hover:text-white"
                onClick={() => { doLogout(); }}
              >
                <Icon name="logout" className="[&_svg]:h-4 [&_svg]:w-4" />
              </button>
            </div>
          ) : (
            <NavLink to="/login" className={sideCls}>Login</NavLink>
          )}
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 border-b border-rule bg-paper">
          <div className="mx-auto flex h-14 w-full max-w-shell items-center gap-2 px-4">
            <button
              className="rounded-md p-2 text-muted hover:bg-tone md:hidden"
              aria-label={open ? "Close navigation" : "Open navigation"}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
            </button>
            <Link to="/" className="flex items-center gap-2 md:hidden">
              <span aria-hidden="true" className="inline-block h-2 w-2 bg-brand-primary" />
              <span className="text-sm font-bold tracking-[0.08em]">METROSCAN</span>
            </Link>
            <span className="flex-1" />
            {auth?.email ? (
              <span className="flex items-center gap-2.5">
                <span className="hidden text-[13px] text-muted sm:inline">
                  <span className="font-semibold text-ink">{auth.email}</span>
                  <span className="ml-2 text-[11px] font-bold uppercase tracking-[0.1em] text-faint">{auth.role}</span>
                </span>
                <button
                  className="rounded-md border border-rule bg-surface px-3 py-1.5 text-[13px] font-semibold text-ink hover:bg-tone md:hidden"
                  onClick={() => { doLogout(); }}
                >
                  Logout
                </button>
              </span>
            ) : (
              <Link to="/login" className="text-sm font-semibold text-brand-primary hover:underline">Login</Link>
            )}
          </div>
          {open && (
            <nav className="border-t border-white/10 bg-brand-navy px-3 py-3 md:hidden" aria-label="Primary mobile">
              <div className="space-y-4">
                <NavGroup label="Workspace" items={WORKSPACE} onNav={() => setOpen(false)} />
                <NavGroup label="Account" items={ACCOUNT} onNav={() => setOpen(false)} />
              </div>
            </nav>
          )}
        </header>

        <main className="mx-auto w-full max-w-shell flex-1 px-4 py-6 sm:px-6">{children}</main>
        <ToastHost />
        <footer className="border-t border-rule">
          <p className="mx-auto max-w-shell px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-faint sm:px-6">
            Decision support only — potential non-compliance requires inspector review
          </p>
        </footer>
      </div>
    </div>
  );
}
