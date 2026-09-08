import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE, setAuth } from "../api/client.js";
import { ErrorBanner } from "../components/feedback.jsx";
import { Card, Field, PrimaryButton, TextInput } from "../components/ui.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const nav = useNavigate();
  const loc = useLocation();

  // 75s timeout: free-tier API cold-starts can take ~50s+ on mobile networks.
  // Without this the button spins forever and the page looks "stuck".
  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
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
      const body = await r.json();
      setAuth({ access_token: body.access_token, role: body.role, email: body.email });
      nav(loc.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(
        err?.name === "AbortError"
          ? "Server is taking too long — on the free tier it sleeps when idle and needs ~1 minute to wake. Tap Log in to retry."
          : err.message === "Failed to fetch"
            ? "Couldn't reach the server — check your connection (use the public site URL, not localhost, on your phone) and tap Log in to retry."
            : err.message,
      );
    } finally {
      clearTimeout(timer);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md pt-8">
      <div className="mb-5 text-center">
        <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy text-lg font-bold text-white">
          M
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">Welcome back</h1>
        <p className="mt-1 text-sm text-muted">Log in to MetroScan inspection workspace</p>
      </div>
      <Card>
        <form className="space-y-3" onSubmit={submit}>
          <Field label="Email">
            <TextInput placeholder="inspector@example.com" autoComplete="username" inputMode="email" autoCapitalize="none" autoCorrect="off" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Password">
            <TextInput placeholder="••••••••" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>
          <PrimaryButton type="submit" className="w-full" disabled={busy}>{busy ? "Logging in…" : "Log in"}</PrimaryButton>
        </form>
        <div className="mt-3"><ErrorBanner title="Login failed" message={error} /></div>
      </Card>
      <p className="mt-4 text-center text-xs leading-relaxed text-muted">
        Decision support only — potential non-compliance, pending inspector review.
      </p>
    </div>
  );
}
