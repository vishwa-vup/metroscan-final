// Shared UI primitives — one visual language for all 21 §28 components.
// No behavior changes here; pages compose these for consistent spacing,
// surfaces, inputs and buttons (mobile-first, keyboard-focusable).
import { Link } from "react-router-dom";

export function Card({ className = "", children, ...rest }) {
  return (
    <section className={`rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 ${className}`} {...rest}>
      {children}
    </section>
  );
}

export function PageHeader({ title, sub, actions }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
        {sub && <p className="mt-1 text-sm text-slate-600">{sub}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function SectionTitle({ children, aside }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base font-semibold text-slate-900">{children}</h2>
      {aside}
    </div>
  );
}

const BTN = "inline-flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50";

export function PrimaryButton({ className = "", ...rest }) {
  return <button className={`${BTN} bg-indigo-600 text-white hover:bg-indigo-700 ${className}`} {...rest} />;
}

export function SecondaryButton({ className = "", ...rest }) {
  return <button className={`${BTN} border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 ${className}`} {...rest} />;
}

export function DangerButton({ className = "", ...rest }) {
  return <button className={`${BTN} bg-rose-700 text-white hover:bg-rose-800 ${className}`} {...rest} />;
}

export function SuccessButton({ className = "", ...rest }) {
  return <button className={`${BTN} bg-emerald-700 text-white hover:bg-emerald-800 ${className}`} {...rest} />;
}

export function TextLink({ to, children, className = "" }) {
  return <Link to={to} className={`font-medium text-indigo-700 underline-offset-2 hover:underline ${className}`}>{children}</Link>;
}

export function Field({ label, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-slate-700">{label}</span>
      {children}
    </label>
  );
}

const INPUT = "block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 hover:border-slate-400";

export function TextInput(props) {
  return <input className={INPUT} {...props} />;
}

export function SelectInput(props) {
  return <select className={INPUT} {...props} />;
}
