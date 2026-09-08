import { useRef, useState } from "react";
import { ErrorBanner } from "./feedback.jsx";
import { Icon } from "./icons.jsx";
import { Card, PrimaryButton, SecondaryButton, SectionTitle } from "./ui.jsx";

// CameraCapture v1.0 (frontend-only): same Camera API + gallery fallback,
// professional dark stage with scanning-frame overlay + guidance + states.
export default function CameraCapture({ onCapture }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState("");
  const [photo, setPhoto] = useState(null);
  const unsupported = typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia;

  async function startCamera() {
    setError("");
    if (unsupported) {
      setError("Camera is not supported in this browser — use gallery upload instead.");
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
      setError("Camera permission was denied — allow access in the browser prompt, or use gallery upload instead.");
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
      <SectionTitle aside={stream
        ? <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800"><span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-emerald-500" />Live</span>
        : <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">Idle</span>}>
        Capture
      </SectionTitle>

      {/* Dark camera stage with scanning frame */}
      <div className="relative mt-3 overflow-hidden rounded-card bg-brand-navy">
        {!photo && (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} className="max-h-[440px] min-h-[260px] w-full bg-brand-navy object-contain" playsInline muted aria-label="Live camera preview" />
            {!stream && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div className="relative h-44 w-64 max-w-[80%]">
                  <span aria-hidden="true" className="absolute left-0 top-0 h-7 w-7 rounded-tl-lg border-l-[3px] border-t-[3px] border-white/70" />
                  <span aria-hidden="true" className="absolute right-0 top-0 h-7 w-7 rounded-tr-lg border-r-[3px] border-t-[3px] border-white/70" />
                  <span aria-hidden="true" className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-lg border-b-[3px] border-l-[3px] border-white/70" />
                  <span aria-hidden="true" className="absolute bottom-0 right-0 h-7 w-7 rounded-br-lg border-b-[3px] border-r-[3px] border-white/70" />
                  <p className="absolute inset-0 flex items-center justify-center px-8 text-center text-[13px] leading-snug text-white/80">
                    {unsupported ? "Camera unavailable here — use gallery instead." : "Start the camera, then fill this frame with the label."}
                  </p>
                </div>
              </div>
            )}
            {stream && (
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 flex items-center justify-center p-6">
                <div className="relative h-48 w-72 max-w-[85%]">
                  <span className="absolute left-0 top-0 h-7 w-7 rounded-tl-lg border-l-[3px] border-t-[3px] border-brand-highlight" />
                  <span className="absolute right-0 top-0 h-7 w-7 rounded-tr-lg border-r-[3px] border-t-[3px] border-brand-highlight" />
                  <span className="absolute bottom-0 left-0 h-7 w-7 rounded-bl-lg border-b-[3px] border-l-[3px] border-brand-highlight" />
                  <span className="absolute bottom-0 right-0 h-7 w-7 rounded-br-lg border-b-[3px] border-r-[3px] border-brand-highlight" />
                </div>
              </div>
            )}
          </>
        )}
        {photo && (
          <img src={photo.url} alt="Captured label evidence" className="max-h-[440px] w-full bg-brand-navy object-contain" />
        )}
      </div>

      <ul className="mt-3 grid gap-1 text-[13px] leading-snug text-muted sm:grid-cols-2">
        <li>Fill the frame with the label.</li>
        <li>Hold steady in good light.</li>
        <li>Avoid glare and shadows.</li>
        <li>Guidance helps — it never guarantees analysis.</li>
      </ul>

      <div className="mt-3 space-y-3">
        <ErrorBanner title="Camera unavailable" message={error} />
        {!photo && (
          <div className="flex flex-wrap gap-2">
            {!stream && <PrimaryButton onClick={startCamera}><Icon name="capture" /> Start camera</PrimaryButton>}
            {stream && <PrimaryButton onClick={takePhoto}><Icon name="capture" /> Take photo</PrimaryButton>}
            {stream && <SecondaryButton onClick={stopCamera}>Stop</SecondaryButton>}
            <label className="inline-flex h-10 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50">
              <Icon name="upload" />
              Gallery fallback
              <input type="file" accept="image/*" className="sr-only" aria-label="Choose from gallery" onChange={onGallery} />
            </label>
          </div>
        )}
        {photo && (
          <div className="flex flex-wrap gap-2">
            <SecondaryButton onClick={recapture}>Recapture</SecondaryButton>
          </div>
        )}
      </div>
    </Card>
  );
}
