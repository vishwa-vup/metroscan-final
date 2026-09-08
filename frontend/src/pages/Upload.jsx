import { useState } from "react";
import ImageUploader from "../components/ImageUploader.jsx";
import QualityResultCard from "../components/QualityResultCard.jsx";
import { Card, PageHeader, TextLink } from "../components/ui.jsx";

export default function Upload() {
  const [scan, setScan] = useState(null);
  const [rejected, setRejected] = useState(null);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Upload a label"
        sub="Quality gate, OCR, extraction and rules run automatically on upload."
      />
      <ImageUploader
        onResult={(s) => { setScan(s); setRejected(null); }}
        onRejected={(r) => { setRejected(r); setScan(null); }}
      />
      <QualityResultCard rejected={rejected} />
      {scan && (
        <Card className="border-indigo-200 bg-indigo-50/50">
          <p className="text-sm text-slate-600">Scan created · state <span className="tnum font-mono text-xs">{scan.processing_state}</span></p>
          <TextLink to={`/scan/${scan.scan_id}`} className="mt-1 inline-block">Open scan detail →</TextLink>
        </Card>
      )}
    </div>
  );
}
