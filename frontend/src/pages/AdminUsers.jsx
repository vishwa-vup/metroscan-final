import { useEffect, useState } from "react";
import { api } from "../api/client.js";
import { ErrorBanner } from "../components/feedback.jsx";
import { Card, Field, PageHeader, PrimaryButton, SectionTitle, SelectInput, TextInput, TextLink } from "../components/ui.jsx";

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
      <PageHeader title="Admin users" sub="Manage inspectors, businesses and admins." actions={<TextLink to="/admin/rules">Rule versions →</TextLink>} />
      <ErrorBanner message={error} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <SectionTitle aside={<span className="tnum text-xs text-slate-500">{users.length}</span>}>Existing users</SectionTitle>
          <ul className="mt-3 divide-y divide-slate-100 text-sm">
            {users.map((u) => (
              <li key={u.id} className="flex items-center justify-between gap-2 py-2">
                <span className="truncate font-medium">{u.email}</span>
                <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">
                  {u.role}{u.business_id ? ` · business #${u.business_id}` : ""}
                </span>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <SectionTitle>Create user</SectionTitle>
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
        </Card>
      </div>
    </div>
  );
}
