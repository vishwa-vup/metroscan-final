import { useEffect, useRef, useState } from "react";
import { API_BASE, authHeaders } from "../api/client.js";
import { Icon } from "./icons.jsx";
import { PrimaryButton, SecondaryButton } from "./ui.jsx";

// Intake workspace: idle surface → dominant preview → vertical processing
// record. Same contract: POST /api/v1/scans (field "image"); 422 → onRejected.
const MAX_MB = 10;
const ACCEPT = "image/jpeg,image/png,image/webp";

export default function ImageUploader({ onResult, onRejected, onError, completed = false }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  function pick(f) {
    if (!f) return;
    if (!ACCEPT.split(",").includes(f.type) && !f.type.startsWith("image/")) {
      onError?.("Unsupported format — choose JPG, PNG or WebP.");
      return;
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      onError?.(`File is larger than ${MAX_MB} MB — choose a smaller photo.`);
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(f);
    setPreview(URL.createObjectURL(f));
    onError?.("");
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
      onError?.(e.message);
    } finally {
      setBusy(false);
    }
  }

  const mb = file ? (file.size / 1048576).toFixed(2) : null;
  const steps = ["Select image", "Quality gate", "Analysis", "Result"];
  const stage = completed ? 4 : busy ? 3 : file ? 2 : 1;

  return (
    <div className="rounded-lg border border-rule bg-surface">
      {!preview ? (
        <div
          role="button"
          tabIndex={0}
          aria-label="Choose a label photo"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
          className={`flex cursor-pointer flex-col px-6 py-14 text-center transition-colors sm:py-20 ${
            drag ? "bg-tone" : "hover:bg-paper"
          }`}
        >
          <span aria-hidden="true" className="mx-auto text-faint"><Icon name="upload" /></span>
          <span className="mt-3 text-lg font-bold tracking-tight text-ink">Drop inspection image here</span>
          <span className="mt-1 text-sm text-muted">or <span className="font-semibold text-brand-primary underline underline-offset-2">choose a file</span></span>
          <span className="tnum mt-3 text-xs text-faint">JPG · PNG · WEBP — up to {MAX_MB} MB</span>
          <input ref={inputRef} type="file" accept="image/*" className="sr-only" aria-label="Label photo file"
            onChange={(e) => pick(e.target.files?.[0] || null)} />
        </div>
      ) : (
        <div>
          <div className="border-b border-rule bg-brand-navy p-2">
            <img src={preview} alt="Selected label preview" className="mx-auto max-h-[420px] w-full rounded-[6px] object-contain" />
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-b border-rule px-4 py-2.5 text-[13px]">
            <span className="min-w-0 flex-1 truncate font-semibold text-ink">{file?.name}</span>
            <span className="tnum text-muted">{mb} MB</span>
            <span className="tnum uppercase text-faint">{file?.type?.split("/")[1]}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 px-4 py-3">
            {busy ? (
              <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-muted">
                <span aria-hidden="true" className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-rule border-t-brand-primary" />
                Analyzing image…
              </p>
            ) : (
              <>
                <PrimaryButton disabled={!file} onClick={upload}>Run analysis</PrimaryButton>
                <SecondaryButton onClick={clear}>Replace</SecondaryButton>
              </>
            )}
          </div>
        </div>
      )}
      <ol aria-label="Intake progress" className="grid grid-cols-2 gap-px border-t border-rule bg-rule sm:grid-cols-4">
        {steps.map((s, i) => {
          const n = i + 1;
          const done = n < stage || completed;
          const active = !completed && n === stage;
          return (
            <li key={s} aria-current={active ? "step" : undefined}
              className={`bg-surface px-3 py-2 text-xs ${done || active ? "font-bold text-ink" : "text-faint"}`}>
              <span aria-hidden="true" className="tnum mr-1.5 text-faint">0{n}</span>{s}
              {active && <span className="sr-only"> (in progress)</span>}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
