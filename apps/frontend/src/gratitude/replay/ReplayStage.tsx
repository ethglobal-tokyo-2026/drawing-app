import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import "./replay-stage.css";

/** How long the stage takes to ease open, and shut, ms. */
export const STAGE_EASE_MS = 200;
/** The --ease-out curve, spelled out: Web Animations can't read CSS variables. */
export const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * Eases the stage open or shut, on its height and opacity. An ease caught mid-way turns back from
 * where it is. It clips only while it moves, so a landing can fly out of it into its card.
 */
function ease(frame: HTMLElement, opening: boolean) {
  const moving = frame.getAnimations()[0];
  if (moving) {
    moving.reverse();
    return;
  }
  const shut = { height: "0px", opacity: 0, clipPath: "inset(0)" };
  const full = { height: `${frame.scrollHeight}px`, opacity: 1, clipPath: "inset(0)" };
  frame.animate(opening ? [shut, full] : [full, shut], {
    duration: STAGE_EASE_MS,
    easing: EASE_OUT,
    // Holds shut until it's gone, and so does an open turned back mid-way.
    fill: opening ? "backwards" : "forwards",
  });
}

interface Props {
  /** Open while a replay loads, plays or holds its landing; turning false eases it shut. */
  open: boolean;
  reduced: boolean;
  /** Where the replay's engine builds its stage. */
  host: RefObject<HTMLDivElement | null>;
  /** Where focus goes when the stage shuts while holding it. */
  returnFocus: () => HTMLElement | null;
}

/**
 * The stage a gratitude replay plays on, grown inside its card between the card's figures and its
 * fine print. It holds no words and no controls, so any card can host it.
 */
export function ReplayStage({ open, reduced, host, returnFocus }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [wasOpen, setWasOpen] = useState(open);
  const [shutting, setShutting] = useState(false);
  if (open !== wasOpen) {
    setWasOpen(open);
    setShutting(!open);
  }

  // It eases when it opens or shuts, not whenever its card renders: these are read, not watched.
  const latest = useRef({ reduced, returnFocus });
  useLayoutEffect(() => {
    latest.current = { reduced, returnFocus };
  });

  useLayoutEffect(() => {
    const el = frame.current;
    if (!el) return;
    // It's aria-hidden, so focus left in it would be lost as it goes.
    if (!open && el.contains(document.activeElement))
      latest.current.returnFocus()?.focus({ preventScroll: true });
    if (!latest.current.reduced) ease(el, open);
  }, [open]);

  // Shut, it stays for its ease; under reduced motion, only until the next task.
  useEffect(() => {
    if (!shutting) return;
    const gone = setTimeout(() => setShutting(false), reduced ? 0 : STAGE_EASE_MS);
    return () => clearTimeout(gone);
  }, [shutting, reduced]);

  // Once open, all of it comes into view: a replay below the fold would play unseen.
  useEffect(() => {
    if (!open) return;
    const shown = setTimeout(
      () =>
        frame.current?.scrollIntoView({ block: "nearest", behavior: reduced ? "auto" : "smooth" }),
      reduced ? 0 : STAGE_EASE_MS,
    );
    return () => clearTimeout(shown);
  }, [open, reduced]);

  if (!open && !shutting) return null;
  return (
    <div ref={frame} className="replay-stage" aria-hidden="true">
      <div ref={host} className="replay-stage__host" tabIndex={-1} />
    </div>
  );
}
