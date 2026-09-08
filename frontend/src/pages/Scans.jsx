import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import { ScanTable, SearchFilters } from "../components/Dashboard.jsx";
import { ErrorBanner, LoadingState } from "../components/feedback.jsx";
import { Icon } from "../components/icons.jsx";
import { PageHeader, PrimaryLink, SecondaryButton } from "../components/ui.jsx";

const EMPTY = { q: "", status: "all", date_from: "", date_to: "", inspector: "" };
const SIZE = 20;

export default function Scans() {
  const [f, setF] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback((p = 1) => {
    setError("");
    const q = new URLSearchParams({ ...f, page: p, size: SIZE });
    api(`/api/v1/scans?${q}`).then((r) => r.json()).then((d) => { setData(d); setPage(p); }).catch((e) => setError(e.message));
  }, [f]);

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const total = data?.total ?? 0;
  const lastPage = Math.max(1, Math.ceil(total / SIZE));

  return (
    <div className="space-y-4">
      <PageHeader
        title={`Scans${data ? ` (${total})` : ""}`}
        sub="Operational history — search, filter, then open evidence and inspector review."
        actions={<PrimaryLink to="/capture"><Icon name="plus" /> New scan</PrimaryLink>}
      />
      <SearchFilters f={f} setF={setF} onSearch={() => load(1)} />
      {error && <ErrorBanner title="Scans failed to load" message={error} retry={() => load(page)} />}
      {!data && !error && <LoadingState what="Loading scans…" />}
      {data && <ScanTable items={data.items} />}
      {data && total > 0 && (
        <div className="flex flex-wrap items-center gap-3">
          <SecondaryButton className="h-9 px-3 text-[13px]" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</SecondaryButton>
          <span className="tnum text-sm text-muted">Page {page} of {lastPage}</span>
          <SecondaryButton className="h-9 px-3 text-[13px]" disabled={page >= lastPage} onClick={() => load(page + 1)}>Next →</SecondaryButton>
        </div>
      )}
    </div>
  );
}
