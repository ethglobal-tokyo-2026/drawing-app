import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { PullTab } from "../giving/GiftBag";
import {
  PULL,
  atRest,
  autoTear,
  keyTear,
  snapped,
  springStep,
  tearTarget,
  ticksBetween,
} from "./pullTab";

interface Physics {
  tear: number;
  velocity: number;
  target: number;
  /** The one pointer dragging, where it started and the tear then. */
  drag: { pointerId: number; x: number; tear: number } | null;
  /** A press on the bag that tears it by itself once it's held long enough. */
  hold: { pointerId: number; x: number; y: number; timer: ReturnType<typeof setTimeout> } | null;
  lastTap: number;
  frame: number;
  last: number;
  torn: boolean;
  /** The bag the tear is written onto, while it's on screen. */
  bag: HTMLDivElement | null;
}

const ARROWS = new Set(["ArrowRight", "ArrowUp", "ArrowLeft", "ArrowDown"]);
const isArrow = (key: string): key is Parameters<typeof keyTear>[1] => ARROWS.has(key);

/**
 * The pull tab, worked by a drag along the strip, a press and hold or a double-tap on the bag, or
 * the slider's keys, through pullTab.ts's physics. `onSnap` runs once, when the tab tears free.
 * Under reduced motion the tear follows the finger with no spring, ticks or hint.
 *
 * The tear and the strip's shiver change every frame of a pull, so they're written onto the bag
 * (`holdBag`) as they move, and React hears of the tear only once it snaps.
 */
export function usePullTab({ reduced, onSnap }: { reduced: boolean; onSnap: () => void }) {
  const [tear, setTear] = useState(0);
  const [grip, setGrip] = useState<PullTab["grip"]>(null);
  const [hinting, setHinting] = useState(true);
  const latestSnap = useRef(onSnap);
  useLayoutEffect(() => {
    latestSnap.current = onSnap;
  });
  const physics = useRef<Physics>({
    tear: 0,
    velocity: 0,
    target: 0,
    drag: null,
    hold: null,
    lastTap: -Infinity,
    frame: 0,
    last: 0,
    torn: false,
    bag: null,
  });
  const holdBag = useCallback((el: HTMLDivElement | null) => {
    physics.current.bag = el;
  }, []);

  useEffect(() => {
    const p = physics.current;
    return () => {
      cancelAnimationFrame(p.frame);
      if (p.hold) clearTimeout(p.hold.timer);
    };
  }, []);

  const show = (next: number) => {
    physics.current.tear = next;
    const el = physics.current.bag;
    if (!el) return;
    el.style.setProperty("--gift-tear", String(next));
    // The slider's value, for screen readers, follows the tear.
    const slider = el.querySelector("[role=slider]");
    const percent = String(Math.round(next * 100));
    if (slider && slider.getAttribute("aria-valuenow") !== percent) {
      slider.setAttribute("aria-valuenow", percent);
    }
  };

  /** Each tick shivers the strip; alternating names restart the shiver's animation. */
  const shiver = () => {
    const el = physics.current.bag;
    if (el) el.dataset.shiver = el.dataset.shiver === "a" ? "b" : "a";
  };

  const letGoOfBag = () => {
    const p = physics.current;
    if (p.hold) clearTimeout(p.hold.timer);
    p.hold = null;
  };

  const stopMoving = () => {
    const p = physics.current;
    cancelAnimationFrame(p.frame);
    p.frame = 0;
    p.last = 0;
    letGoOfBag();
  };

  const snap = () => {
    const p = physics.current;
    if (p.torn) return;
    p.torn = true;
    p.drag = null;
    stopMoving();
    show(1);
    setTear(1);
    setGrip(null);
    setHinting(false);
    latestSnap.current();
  };

  const step = (t: number) => {
    const p = physics.current;
    const dt = p.last ? t - p.last : 16;
    p.last = t;
    const moved = reduced
      ? { tear: p.target, velocity: 0 }
      : springStep(p.tear, p.velocity, p.target, dt);
    if (p.drag && !reduced && ticksBetween(p.tear, moved.tear) > 0) shiver();
    p.velocity = moved.velocity;
    show(moved.tear);
    if (p.drag && snapped(moved.tear)) return snap();
    if (p.drag || !atRest(moved.tear, moved.velocity, p.target)) {
      p.frame = requestAnimationFrame(step);
    } else {
      p.frame = 0;
      p.last = 0;
    }
  };

  const kick = () => {
    const p = physics.current;
    if (!p.frame) p.frame = requestAnimationFrame(step);
  };

  const tearByItself = () => {
    const p = physics.current;
    if (p.torn) return;
    stopMoving();
    p.drag = null;
    setGrip(null);
    setHinting(false);
    if (reduced) return snap();
    let start: number | undefined;
    const run = (t: number) => {
      if (p.torn) return;
      start ??= t;
      const next = autoTear(t - start);
      p.target = next;
      show(next);
      if (next < 1) p.frame = requestAnimationFrame(run);
      else snap();
    };
    p.frame = requestAnimationFrame(run);
  };

  // Only the dragging pointer ends the drag: its lift, its cancel or its lost capture.
  const release = (e: ReactPointerEvent) => {
    const p = physics.current;
    if (p.drag?.pointerId !== e.pointerId) return;
    e.stopPropagation();
    p.drag = null;
    setGrip(null);
    if (snapped(p.tear)) return snap();
    p.target = 0;
    kick();
  };

  const handlers: PullTab["handlers"] = {
    onPointerDown: (e) => {
      const p = physics.current;
      // One finger pulls: another on the tab meanwhile neither takes the drag nor ends it.
      if (p.torn || p.drag) return;
      // The bag's own press and hold is for presses off the tab.
      e.stopPropagation();
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // A synthetic pointer has nothing to capture; the drag still follows it.
      }
      stopMoving();
      p.drag = { pointerId: e.pointerId, x: e.clientX, tear: p.tear };
      p.target = p.tear;
      setHinting(false);
      setGrip("pull");
      delete p.bag?.dataset.shiver;
      kick();
    },
    onPointerMove: (e) => {
      const { drag } = physics.current;
      if (drag?.pointerId === e.pointerId) {
        physics.current.target = tearTarget(drag.tear, e.clientX - drag.x);
      }
    },
    onPointerUp: release,
    onPointerCancel: release,
    onLostPointerCapture: release,
    onKeyDown: (e) => {
      const p = physics.current;
      if (p.torn) return;
      if (isArrow(e.key)) {
        e.preventDefault();
        setHinting(false);
        p.target = keyTear(p.target, e.key);
        if (snapped(p.target)) return snap();
        kick();
      } else if (e.key === "Enter" || e.key === " " || e.key === "End") {
        e.preventDefault();
        tearByItself();
      }
    },
  };

  const isHolding = (e: ReactPointerEvent) => physics.current.hold?.pointerId === e.pointerId;

  /**
   * On the bag around the tab: press and hold, or double-tap, and it tears by itself. One finger
   * holds, as one pulls.
   */
  const stage = {
    onPointerDown: (e: ReactPointerEvent) => {
      const p = physics.current;
      if (p.torn || p.drag || p.hold) return;
      setHinting(false);
      setGrip("hold");
      p.hold = {
        pointerId: e.pointerId,
        x: e.clientX,
        y: e.clientY,
        timer: setTimeout(tearByItself, PULL.holdMs),
      };
    },
    onPointerMove: (e: ReactPointerEvent) => {
      const { hold } = physics.current;
      if (hold?.pointerId !== e.pointerId) return;
      if (Math.hypot(e.clientX - hold.x, e.clientY - hold.y) > PULL.holdSlopPx) {
        letGoOfBag();
        setGrip(null);
      }
    },
    onPointerUp: (e: ReactPointerEvent) => {
      const p = physics.current;
      if (!isHolding(e)) return;
      letGoOfBag();
      setGrip(null);
      const now = performance.now();
      if (now - p.lastTap < PULL.doubleTapMs) tearByItself();
      p.lastTap = now;
    },
    onPointerCancel: (e: ReactPointerEvent) => {
      if (!isHolding(e)) return;
      letGoOfBag();
      setGrip(null);
    },
  };

  return {
    /** The tear React knows of: 0 until it snaps, then 1. */
    tear,
    /** Goes on the bag's `ref`, so the tear can be written onto it as it moves. */
    holdBag,
    pullTab: { handlers, grip, hinting: hinting && !reduced } satisfies PullTab,
    stage,
  };
}
