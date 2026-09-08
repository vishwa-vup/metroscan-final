// API client (Phase 7): JWT from login attached to every call (§24.10).
const KEY = "metroscan.auth";
// API_BASE_URL: same-origin by default (dev proxy / nginx); set
// VITE_API_BASE_URL to the cloud backend URL for split deployments.
export const API_BASE = (import.meta.env?.VITE_API_BASE_URL || "").replace(/\/$/, "");

export function getAuth() {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "null");
  } catch {
    return null;
  }
}

export function setAuth(a) {
  localStorage.setItem(KEY, JSON.stringify(a));
}

export function clearAuth() {
  localStorage.removeItem(KEY);
}

export function authHeaders() {
  const a = getAuth();
  return a?.access_token ? { Authorization: `Bearer ${a.access_token}` } : {};
}

export async function api(path, opts = {}) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts,
    headers: { ...(opts.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...authHeaders(), ...(opts.headers || {}) },
  });
  if (r.status === 401) {
    clearAuth();
    if (!location.pathname.startsWith("/login")) location.href = "/login";
    throw new Error("session expired — please log in again");
  }
  if (!r.ok) {
    const detail = await r.json().catch(() => ({}));
    throw new Error(detail?.detail?.message || detail?.detail || `request failed: ${r.status}`);
  }
  return r;
}

export async function downloadReport(scanId, fmt) {
  const r = await api(`${API_BASE}/api/v1/scans/${scanId}/report/${fmt}`);
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${scanId}.${fmt}`;
  a.click();
  URL.revokeObjectURL(url);
}
