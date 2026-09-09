// Minimal toast bus: transient feedback with a single aria-live region.
import { useEffect, useState } from "react";

const listeners = new Set();
export function toast(message) {
  listeners.forEach((fn) => fn(message));
}

export function ToastHost() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const fn = (message) => {
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev.slice(-2), { id, message }]);
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
        <p key={t.id} role="status" className="max-w-md rounded-lg bg-brand-navy px-4 py-2.5 text-sm font-medium text-white shadow-pop">
          {t.message}
        </p>
      ))}
    </div>
  );
}
