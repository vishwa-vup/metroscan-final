import { useState } from "react";
import CameraCapture from "../components/CameraCapture.jsx";
import { PageHeader } from "../components/ui.jsx";

export default function Capture() {
  const [note, setNote] = useState("No image yet — capture or choose from gallery.");
  return (
    <div className="space-y-4">
      <PageHeader
        title="Capture a label"
        sub="Phone camera with gallery fallback. No native app required."
      />
      <CameraCapture onCapture={() => setNote("Image captured locally. Upload + quality gate land in Phase 1/6.")} />
      <p className="text-sm text-slate-600">{note}</p>
    </div>
  );
}
