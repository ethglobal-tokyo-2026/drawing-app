import { useEffect, useState } from "react";

const TOAST_MS = 1800;

/** One toast at a time: an Ink slip that rises in and goes after a moment. */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!message) return;
    const id = setTimeout(() => setMessage(null), TOAST_MS);
    return () => clearTimeout(id);
  }, [message]);

  return {
    show: setMessage,
    node: message && (
      <div className="app-toast" role="status">
        {message}
      </div>
    ),
  };
}
