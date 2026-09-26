import { useRef, useState, type ReactNode } from "react";
import "./sheet.css";

/** How far the perforation must be dragged down before the sheet lets go. */
const DISMISS_PX = 40;

interface Props {
  /** Names the sheet for assistive tech. */
  label: string;
  /**
   * For a sheet that stays mounted: closing slides it back down before it goes. A sheet whose parent
   * unmounts it leaves this out and simply goes.
   */
  open?: boolean;
  onClose: () => void;
  className?: string;
  children: ReactNode;
}

/** A bottom sheet on the Liner. Its perforation row is the grab: drag it down or tap it to close. */
export function Sheet({ label, open = true, onClose, className, children }: Props) {
  const start = useRef<number | null>(null);
  const [dy, setDy] = useState(0);
  // Where a drag left the sheet, so it slides away from there rather than jumping back first.
  const [leaveFrom, setLeaveFrom] = useState(0);
  const [shown, setShown] = useState(open);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setShown(true);
      setLeaveFrom(0);
    }
  }
  if (!shown) return null;

  const release = () => {
    const dragged = dy;
    start.current = null;
    setDy(0);
    if (dragged !== 0 && dragged <= DISMISS_PX) return;
    setLeaveFrom(dragged);
    onClose();
  };

  const leaving = !open;
  return (
    <div
      className={["bottom-sheet", leaving && "is-leaving", className].filter(Boolean).join(" ")}
      role="dialog"
      aria-label={label}
      aria-hidden={leaving || undefined}
      inert={leaving}
      style={dy ? { transform: `translateY(${dy}px)` } : { "--leave-from": `${leaveFrom}px` }}
      onAnimationEnd={(e) => {
        if (leaving && e.target === e.currentTarget) setShown(false);
      }}
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
