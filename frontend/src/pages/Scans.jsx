import { useCallback, useEffect, useState } from "react";
import { api } from "../api/client.js";
import { ScanTable, SearchFilters } from "../components/Dashboard.jsx";
import { LoadingState } from "../components/feedback.jsx";
import { PageHeader, SecondaryButton } from "../components/ui.jsx";

const EMPTY = { q: "", status: "all", date_from: "", date_to: "", inspector: "" };

export default function Scans() {
  const [f, setF] = useState(EMPTY);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);

  const load = useCallback((p = 1) => {
    const q = new URLSearchParams({ ...f, page: p, size: 20 });
    api(`/api/v1/scans?${q}`).then((r) => r.json()).then((d) => { setData(d); setPage(p); }).catch(() => {});
  }, [f]);

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-4">
      <PageHeader title={`Scans${data ? ` (${data.total})` : ""}`} sub="Searchable history with evidence drill-down." />
      <SearchFilters f={f} setF={setF} onSearch={() => load(1)} />
      {data ? <ScanTable items={data.items} /> : <LoadingState what="Loading scans…" />}
      {data && (
        <div className="flex items-center gap-3">
          <SecondaryButton className="px-3 py-1 text-sm" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</SecondaryButton>
          <span className="tnum text-sm text-slate-600">page {page}</span>
          <SecondaryButton className="px-3 py-1 text-sm" disabled={page * 20 >= data.total} onClick={() => load(page + 1)}>Next →</SecondaryButton>
        </div>
      )}
    </div>
  );
}
