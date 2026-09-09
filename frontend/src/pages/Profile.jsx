// Profile: read-only account info from the session (backend offers no
// profile editing) + portal home + logout. No sensitive data shown.
import { Link, useNavigate } from "react-router-dom";
import { homeFor, isStaffRole, useAuth } from "../components/AuthContext.jsx";
import { Icon } from "../components/icons.jsx";
import { toast } from "../components/Toast.jsx";
import { Card, PageHeader, SecondaryButton } from "../components/ui.jsx";

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
    <div className="mx-auto w-full max-w-xl space-y-4">
      <PageHeader title="Profile" sub="Your MetroScan account." />
      <Card>
        <div className="flex items-center gap-3">
          <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-navy text-base font-bold text-white">
            {initial}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[15px] font-semibold text-ink">{auth?.email}</p>
            <p className="text-[13px] capitalize text-muted">
              {role === "business" ? "User" : role} portal
              {typeof auth?.business_id === "number" ? ` · workspace ${auth.business_id}` : ""}
            </p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Sign-in method</dt>
            <dd className="font-medium text-ink">Email{isStaffRole(role) ? " · staff" : ""}</dd>
          </div>
          <div className="flex justify-between gap-2">
            <dt className="text-muted">Workspace home</dt>
            <dd><Link to={homeFor(role)} className="font-semibold text-brand-primary hover:underline">Open dashboard</Link></dd>
          </div>
        </dl>
        <div className="mt-4">
          <SecondaryButton onClick={doLogout}>
            <Icon name="logout" /> Log out
          </SecondaryButton>
        </div>
      </Card>
    </div>
  );
}
