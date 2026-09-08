import { useEffect, useState } from "react";
import { api } from "../api/client.js";

// AuthImg: evidence images need the JWT, which <img src> cannot send —
// fetch as blob with the token, then render the object URL.
export function AuthImg({ src, alt, className }) {
  const [url, setUrl] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    let obj = null;
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
  return <img src={url} alt={alt} className={className} />;
}
