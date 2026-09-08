import { useRef, useState } from "react";
import { ErrorBanner } from "./feedback.jsx";
import { Card, PrimaryButton, SecondaryButton, SectionTitle } from "./ui.jsx";

// CameraCapture §28 + PWA §29 (Phase 0 basics):
// browser Camera API, gallery fallback, permission-denial + unsupported handling,
// capture guidance, recapture workflow. Analysis wiring lands in Phase 1.
export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(null);

  async function startCamera() {
    setError("");
    if (!navigator.mediaDevices?.getUserMedia) {
      setError("Camera not supported in this browser — use gallery upload instead.");
      return;
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      setStream(s);
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
    } catch {
      setError("Camera permission denied — allow access or use gallery upload instead.");
    }
  }

  function stopCamera() {
    stream?.getTracks().forEach((t) => t.stop());
    setStream(null);
  }

  function takePhoto() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setPhoto({ blob, url });
      onCapture?.(blob);
    }, "image/jpeg", 0.92);
  }

  function onGallery(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setPhoto({ blob: file, url });
    onCapture?.(file);
  }

  function recapture() {
    if (photo?.url) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  }

  return (
    <Card>
      <SectionTitle>Capture</SectionTitle>
      <p className="mt-1 rounded-lg bg-slate-50 p-2 text-sm text-slate-600">
        Capture guidance: fill the frame with the label, hold steady in good light.
        Guidance improves odds but never guarantees analysis.
      </p>
      <div className="mt-3 space-y-3">
        <ErrorBanner message={error} />
        {!photo && (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} className="max-h-[420px] w-full rounded-lg bg-black object-contain" playsInline muted />
            <div className="flex flex-wrap gap-2">
              {!stream && <PrimaryButton onClick={startCamera}>📷 Start camera</PrimaryButton>}
              {stream && <PrimaryButton onClick={takePhoto}>Take photo</PrimaryButton>}
              {stream && <SecondaryButton onClick={stopCamera}>Stop</SecondaryButton>}
              <label className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50">
                🖼️ Gallery fallback
                <input type="file" accept="image/*" className="sr-only" onChange={onGallery} />
              </label>
            </div>
          </>
        )}
        {photo && (
          <div className="space-y-2">
            <img src={photo.url} alt="Captured label evidence" className="max-h-[420px] w-full rounded-lg border border-slate-200 object-contain" />
            <SecondaryButton onClick={recapture}>↺ Recapture</SecondaryButton>
          </div>
        )}
      </div>
    </Card>
  );
}
