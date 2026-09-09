import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { ErrorBanner } from "../components/feedback.jsx";
import { Field, PageHeading, PrimaryButton, SelectInput, TextInput, TextLink } from "../components/ui.jsx";

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ email: "", password: "", role: "inspector", business_name: "" });
  const [error, setError] = useState("");

  const load = () => api("/api/v1/admin/users").then((r) => r.json()).then(setUsers).catch((e) => setError(e.message));
  useEffect(() => { load(); }, []);

  async function create(e) {
    e.preventDefault();
    setError("");
    try {
      await api("/api/v1/admin/users", { method: "POST", body: JSON.stringify(form) });
      setForm({ email: "", password: "", role: "inspector", business_name: "" });
      load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="space-y-4">
      <PageHeading
        kicker="Administration / Accounts"
        title={`User accounts — ${users.length}`}
        actions={<TextLink to="/admin/rules">Rule versions →</TextLink>}
      />
      <ErrorBanner message={error} />
      <div className="grid gap-8 lg:grid-cols-[60%_40%]">
        <section aria-label="Existing users">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[420px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-ink text-left text-[11px] font-bold uppercase tracking-[0.1em] text-faint">
                  <th scope="col" className="py-2 pr-4 font-bold">Email</th>
                  <th scope="col" className="py-2 pr-4 font-bold">Role</th>
                  <th scope="col" className="py-2 text-right font-bold">Workspace</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b border-rule last:border-b-0 hover:bg-tone/60">
                    <td className="max-w-[260px] truncate py-2 pr-4 font-medium text-ink">{u.email}</td>
                    <td className="py-2 pr-4 text-[13px] capitalize text-muted">{u.role}</td>
                    <td className="tnum py-2 text-right text-[13px] text-muted">{u.business_id ? `#${u.business_id}` : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
        <section aria-label="Create user" className="h-fit rounded-lg border border-rule bg-surface p-4">
          <h2 className="text-base font-bold tracking-tight text-ink">Create user</h2>
          <form className="mt-3 space-y-3" onSubmit={create}>
            <Field label="Email">
              <TextInput placeholder="user@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Password">
              <TextInput placeholder="strong password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
            </Field>
            <Field label="Role">
              <SelectInput value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="inspector">inspector</option>
                <option value="business">business</option>
                <option value="admin">admin</option>
              </SelectInput>
            </Field>
            {form.role === "business" && (
              <Field label="Business name">
                <TextInput placeholder="business name" value={form.business_name} onChange={(e) => setForm({ ...form, business_name: e.target.value })} />
              </Field>
            )}
            <PrimaryButton type="submit">Create user</PrimaryButton>
          </form>
        </section>
      </div>
    </div>
  );
}
