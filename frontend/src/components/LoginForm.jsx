// Shared portal login form: email + password (+ visibility toggle) with an
// optional official Google button for the USER portal only.
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { homeFor, pathAllowedFor, useAuth } from "./AuthContext.jsx";
import { ErrorBanner } from "./feedback.jsx";
import GoogleSignIn, { googleConfigured } from "./GoogleSignIn.jsx";
import { Field, PrimaryButton, TextInput } from "./ui.jsx";

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
  const steps = portal === "user"
    ? ["Capture a label", "Follow the analysis", "Keep your history"]
    : ["Open the queue", "Weigh the evidence", "Record the decision"];

  return (
    <div className="mx-auto w-full max-w-4xl px-4 pt-6 sm:pt-10">
      <div className="grid gap-8 md:grid-cols-[1fr_380px]">
        <div className="pt-1">
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.18em] text-faint">
            <span aria-hidden="true" className="inline-block h-2 w-2 bg-brand-primary" />
            Metroscan
          </p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink">{title}</h1>
          <p className="mt-1 max-w-sm text-sm leading-relaxed text-muted">{subtitle}</p>
          <ol className="mt-6 space-y-0 border-t border-rule">
            {steps.map((s, i) => (
              <li key={s} className="flex items-baseline gap-3 border-b border-rule py-2.5 text-sm">
                <span aria-hidden="true" className="tnum text-xs font-bold text-faint">0{i + 1}</span>
                <span className="font-medium text-ink">{s}</span>
              </li>
            ))}
          </ol>
          <p className="mt-4 max-w-sm text-xs leading-relaxed text-faint">
            Decision support only. Automated analysis never replaces inspector review.
          </p>
          <p className="mt-3 text-sm">
            <Link to="/login" className="font-semibold text-brand-primary hover:underline">
              ← Portal selection
            </Link>
          </p>
        </div>
        <div className="rounded-lg border border-rule bg-surface p-5 sm:p-6">
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
      </div>
      </div>
    </div>
  );
}
