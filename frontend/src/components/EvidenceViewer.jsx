import { useState } from "react";
import { API_BASE, api } from "../api/client.js";
import { AuthImg } from "./AuthImg.jsx";
import { ErrorBanner } from "./feedback.jsx";
import { Card, DangerButton, Field, SecondaryButton, SectionTitle, SuccessButton, TextInput } from "./ui.jsx";

// EvidenceViewer §28: original image prominent + evidence regions listed.
// Level 2 toggle: annotated copy with finding boxes (original never modified).
export default function EvidenceViewer({ scanId, boxes }) {
  const [annotated, setAnnotated] = useState(false);
  return (
    <Card>
      <SectionTitle aside={
        <SecondaryButton className="px-3 py-1 text-xs" onClick={() => setAnnotated(!annotated)}>
          {annotated ? "Show original" : "Show annotated evidence"}
        </SecondaryButton>
      }>
        Label evidence
      </SectionTitle>
      <figure className="mt-3">
        <AuthImg
          src={annotated ? `${API_BASE}/api/v1/scans/${scanId}/evidence/annotated` : `${API_BASE}/api/v1/scans/${scanId}/evidence`}
          alt="Original label evidence — machine findings shown beside it, never over it"
          className="max-h-[480px] w-full rounded-lg border border-slate-200 bg-slate-950 object-contain"
        />
        <figcaption className="mt-2 text-xs text-slate-500">
          {(boxes || []).length} evidence region(s)
          {(boxes || []).map((b, i) => (
            <span key={i} className="tnum font-mono"> [{b.join(", ")}]</span>
          ))}
        </figcaption>
      </figure>
    </Card>
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
    <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
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
            placeholder="checked against original photo…"
          />
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <DangerButton disabled={busy} onClick={() => act("confirm")}>
          Confirm issue
        </DangerButton>
        <SuccessButton disabled={busy} onClick={() => act("clear")}>
          Clear
        </SuccessButton>
      </div>
      <ErrorBanner message={error} />
    </div>
  );
}
