// Portal selection: User Portal (blue) vs Inspector Portal (teal).
// No registration offered for inspectors; user self-service accounts are
// created by admins or via configured Google sign-in.
import { Link, Navigate } from "react-router-dom";
import { homeFor, useAuth } from "../components/AuthContext.jsx";
import { Icon } from "../components/icons.jsx";

const PORTALS = [
  {
    to: "/user/login",
    name: "User Portal",
    desc: "Scan products and manage your personal scans.",
    accent: "border-brand-primary/40 hover:border-brand-primary",
    chip: "bg-brand-primary/10 text-brand-primary",
    icon: "capture",
  },
  {
    to: "/inspector/login",
    name: "Inspector Portal",
    desc: "Review scans and inspection records. Staff accounts only.",
    accent: "border-teal-500/50 hover:border-teal-600",
    chip: "bg-teal-50 text-teal-800",
    icon: "check",
  },
];

export default function PortalSelect() {
  const { auth, role } = useAuth();
  if (auth?.access_token) return <Navigate to={homeFor(role)} replace />;
  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-8">
      <div className="text-center">
        <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy text-lg font-bold text-white">
          M
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">Choose your portal</h1>
        <p className="mt-1 text-sm text-muted">
          The portal decides your workspace. AI-assisted inspection support — never a legal verdict.
        </p>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {PORTALS.map((p) => (
          <Link
            key={p.to}
            to={p.to}
            className={`rounded-card border-2 bg-white p-5 shadow-card transition-all hover:shadow-pop ${p.accent}`}
          >
            <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${p.chip}`}>
              <Icon name={p.icon} className="[&_svg]:h-3.5 [&_svg]:w-3.5" />
              {p.name}
            </span>
            <span className="mt-2 block text-sm leading-relaxed text-slate-600">{p.desc}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
