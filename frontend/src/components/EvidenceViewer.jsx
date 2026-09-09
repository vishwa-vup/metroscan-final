import { useState } from "react";
import { API_BASE, api } from "../api/client.js";
import { AuthImg } from "./AuthImg.jsx";
import { ErrorBanner } from "./feedback.jsx";
import { DangerButton, Field, SecondaryButton, SuccessButton, TextInput } from "./ui.jsx";

// Evidence frame: the image is the primary artifact. Segmented
// Original/Annotated control; annotated copy never modifies the original.
export default function EvidenceViewer({ scanId, boxes }) {
  const [annotated, setAnnotated] = useState(false);
  return (
    <figure className="min-w-0">
      <div role="group" aria-label="Evidence view" className="flex border-b border-rule">
        {[["Original", false], ["Annotated", true]].map(([label, on]) => (
          <button
            key={label}
            type="button"
            aria-pressed={annotated === on}
            onClick={() => setAnnotated(on)}
            className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-bold ${
              annotated === on ? "border-ink text-ink" : "border-transparent text-faint hover:text-muted"
            }`}
          >
            {label}
          </button>
        ))}
        <span className="tnum ml-auto self-center font-mono text-xs text-faint">
          {(boxes || []).length} regions
        </span>
      </div>
      <div className="border border-rule bg-brand-navy p-1.5">
        <AuthImg
          src={annotated ? `${API_BASE}/api/v1/scans/${scanId}/evidence/annotated` : `${API_BASE}/api/v1/scans/${scanId}/evidence`}
          alt="Original label evidence — machine findings shown beside it, never over it"
          className="max-h-[520px] w-full rounded-[4px] object-contain"
        />
      </div>
      <figcaption className="tnum mt-1.5 font-mono text-[11px] leading-relaxed text-faint">
        {(boxes || []).map((b, i) => (
          <span key={i} className="mr-2">E{String(i + 1).padStart(2, "0")} [{b.join(", ")}]</span>
        ))}
      </figcaption>
    </figure>
  );
}

// InspectorReviewPanel §28: confirm / clear + note + reviewer, machine vs human distinct.
export function InspectorReviewPanel({ finding, onReviewed }) {
  const [reviewer, setReviewer] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  if (finding.review) return null; // resolved items show history, not actions

  async function act(action) {
    setBusy(true);
    setError("");
    try {
      const r = await api(
        `/api/v1/scans/${finding.scan_id}/reviews`,
        {
          method: "POST",
          body: JSON.stringify({ rule_id: finding.rule_id, action, reviewer, note }),
        },
      );
      onReviewed?.(await r.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 border border-rule bg-paper p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <Field label="Reviewer display name (optional — login identity is recorded)">
          <TextInput
            value={reviewer}
            onChange={(e) => setReviewer(e.target.value)}
            placeholder="e.g. insp. Rao"
          />
        </Field>
        <Field label="Review note">
          <TextInput
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Checked against original photo…"
          />
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <DangerButton disabled={busy} onClick={() => act("confirm")}>
          {busy ? "Recording…" : "Confirm issue"}
        </DangerButton>
        <SuccessButton disabled={busy} onClick={() => act("clear")}>
          {busy ? "Recording…" : "Clear finding"}
        </SuccessButton>
        <span className="text-xs text-faint">Decisions are timestamped and auditable.</span>
      </div>
      <ErrorBanner message={error} />
    </div>
  );
}
