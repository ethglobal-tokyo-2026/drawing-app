import { useRef, useState, type ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import "./sheet.css";

/** How far the perforation must be dragged down before the sheet lets go. */
export const DISMISS_PX = 40;
/** How far a finger may wander, any way, and still tap rather than drag. */
const TAP_SLOP_PX = 8;

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
  const { t } = useTranslation();
  // The press on the perforation: where it started, how far down it is now, and whether it moved.
  const press = useRef<{ x: number; y: number; dy: number; moved: boolean } | null>(null);
  // A drag's release is its own; the click the browser sends after it isn't a tap.
  const dragged = useRef(false);
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
    const held = press.current;
    press.current = null;
    setDy(0);
    // A tap closes on the click that follows it, as a screen reader's activation does.
    if (!held?.moved) return;
    dragged.current = true;
    if (held.dy <= DISMISS_PX) return;
    setLeaveFrom(held.dy);
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
        aria-label={t(($) => $.ui.sheet.close, { label })}
        onPointerDown={(e) => {
          press.current = { x: e.clientX, y: e.clientY, dy: 0, moved: false };
          dragged.current = false;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const held = press.current;
          if (!held) return;
          const x = e.clientX - held.x;
          const y = e.clientY - held.y;
          held.moved ||= Math.hypot(x, y) > TAP_SLOP_PX;
          held.dy = Math.max(0, y);
          setDy(held.dy);
        }}
        onPointerUp={release}
        onPointerCancel={() => {
          press.current = null;
          setDy(0);
        }}
        onClick={() => {
          if (dragged.current) dragged.current = false;
          else onClose();
        }}
      />
      {children}
    </div>
  );
}
