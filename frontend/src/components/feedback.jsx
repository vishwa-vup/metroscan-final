// Shared feedback states §28 (single look for loading / empty / error).
export function LoadingState({ what = "Loading…" }) {
  return (
    <p role="status" className="flex items-center gap-2 text-sm text-slate-500">
      <span
        aria-hidden="true"
        className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600"
      />
      {what}
    </p>
  );
}

export function EmptyState({ what = "Nothing here yet." }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
      <p aria-hidden="true" className="text-2xl">📋</p>
      <p className="mt-1 text-sm text-slate-500">{what}</p>
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-xl border border-rose-300 bg-rose-50 p-3 text-sm text-rose-900">
      {message}
    </div>
  );
}
