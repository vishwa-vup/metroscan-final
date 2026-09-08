// Shared feedback states v1.0 (frontend-only): loading skeleton, empty, error.
// One look everywhere; accessible roles preserved.
import { Link } from "react-router-dom";
import { Icon } from "./icons.jsx";

export function LoadingState({ what = "Loading…" }) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted">
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-primary"
      />
      {what}
    </p>
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div aria-hidden="true" className="rounded-card border border-slate-200 bg-white p-4 shadow-card">
      <div className="ms-skeleton h-5 w-1/3 rounded" />
      <div className="mt-3 space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="ms-skeleton h-3.5 rounded" style={{ width: `${88 - i * 12}%` }} />
        ))}
      </div>
    </div>
  );
}

export function EmptyState({ title = "Nothing here yet", what = "", actionTo, actionLabel, icon = "file" }) {
  return (
    <div className="rounded-card border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-card">
      <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
        <Icon name={icon} />
      </span>
      <p className="mt-3 text-[15px] font-semibold text-ink">{title}</p>
      {what && <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">{what}</p>}
      {actionTo && actionLabel && (
        <Link to={actionTo} className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primaryDark">
          {actionLabel}
        </Link>
      )}
    </div>
  );
}

export function ErrorBanner({ title = "Something went wrong", message, retry }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-card border border-rose-200 bg-rose-50 p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-rose-900">
        <Icon name="issue" />
        {title}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-rose-800">{message}</p>
      {retry && (
        <button onClick={retry} className="mt-2 h-9 rounded-lg border border-rose-300 bg-white px-3 text-sm font-semibold text-rose-900 hover:bg-rose-100">
          Try again
        </button>
      )}
    </div>
  );
}
