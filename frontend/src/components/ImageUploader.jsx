import { useState } from "react";
import { API_BASE, authHeaders } from "../api/client.js";
import { ErrorBanner, LoadingState } from "./feedback.jsx";
import { Card, PrimaryButton, SectionTitle } from "./ui.jsx";

// ImageUploader §28: file select → POST /api/v1/scans → result; 422 quality
// rejections surface the recapture message via onRejected (Phase 6).
export default function ImageUploader({ onResult, onRejected }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function upload() {
    if (!file) return;
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
      if (!r.ok) throw new Error((await r.json()).detail || `upload failed: ${r.status}`);
      onResult?.(await r.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card>
      <SectionTitle>Product label image</SectionTitle>
      <label
        className="mt-3 flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center transition-colors hover:border-indigo-400 hover:bg-indigo-50/50"
      >
        <span aria-hidden="true" className="text-3xl">🖼️</span>
        <span className="text-sm font-medium text-slate-700">
          {file ? file.name : "Choose a label photo (JPG / PNG / WebP)"}
        </span>
        <span className="text-xs text-slate-500">max 10 MB · originals are preserved unmodified</span>
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
      </label>
      <div className="mt-3">
        {busy
          ? <LoadingState what="Scanning — quality gate, OCR, extraction, rules…" />
          : <PrimaryButton disabled={!file} onClick={upload}>Upload &amp; scan</PrimaryButton>}
      </div>
      <ErrorBanner message={error} />
    </Card>
  );
}
