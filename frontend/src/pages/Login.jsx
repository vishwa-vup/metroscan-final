import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE, setAuth } from "../api/client.js";
import { ErrorBanner } from "../components/feedback.jsx";
import { Card, Field, PrimaryButton, TextInput } from "../components/ui.jsx";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const nav = useNavigate();
  const loc = useLocation();

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const r = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!r.ok) {
        const detail = await r.json().catch(() => ({}));
        throw new Error(detail?.detail || "invalid credentials");
      }
      const body = await r.json();
      setAuth({ access_token: body.access_token, role: body.role, email: body.email });
      nav(loc.state?.from || "/dashboard", { replace: true });
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="mx-auto max-w-md pt-6">
      <Card>
        <div className="mb-4 flex items-center gap-2">
          <span aria-hidden="true" className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 font-bold text-white">M</span>
          <div>
            <h1 className="text-xl font-bold tracking-tight">Welcome back</h1>
            <p className="text-sm text-slate-500">Log in to MetroScan</p>
          </div>
        </div>
        <form className="space-y-3" onSubmit={submit}>
          <Field label="Email">
            <TextInput placeholder="inspector@example.com" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Password">
            <TextInput placeholder="••••••••" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <PrimaryButton type="submit" className="w-full">Log in</PrimaryButton>
        </form>
        <div className="mt-3"><ErrorBanner message={error} /></div>
      </Card>
    </div>
  );
}
