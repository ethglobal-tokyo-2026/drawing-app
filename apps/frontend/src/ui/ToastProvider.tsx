import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ToastContext } from "./toastContext";
import "./toast.css";

const SHOWN_MS = 2400;
const LEAVE_MS = 180;

interface Toast {
  id: number;
  text: string;
  leaving: boolean;
}

/** One toast at a time: a newer message replaces the one showing. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<Toast | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const nextId = useRef(0);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };

  const show = useCallback((text: string) => {
    clearTimers();
    const id = ++nextId.current;
    setToast({ id, text, leaving: false });
    timers.current = [
      setTimeout(() => setToast((t) => (t?.id === id ? { ...t, leaving: true } : t)), SHOWN_MS),
      setTimeout(() => setToast((t) => (t?.id === id ? null : t)), SHOWN_MS + LEAVE_MS),
    ];
  }, []);

  useEffect(() => clearTimers, []);

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="app-toast-host" role="status" aria-live="polite">
        {toast && (
          <div key={toast.id} className={`app-toast ${toast.leaving ? "is-leaving" : ""}`}>
            {toast.text}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  );
}
