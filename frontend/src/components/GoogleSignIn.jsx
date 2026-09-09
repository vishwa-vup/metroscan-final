// Google Identity Services sign-in (user portal only).
// Renders the OFFICIAL Google button via GIS; never a fake button.
// Hidden entirely when VITE_GOOGLE_CLIENT_ID is unset; shows nothing raw on failure.
import { useEffect, useRef, useState } from "react";

const CLIENT_ID = (import.meta.env?.VITE_GOOGLE_CLIENT_ID || "").trim();
export const googleConfigured = () => Boolean(CLIENT_ID);

export default function GoogleSignIn({ onCredential, disabled }) {
  const hostRef = useRef(null);
  const cbRef = useRef(onCredential);
  cbRef.current = onCredential;
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;
    const render = () => {
      try {
        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (resp) => cbRef.current?.(resp?.credential),
          auto_select: false,
          ux_mode: "popup",
        });
        if (!cancelled && hostRef.current) {
          hostRef.current.innerHTML = "";
          window.google.accounts.id.renderButton(hostRef.current, {
            theme: "outline",
            size: "large",
            width: "100%",
            text: "continue_with",
          });
        }
      } catch {
        if (!cancelled) setFailed(true);
      }
    };
    if (window.google?.accounts?.id) {
      render();
      return undefined;
    }
    const s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client";
    s.async = true;
    s.defer = true;
    s.onload = () => {
      if (!cancelled) {
        if (window.google?.accounts?.id) render();
        else setFailed(true);
      }
    };
    s.onerror = () => {
      if (!cancelled) setFailed(true);
    };
    document.head.appendChild(s);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!CLIENT_ID || failed || disabled) return null;
  return <div ref={hostRef} className="flex w-full justify-center" aria-label="Continue with Google" />;
}
