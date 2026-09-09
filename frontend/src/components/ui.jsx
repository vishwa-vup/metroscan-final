// MetroScan operational-editorial primitives (frontend-only).
// Flat surfaces, 6–8px radii, rules over shadows. Same export names so all
// pages keep working; new Section/Panel/PageHeading carry the new grammar.
import { Link } from "react-router-dom";

export function Card({ className = "", children, ...rest }) {
  return (
    <section className={`rounded-lg border border-rule bg-surface p-4 sm:p-5 ${className}`} {...rest}>
      {children}
    </section>
  );
}

// Flat section: ruled header, content sits directly on the page.
export function Section({ title, kicker, action, children, className = "" }) {
  return (
    <section className={className}>
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-rule pb-2">
        <div className="min-w-0">
          {kicker && <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-faint">{kicker}</p>}
          <h2 className="text-lg font-bold tracking-tight text-ink">{title}</h2>
        </div>
        {action}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

// Panel: bordered container for content that genuinely needs containment
// (forms, auth, dialogs). Flat, no shadow.
export function Panel({ className = "", children, ...rest }) {
  return (
    <section className={`rounded-lg border border-rule bg-surface p-4 sm:p-5 ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function SectionCard({ title, sub, aside, children, className = "" }) {
  return (
    <Panel className={className}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="text-base font-bold tracking-tight text-ink">{title}</h2>
          {sub && <p className="mt-0.5 text-sm text-muted">{sub}</p>}
        </div>
        {aside}
      </div>
      <div className="mt-3">{children}</div>
    </Panel>
  );
}

// Editorial page heading: kicker rule + strong title + action cluster.
export function PageHeading({ kicker, title, sub, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b-2 border-ink pb-3">
      <div className="min-w-0">
        {kicker && <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">{kicker}</p>}
        <h1 className="mt-0.5 text-[1.7rem] font-bold leading-tight tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink">{title}</h1>
        {sub && <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-bold tracking-tight text-ink">{children}</h2>
      {aside}
    </div>
  );
}

export function MetricCard({ label, value, hint, icon, accent = "border-rule" }) {
  return (
    <div className={`rounded-lg border bg-surface p-4 ${accent}`}>
      <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <div className="tnum mt-1.5 text-[1.75rem] font-bold leading-none tracking-tight text-ink">{value}</div>
      {hint && <p className="mt-1.5 text-xs leading-snug text-muted">{hint}</p>}
    </div>
  );
}

const BTN = "inline-flex h-9 items-center justify-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function PrimaryButton({ className = "", ...rest }) {
  return <button className={`${BTN} bg-brand-primary text-white hover:bg-brand-primaryDark ${className}`} {...rest} />;
}

export function SecondaryButton({ className = "", ...rest }) {
  return <button className={`${BTN} border border-rule bg-surface text-ink hover:bg-tone ${className}`} {...rest} />;
}

export function GhostButton({ className = "", ...rest }) {
  return <button className={`${BTN} text-muted hover:bg-tone hover:text-ink ${className}`} {...rest} />;
}

export function DangerButton({ className = "", ...rest }) {
  return <button className={`${BTN} bg-bad text-white hover:brightness-110 ${className}`} {...rest} />;
}

export function SuccessButton({ className = "", ...rest }) {
  return <button className={`${BTN} bg-ok text-white hover:brightness-110 ${className}`} {...rest} />;
}

export function PrimaryLink({ to, children, className = "" }) {
  return <Link to={to} className={`${BTN} bg-brand-primary text-white no-underline hover:bg-brand-primaryDark ${className}`}>{children}</Link>;
}

export function SecondaryLink({ to, children, className = "" }) {
  return <Link to={to} className={`${BTN} border border-rule bg-surface text-ink no-underline hover:bg-tone ${className}`}>{children}</Link>;
}

export function TextLink({ to, children, className = "" }) {
  return <Link to={to} className={`font-medium text-brand-primary underline-offset-2 hover:underline ${className}`}>{children}</Link>;
}

export function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

const INPUT = "block h-10 w-full rounded-md border border-rule bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint hover:border-faint focus:border-brand-primary";

export function TextInput(props) {
  return <input className={INPUT} {...props} />;
}

export function SelectInput(props) {
  return <select className={INPUT} {...props} />;
}
