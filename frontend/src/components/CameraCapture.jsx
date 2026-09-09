import { useRef, useState } from "react";
import { ErrorBanner } from "./feedback.jsx";
import { Icon } from "./icons.jsx";
import { SecondaryButton } from "./ui.jsx";

// Field inspection tool: full-bleed dark stage, framing guide, status line,
// circular shutter + utility controls. Same Camera API + gallery behavior.
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
      stopCamera();
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
    <div>
      {/* Stage */}
      <div className="relative overflow-hidden rounded-md bg-brand-navy">
        <div className="flex h-8 items-center justify-between border-b border-white/10 px-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Declaration panel</p>
          {stream && !photo && (
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-red-400">
              <span aria-hidden="true" className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" /> Live
            </p>
          )}
          {photo && (
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Preview</p>
          )}
        </div>
        {!photo && (
          <>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <video ref={videoRef} className="h-[52vh] max-h-[480px] min-h-[300px] w-full bg-brand-navy object-cover" playsInline muted aria-label="Live camera preview" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-8 bottom-24 top-8 flex items-center justify-center">
              <div className="relative h-full w-full max-w-md">
                <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-white/80" />
                <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-white/80" />
                <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white/80" />
                <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white/80" />
              </div>
            </div>
            {!stream && (
              <div className="absolute inset-x-0 bottom-24 top-8 flex items-center justify-center p-6">
                <p className="max-w-xs text-center text-[13px] leading-snug text-white/85">
                  {unsupported
                    ? "Camera unavailable here — use the gallery."
                    : "Fit the complete declaration panel inside the frame."}
                </p>
              </div>
            )}
          </>
        )}
        {photo && (
          <img src={photo.url} alt="Captured label evidence" className="h-[52vh] max-h-[480px] min-h-[300px] w-full bg-brand-navy object-contain" />
        )}
        {/* Control bar */}
        <div className="flex items-center justify-between gap-2 border-t border-white/10 px-3 py-2.5">
          {!photo ? (
            <>
              {!stream ? (
                <button onClick={startCamera} className="h-10 rounded-md bg-surface px-4 text-sm font-bold text-ink hover:bg-white">
                  Start camera
                </button>
              ) : (
                <button
                  onClick={takePhoto}
                  aria-label="Capture photo"
                  className="mx-auto h-14 w-14 rounded-full border-4 border-white/90 bg-surface shadow-pop transition-transform hover:scale-105 active:scale-95"
                >
                  <span aria-hidden="true" className="mx-auto block h-8 w-8 rounded-full bg-brand-primary" />
                </button>
              )}
              <div className="flex items-center gap-2">
                {stream && (
                  <button onClick={stopCamera} className="h-10 rounded-md px-3 text-sm font-semibold text-slate-300 hover:bg-white/10 hover:text-white">
                    Cancel
                  </button>
                )}
                <label className="inline-flex h-10 cursor-pointer items-center gap-1.5 rounded-md border border-white/25 px-3 text-sm font-semibold text-white hover:bg-white/10">
                  <Icon name="upload" className="[&_svg]:h-4 [&_svg]:w-4" />
                  Gallery
                  <input type="file" accept="image/*" className="sr-only" aria-label="Choose from gallery" onChange={onGallery} />
                </label>
              </div>
            </>
          ) : (
            <>
              <button onClick={recapture} className="h-10 rounded-md border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10">
                Retake
              </button>
              <p className="text-xs text-slate-400">Captured — continue below.</p>
            </>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <ErrorBanner title="Camera unavailable" message={error} />
        <p className="text-[13px] leading-snug text-muted">Fit the complete declaration panel inside the frame. Hold steady. Avoid glare.</p>
      </div>
    </div>
  );
}
