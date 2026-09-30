import { useRef, useState, type ReactNode, type RefObject } from "react";
import { useTranslation } from "../i18n/react";
import { useBackToClose } from "./useBackToClose";
import { useFocusTrap } from "./useFocusTrap";
import { useModalDialog } from "./useModalDialog";
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
  /** What the perforation, Escape and Back do. */
  onClose: () => void;
  /** Escape's own answer, where it steps back inside the sheet before it closes it. */
  onEscape?: () => void;
  /** Its act is on its way: the sheet stays up, and Back keeps its place so it can try again. */
  busy?: boolean;
  /**
   * What stays live around the sheet while it's open, for a sheet in a layer of its own (with a scrim
   * to tap, or a screen that closes it). The rest of the page goes inert.
   */
  layer?: RefObject<HTMLElement | null>;
  className?: string;
  children: ReactNode;
}

/**
 * A modal bottom sheet on the Liner: the page behind it is inert and focus stays inside while it's
 * open, and Escape, Back and its perforation row (drag it down or tap it) close it, so no caller has
 * to remember them.
 */
export function Sheet({
  label,
  open = true,
  onClose,
  onEscape,
  busy = false,
  layer,
  className,
  children,
}: Props) {
  const { t } = useTranslation();
  const ref = useRef<HTMLDivElement>(null);
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
  // The perforation, Escape and Back all close it, and all refuse while its act is on its way.
  const close = () => {
    if (!busy) onClose();
  };
  // The page comes back from inert before the trap gives focus back to it, so this goes first.
  useModalDialog(ref, { layer, active: open });
  useFocusTrap(ref, { active: open, onEscape: onEscape ?? close });
  useBackToClose(open, () => {
    close();
    return !busy;
  });
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
    close();
  };

  const leaving = !open;
  return (
    <div
      ref={ref}
      className={["bottom-sheet", leaving && "is-leaving", className].filter(Boolean).join(" ")}
      role="dialog"
      aria-label={label}
      tabIndex={-1}
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
        aria-disabled={busy || undefined}
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
          else close();
        }}
      />
      {children}
    </div>
  );
}
