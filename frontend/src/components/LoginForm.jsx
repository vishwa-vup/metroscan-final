// Shared portal login form: email + password (+ visibility toggle) with an
// optional official Google button for the USER portal only.
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { homeFor, pathAllowedFor, useAuth } from "./AuthContext.jsx";
import { ErrorBanner } from "./feedback.jsx";
import GoogleSignIn, { googleConfigured } from "./GoogleSignIn.jsx";
import { Icon } from "./icons.jsx";
import { Card, Field, PrimaryButton, TextInput } from "./ui.jsx";

export default function LoginForm({ portal, title, subtitle, google = false }) {
  const { login, googleLogin } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function afterAuth(body) {
    const from = loc.state?.from;
    const dest = from && pathAllowedFor(body.role, from) ? from : homeFor(body.role);
    nav(dest, { replace: true });
  }

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const body = await login(email.trim(), password);
      setPassword("");
      afterAuth(body);
    } catch (err) {
      setPassword("");
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onGoogleCredential(credential) {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const body = await googleLogin(credential);
      afterAuth(body);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const showGoogle = google && portal === "user" && googleConfigured();

  return (
    <div className="mx-auto w-full max-w-md px-4 pt-8">
      <div className="mb-5 text-center">
        <span aria-hidden="true" className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-navy text-lg font-bold text-white">
          M
        </span>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">{title}</h1>
        <p className="mt-1 text-sm text-muted">{subtitle}</p>
      </div>
      <Card>
        <form className="space-y-3" onSubmit={submit}>
          <Field label="Email">
            <TextInput
              type="email"
              placeholder="you@example.com"
              autoComplete="username"
              inputMode="email"
              autoCapitalize="none"
              autoCorrect="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </Field>
          <Field label="Password">
            <div className="relative">
              <TextInput
                type={showPw ? "text" : "password"}
                placeholder="••••••••"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                aria-pressed={showPw}
                aria-label={showPw ? "Hide password" : "Show password"}
                onClick={() => setShowPw((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-sm font-semibold text-brand-primary hover:underline"
              >
                {showPw ? "Hide" : "Show"}
              </button>
            </div>
          </Field>
          <PrimaryButton type="submit" className="w-full" disabled={busy}>
            {busy ? "Logging in…" : "Log in"}
          </PrimaryButton>
        </form>
        {showGoogle && (
          <>
            <div className="my-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted" aria-hidden="true">
              <span className="h-px flex-1 bg-slate-200" /> or <span className="h-px flex-1 bg-slate-200" />
            </div>
            <GoogleSignIn onCredential={onGoogleCredential} disabled={busy} />
          </>
        )}
        <div className="mt-3"><ErrorBanner title="Login failed" message={error} /></div>
      </Card>
      <p className="mt-4 text-center text-sm text-muted">
        <Link to="/login" className="inline-flex items-center gap-1 font-semibold text-brand-primary hover:underline">
          <Icon name="scans" className="[&_svg]:h-4 [&_svg]:w-4" />
          Back to portal selection
        </Link>
      </p>
    </div>
  );
}
