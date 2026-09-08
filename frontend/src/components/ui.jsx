// Shared UI primitives — MetroScan design system v1.0 (frontend-only).
// Same props/behavior; refreshed surfaces, type scale, button/input heights.
import { Link } from "react-router-dom";

export function Card({ className = "", children, ...rest }) {
  return (
    <section className={`rounded-card border border-slate-200 bg-white p-4 shadow-card sm:p-5 ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function SectionCard({ title, sub, aside, children, className = "" }) {
  return (
    <Card className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-semibold tracking-tight text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </Card>
  );
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold tracking-tight text-ink">{children}</h2>
      {aside}
    </div>
  );
}

export function MetricCard({ label, value, hint, icon, accent = "border-slate-200" }) {
  return (
    <div className={`rounded-card border bg-white p-4 shadow-card ${accent}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="tnum mt-1.5 text-[1.75rem] font-bold leading-none tracking-tight text-ink">{value}</div>
      {hint && <p className="mt-1.5 text-xs leading-snug text-muted">{hint}</p>}
    </div>
  );
}

const BTN = "inline-flex h-10 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold transition-all active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50";

export function PrimaryButton({ className = "", ...rest }) {
  return <button className={`${BTN} bg-brand-primary text-white shadow-sm hover:bg-brand-primaryDark ${className}`} {...rest} />;
}

export function SecondaryButton({ className = "", ...rest }) {
  return <button className={`${BTN} border border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50 ${className}`} {...rest} />;
}

export function GhostButton({ className = "", ...rest }) {
  return <button className={`${BTN} text-slate-600 hover:bg-slate-100 ${className}`} {...rest} />;
}

export function DangerButton({ className = "", ...rest }) {
  return <button className={`${BTN} bg-rose-700 text-white hover:bg-rose-800 ${className}`} {...rest} />;
}

export function SuccessButton({ className = "", ...rest }) {
  return <button className={`${BTN} bg-emerald-700 text-white hover:bg-emerald-800 ${className}`} {...rest} />;
}

export function PrimaryLink({ to, children, className = "" }) {
  return <Link to={to} className={`${BTN} bg-brand-primary text-white no-underline shadow-sm hover:bg-brand-primaryDark ${className}`}>{children}</Link>;
}

export function SecondaryLink({ to, children, className = "" }) {
  return <Link to={to} className={`${BTN} border border-slate-300 bg-white text-slate-700 no-underline hover:bg-slate-50 ${className}`}>{children}</Link>;
}

export function TextLink({ to, children, className = "" }) {
  return <Link to={to} className={`font-medium text-brand-primary underline-offset-2 hover:underline ${className}`}>{children}</Link>;
}

export function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const INPUT = "block h-10 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-ink placeholder:text-slate-400 hover:border-slate-400 focus:border-brand-primary";

export function TextInput(props) {
  return <input className={INPUT} {...props} />;
}

export function SelectInput(props) {
  return <select className={INPUT} {...props} />;
}
