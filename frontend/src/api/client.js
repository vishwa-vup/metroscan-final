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
  // 75s timeout so mobile/flaky networks (and free-tier cold starts) fail
  // with a retryable error instead of hanging forever.
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeout || 75000);
  let r;
  try {
    r = await fetch(`${API_BASE}${path}`, {
      ...opts,
      signal: opts.signal || ctrl.signal,
      headers: { ...(opts.body instanceof FormData ? {} : { "Content-Type": "application/json" }), ...authHeaders(), ...(opts.headers || {}) },
    });
  } catch (err) {
    if (err?.name === "AbortError") {
      throw new Error("server is waking up (free tier sleeps when idle) — please retry in a minute");
    }
    throw new Error("couldn't reach the server — check your connection and retry");
  } finally {
    clearTimeout(timer);
  }
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
