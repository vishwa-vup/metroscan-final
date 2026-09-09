import { useCallback, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { api } from "../api/client.js";
import { ScanTable, SearchFilters } from "../components/Dashboard.jsx";
import { ErrorBanner, LoadingState } from "../components/feedback.jsx";
import { PageHeading, PrimaryLink, SecondaryButton } from "../components/ui.jsx";

const EMPTY = { q: "", status: "all", date_from: "", date_to: "", inspector: "" };
const SIZE = 20;

export default function Scans() {
  const { pathname } = useLocation();
  const userPortal = pathname.startsWith("/user");
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
    <div className="space-y-5">
      <PageHeading
        kicker={userPortal ? "Workspace / History" : "Inspection operations / Queue"}
        title={userPortal ? `My scans${data ? ` — ${total}` : ""}` : `Inspection queue${data ? ` — ${total}` : ""}`}
        actions={<PrimaryLink to={userPortal ? "/user/scan" : "/capture"}>New scan</PrimaryLink>}
      />
      <SearchFilters f={f} setF={setF} onSearch={() => load(1)} />
      {error && <ErrorBanner title="Queue failed to load" message={error} retry={() => load(page)} />}
      {!data && !error && <LoadingState what="Loading queue…" />}
      {data && <ScanTable items={data.items} />}
      {data && total > 0 && (
        <div className="flex items-center gap-4 border-t border-rule pt-3 text-[13px] text-muted">
          <SecondaryButton className="h-8 px-3 text-[13px]" disabled={page <= 1} onClick={() => load(page - 1)}>← Prev</SecondaryButton>
          <span className="tnum">Page {page} of {lastPage} · {total} scans</span>
          <SecondaryButton className="h-8 px-3 text-[13px]" disabled={page >= lastPage} onClick={() => load(page + 1)}>Next →</SecondaryButton>
        </div>
      )}
    </div>
  );
}
