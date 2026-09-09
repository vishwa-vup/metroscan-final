// Profile: account identity, role, session info, logout. Plain and short.
import { Link, useNavigate } from "react-router-dom";
import { homeFor, isStaffRole, useAuth } from "../components/AuthContext.jsx";
import { toast } from "../components/Toast.jsx";
import { PageHeading, SecondaryButton } from "../components/ui.jsx";

export default function Profile() {
  const { auth, role, logout } = useAuth();
  const nav = useNavigate();
  const initial = (auth?.email || "?").slice(0, 1).toUpperCase();

  function doLogout() {
    logout();
    toast("Logged out.");
    nav("/login");
  }

  return (
    <div className="mx-auto w-full max-w-xl space-y-6">
      <PageHeading kicker="Account / Profile" title="Profile" />
      <div className="flex items-center gap-4 border-b-2 border-ink pb-4">
        <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy text-base font-bold text-white">
          {initial}
        </span>
        <div className="min-w-0">
          <p className="truncate text-lg font-bold tracking-tight text-ink">{auth?.email}</p>
          <p className="text-[13px] capitalize text-muted">
            {role === "business" ? "User" : role} portal
            {typeof auth?.business_id === "number" ? ` · workspace ${auth.business_id}` : ""}
          </p>
        </div>
      </div>
      <dl className="text-sm">
        {[
          ["Sign-in method", `Email${isStaffRole(role) ? " · staff" : ""}`],
          ["Session", "JWT, expires after 8 hours of issue"],
        ].map(([t, d]) => (
          <div key={t} className="flex justify-between gap-4 border-b border-rule py-2.5">
            <dt className="text-muted">{t}</dt>
            <dd className="font-semibold text-ink">{d}</dd>
          </div>
        ))}
        <div className="flex justify-between gap-4 border-b border-rule py-2.5">
          <dt className="text-muted">Workspace home</dt>
          <dd><Link to={homeFor(role)} className="font-semibold text-brand-primary hover:underline">Open dashboard</Link></dd>
        </div>
      </dl>
      <SecondaryButton onClick={doLogout}>Log out</SecondaryButton>
    </div>
  );
}
