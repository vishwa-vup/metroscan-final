// Central auth context (master UI spec): current user/role, loading state,
// login, Google login, logout + route guards. Storage stays the existing
// localStorage session shape; backend JWT remains the authority.
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { API_BASE, clearAuth as clearStored, getAuth, setAuth as storeAuth } from "../api/client.js";
import { LoadingState } from "./feedback.jsx";

export const STAFF_ROLES = ["inspector", "admin"];
export const isStaffRole = (role) => STAFF_ROLES.includes(role);
// Business-role accounts are the self-service USER portal (own scans only).
export const homeFor = (role) => (isStaffRole(role) ? "/dashboard" : "/user/dashboard");

const STAFF_PATHS = ["/review", "/admin"];
export function pathAllowedFor(role, path) {
  if (!path) return false;
  if (STAFF_PATHS.some((p) => path === p || path.startsWith(p + "/"))) return isStaffRole(role);
  return true;
}

const AuthCtx = createContext(null);
export function useAuth() {
  return useContext(AuthCtx);
}

function toAuth(body) {
  return { access_token: body.access_token, role: body.role, email: body.email,
    business_id: body.business_id ?? null };
}

export function AuthProvider({ children }) {
  const [auth, setAuthState] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthState(getAuth());
    setReady(true);
  }, []);

  const login = useCallback(async (email, password) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 75000);
    try {
      const r = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: ctrl.signal,
      });
      if (!r.ok) {
        const detail = await r.json().catch(() => ({}));
        throw new Error(detail?.detail || "Invalid credentials — check email and password.");
      }
      const body = toAuth(await r.json());
      storeAuth(body);
      setAuthState(body);
      return body;
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error("Server is taking too long — it may be waking up. Tap Log in to retry.");
      }
      throw new Error(
        err.message === "Failed to fetch"
          ? "Couldn't reach the server — check your connection and tap Log in to retry."
          : err.message,
      );
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const googleLogin = useCallback(async (credential) => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 75000);
    try {
      const r = await fetch(`${API_BASE}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ credential }),
        signal: ctrl.signal,
      });
      const detail = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(detail?.detail || "Google sign-in failed.");
      const body = toAuth(detail);
      storeAuth(body);
      setAuthState(body);
      return body;
    } catch (err) {
      if (err?.name === "AbortError") {
        throw new Error("Server is taking too long — it may be waking up. Try again.");
      }
      throw err instanceof Error ? err : new Error("Google sign-in failed.");
    } finally {
      clearTimeout(timer);
    }
  }, []);

  const logout = useCallback(() => {
    clearStored();
    setAuthState(null);
  }, []);

  return (
    <AuthCtx.Provider value={{ auth, role: auth?.role, ready, login, googleLogin, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function RequireAuth({ children }) {
  const { auth, ready } = useAuth();
  const loc = useLocation();
  if (!ready) return <LoadingState what="Checking session…" />;
  if (!auth?.access_token) return <Navigate to="/login" state={{ from: loc.pathname }} replace />;
  return children;
}

export function RequireRole({ roles, children }) {
  const { auth, ready } = useAuth();
  if (!ready) return <LoadingState what="Checking session…" />;
  if (!auth?.access_token) return <Navigate to="/login" replace />;
  if (!roles.includes(auth.role)) return <Unauthorized />;
  return children;
}

export function Unauthorized() {
  return (
    <div role="alert" className="mx-auto max-w-md rounded-card border border-amber-300 bg-amber-50 p-6 text-center shadow-card">
      <p className="text-base font-semibold text-amber-900">Not authorized for this area</p>
      <p className="mt-1 text-sm text-amber-800">
        Your account role doesn&apos;t include this page. Continue in your own portal instead.
      </p>
    </div>
  );
}
