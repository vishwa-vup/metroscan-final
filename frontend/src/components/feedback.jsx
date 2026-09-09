// Shared feedback states: loading, empty, error/alert strip.
// Flat and calm; accessible roles preserved.
import { Link } from "react-router-dom";
import { Icon } from "./icons.jsx";

export function LoadingState({ what = "Loading…" }) {
  return (
    <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted">
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-rule border-t-brand-primary"
      />
      {what}
    </p>
  );
}

export function CardSkeleton({ lines = 3 }) {
  return (
    <div aria-hidden="true" className="rounded-lg border border-rule bg-surface p-4">
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
    <div className="border-t border-rule px-1 py-8">
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="mt-0.5 text-faint">
          <Icon name={icon} />
        </span>
        <div className="min-w-0">
          <p className="text-[15px] font-bold uppercase tracking-[0.08em] text-ink">{title}</p>
          {what && <p className="mt-1 max-w-lg text-sm leading-relaxed text-muted">{what}</p>}
          {actionTo && actionLabel && (
            <Link to={actionTo} className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-md bg-brand-primary px-4 text-sm font-semibold text-white hover:bg-brand-primaryDark">
              {actionLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function ErrorBanner({ title = "Something went wrong", message, retry }) {
  if (!message) return null;
  return (
    <div role="alert" className="border-l-[3px] border-bad bg-badSoft/40 py-2 pl-3 pr-2">
      <p className="flex items-center gap-1.5 text-sm font-bold text-bad">
        <Icon name="issue" className="[&_svg]:h-4 [&_svg]:w-4" />
        {title}
      </p>
      <p className="mt-0.5 text-sm leading-relaxed text-ink">{message}</p>
      {retry && (
        <button onClick={retry} className="mt-2 h-9 rounded-md border border-bad/40 bg-surface px-3 text-sm font-semibold text-bad hover:bg-badSoft/60">
          Try again
        </button>
      )}
    </div>
  );
}
