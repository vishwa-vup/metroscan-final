import { useEffect, useRef, useState } from "react";
import { API_BASE, authHeaders } from "../api/client.js";
import { ErrorBanner } from "./feedback.jsx";
import { Icon } from "./icons.jsx";
import { Card, PrimaryButton, SecondaryButton, SectionTitle } from "./ui.jsx";

// ImageUploader v1.0: drag-drop surface + preview + validation, same contract:
// file select → POST /api/v1/scans (field "image") → result; 422 → onRejected.
const MAX_MB = 10;
const ACCEPT = "image/jpeg,image/png,image/webp";

export default function ImageUploader({ onResult, onRejected, completed = false }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f) {
    setError("");
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type) && !f.type.startsWith("image/")) {
      setError("Unsupported format — please choose JPG, PNG or WebP.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setError(`File is larger than ${MAX_MB} MB — please choose a smaller photo.`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  function clear() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function upload() {
    if (!file || busy) return;
    setBusy(true);
    setError("");
    try {
      const form = new FormData();
      form.append("image", file);
      const r = await fetch(`${API_BASE}/api/v1/scans`, {
        method: "POST",
        headers: { ...authHeaders() },
        body: form,
      });
      if (r.status === 422) {
        const detail = await r.json().catch(() => ({}));
        if (detail?.detail?.message) {
          onRejected?.(detail.detail);
          return;
        }
      }
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.detail?.message || d?.detail || `Upload failed (${r.status}) — try again.`);
      }
      onResult?.(await r.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  const mb = file ? (file.size / 1048576).toFixed(2) : null;
  // Real frontend states only: select → preview → analyze → result.
  const stage = completed ? 4 : busy ? 3 : preview ? 2 : 1;
  const STAGES = ["Select image", "Preview", "Analyze", "Result"];

  return (
    <Card>
      <SectionTitle aside={<span className="text-xs text-muted">Max {MAX_MB} MB</span>}>Product label image</SectionTitle>
      <ol aria-label="Upload progress" className="mt-3 flex items-center gap-1">
        {STAGES.map((s, i) => {
          const n = i + 1;
          const done = n < stage;
          const current = n === stage;
          return (
            <li key={s} className="flex min-w-0 flex-1 items-center gap-1.5" aria-current={current ? "step" : undefined}>
              <span aria-hidden="true" className={`tnum flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${done ? "bg-emerald-600 text-white" : current ? "bg-brand-primary text-white" : "bg-slate-200 text-slate-500"}`}>
                {done ? "✓" : n}
              </span>
              <span className={`truncate text-xs ${current || done ? "font-semibold text-ink" : "text-muted"}`}>{s}</span>
            </li>
          );
        })}
      </ol>
      <div
        role="button"
        tabIndex={0}
        aria-label="Choose a label photo"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
        className={`mt-3 flex cursor-pointer flex-col items-center gap-1.5 rounded-card border-2 border-dashed px-4 py-9 text-center transition-colors ${
          drag ? "border-brand-primary bg-brand-primary/5" : "border-slate-300 bg-slate-50 hover:border-brand-primary/60 hover:bg-brand-primary/[.04]"
        }`}
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary">
          <Icon name="upload" />
        </span>
        <span className="text-sm font-semibold text-ink">
          {file ? file.name : "Drop a label photo here, or browse"}
        </span>
        <span className="text-xs text-muted">JPG, PNG or WebP · max {MAX_MB} MB · originals are preserved unmodified</span>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Label photo file"
          onChange={(e) => pick(e.target.files?.[0] || null)}
        />
      </div>

      {preview && (
        <div className="mt-3 flex items-center gap-3 rounded-card border border-slate-200 bg-slate-50 p-3">
          <img src={preview} alt="Selected label preview" className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 object-cover" />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold text-ink">{file?.name}</p>
            <p className="tnum text-xs text-muted">{mb} MB</p>
          </div>
          <SecondaryButton className="h-9 px-3 text-[13px]" onClick={clear}>Replace</SecondaryButton>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {busy ? (
          <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted">
            <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-brand-primary" />
            Scanning — quality gate, OCR, extraction, rules…
          </p>
        ) : (
          <>
            <PrimaryButton disabled={!file} onClick={upload}>
              <Icon name="upload" />
              Upload &amp; scan
            </PrimaryButton>
            {file && <SecondaryButton onClick={clear}>Remove</SecondaryButton>}
          </>
        )}
      </div>
      <div className="mt-2"><ErrorBanner message={error} /></div>
    </Card>
  );
}
