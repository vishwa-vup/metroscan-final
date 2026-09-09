import { useEffect, useState } from "react";
import { api } from "../api/client.js";

// AuthImg: evidence images need the JWT, which <img src> cannot send —
// fetch as blob with the token, then render the object URL.
// Includes an accessible zoom toggle (fit ↔ enlarged) and reset.
export function AuthImg({ src, alt, className }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");
  const [zoomed, setZoomed] = useState(false);
  useEffect(() => {
    let live = true;
    let obj = null;
    setZoomed(false);
    api(src)
      .then((r) => r.blob())
      .then((b) => {
        if (!live) return;
        obj = URL.createObjectURL(b);
        setUrl(obj);
      })
      .catch((e) => live && setError(e.message));
    return () => {
      live = false;
      if (obj) URL.revokeObjectURL(obj);
    };
  }, [src]);
  if (error) return <p role="alert" className="text-sm text-red-700">evidence unavailable: {error}</p>;
  if (!url) return <p className="text-sm text-slate-500">Loading evidence…</p>;
  return (
    <div className="space-y-2">
      <div className="overflow-auto rounded-lg border border-slate-200 bg-slate-950">
        <img
          src={url}
          alt={alt}
          className={`${className || "max-h-[480px] w-full object-contain"} ${zoomed ? "max-h-none w-auto max-w-none cursor-zoom-out" : "cursor-zoom-in"}`}
          onClick={() => setZoomed((z) => !z)}
        />
      </div>
      <div>
        <button
          type="button"
          onClick={() => setZoomed((z) => !z)}
          aria-pressed={zoomed}
          className="h-9 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-semibold text-slate-700 hover:bg-slate-50"
        >
          {zoomed ? "Reset zoom" : "Zoom in"}
        </button>
      </div>
    </div>
  );
}
