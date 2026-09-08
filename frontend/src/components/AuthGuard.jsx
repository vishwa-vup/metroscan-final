import { Navigate, useLocation } from "react-router-dom";
import { getAuth } from "../api/client.js";

// AuthGuard + RoleGuard §28 (usability only — backend enforces, §24.12).
export function AuthGuard({ children }) {
  const auth = getAuth();
  const loc = useLocation();
  if (!auth?.access_token) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export function RoleGuard({ roles, children }) {
  const auth = getAuth();
  if (!roles.includes(auth?.role)) {
    return <p role="alert">Forbidden for role “{auth?.role || "none"}”.</p>;
  }
  return children;
}
