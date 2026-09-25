import { useRef, useState, type ReactNode } from "react";
import "./sheet.css";

/** How far the perforation must be dragged down before the sheet lets go. */
const DISMISS_PX = 40;

interface Props {
  /** Names the sheet for assistive tech. */
  label: string;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

/** A bottom sheet on the Liner. Its perforation row is the grab: drag it down or tap it to close. */
export function Sheet({ label, onClose, className, children }: Props) {
  const start = useRef<number | null>(null);
  const [dy, setDy] = useState(0);

  const release = () => {
    const dragged = dy;
    start.current = null;
    setDy(0);
    if (dragged === 0 || dragged > DISMISS_PX) onClose();
  };

  return (
    <div
      className={["bottom-sheet", className].filter(Boolean).join(" ")}
      role="dialog"
      aria-label={label}
      style={dy ? { transform: `translateY(${dy}px)` } : undefined}
    >
      <button
        type="button"
        className="perf"
        aria-label={`Close ${label}`}
        onPointerDown={(e) => {
          start.current = e.clientY;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (start.current !== null) setDy(Math.max(0, e.clientY - start.current));
        }}
        onPointerUp={release}
        onPointerCancel={() => {
          start.current = null;
          setDy(0);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onClose();
          }
        }}
      />
      {children}
    </div>
  );
}
