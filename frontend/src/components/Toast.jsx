// Minimal toast bus with success/info/warning/error types + icons.
import { useEffect, useState } from "react";
import { Icon } from "./icons.jsx";

const listeners = new Set();
export function toast(message, type = "info") {
  listeners.forEach((fn) => fn(message, type));
}

const STYLE = {
  success: "bg-emerald-700",
  info: "bg-brand-navy",
  warning: "bg-amber-600",
  error: "bg-rose-700",
};
const ICON = { success: "check", info: "clock", warning: "warn", error: "issue" };

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const fn = (message, type = "info") => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-2), { id, message, type }]);
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 4000);
    };
    listeners.add(fn);
    return () => {
      listeners.delete(fn);
    };
  }, []);
  if (!items.length) return null;
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex flex-col items-center gap-2 px-4">
      {items.map((t) => (
        <p key={t.id} role="status" className={`flex max-w-md items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium text-white shadow-pop ${STYLE[t.type] || STYLE.info}`}>
          <Icon name={ICON[t.type] || ICON.info} className="[&_svg]:h-4 [&_svg]:w-4" />
          {t.message}
        </p>
      ))}
    </div>
  );
}
