import { Navigate } from "react-router-dom";
import { homeFor, useAuth } from "../components/AuthContext.jsx";
import LoginForm from "../components/LoginForm.jsx";

export function UserLogin() {
  const { auth, role } = useAuth();
  if (auth?.access_token) return <Navigate to={homeFor(role)} replace />;
  return (
    <LoginForm
      portal="user"
      title="User Portal"
      subtitle="Scan products and manage your personal scans."
      google
    />
  );
}

export function InspectorLogin() {
  const { auth, role } = useAuth();
  if (auth?.access_token) return <Navigate to={homeFor(role)} replace />;
  return (
    <LoginForm
      portal="inspector"
      title="Inspector Portal"
      subtitle="Review scans and inspection records. Staff sign in with email — no public inspector registration."
    />
  );
}
