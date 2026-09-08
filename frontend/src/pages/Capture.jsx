import { useState } from "react";
import CameraCapture from "../components/CameraCapture.jsx";
import { Card, PageHeader, SecondaryLink } from "../components/ui.jsx";

export default function Capture() {
  const [captured, setCaptured] = useState(false);
  return (
    <div className="space-y-4">
      <PageHeader
        title="Capture a label"
        sub="Document-scanner style capture with gallery fallback. Works in the browser — no native app."
        actions={<SecondaryLink to="/upload">Prefer file upload?</SecondaryLink>}
      />
      <CameraCapture onCapture={() => setCaptured(true)} />
      <Card className="border-slate-200 bg-slate-50">
        <p className="text-[13px] leading-relaxed text-slate-600">
          {captured
            ? "Image captured locally. Upload it from the Upload page to run the quality gate, OCR and rule analysis."
            : "No image yet — start the camera or choose from the gallery."}
        </p>
      </Card>
    </div>
  );
}
