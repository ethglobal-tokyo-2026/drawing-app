import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { formatNo } from "../stickers/format";
import { sheenIn, sweepSheen } from "../stickers/resinSheen";
import { playStick } from "../stickers/stick";
import { EASE_PEEL } from "../ui/easing";
import type { Placement } from "./placement";
import {
  dragBounds,
  normalizeTurn,
  passedSlop,
  pinchBy,
  scaleBy,
  stepBy,
  turnBy,
  type Pt,
  type Step,
} from "./boardGesture";
import type { BoardSticker } from "./boardSticker";
import { sizeOf, toFrac, toPx, transformAt, type Field } from "./placement";
import { focusStep, readingOrder } from "./stickerOrder";
import type { StickerTrayHandle } from "./tray/StickerTray";

interface Options {
  stage: RefObject<HTMLDivElement | null>;
  /** The stickers on the board. */
  stickers: readonly BoardSticker[];
  field: Field | null;
  size: { W: number; H: number } | null;
  selected: string | null;
  reduced: boolean;
  /** The sticker tray: a sticker let go over it goes back into its used sticker silhouette. */
  tray: RefObject<StickerTrayHandle | null>;
  onSelect: (id: string | null) => void;
  onOpen: (id: string) => void;
  /** Where a sticker was put; the board keeps it on top of the others. */
  onCommit: (id: string, placement: Placement) => void;
  /**
   * Takes a sticker off the board, back to the sticker tray, from `placement` when steps just moved
   * it: the board's stickers don't have that spot until React draws it.
   */
  onRemove: (id: string, placement?: Placement) => void;
  /** A run of steps, from keys or Arrange's tiles, gone quiet and saved: the last of them. */
  onStepsSettled?: (last: SettledStep) => void;
}

/** A sticker in hand: `drag` rides under the finger (or two), `handle` is resized or turned in place. */
export type Hold = { id: string; kind: "drag" | "handle" };

/** A sticker's spot while it's moving, in board pixels: its center, size and turn. */
type Live = { x: number; y: number; s: number; r: number };

/**
 * The last of a run of steps, once the run has gone quiet: whether it moved the sticker, or the
 * board's edge or a size limit stopped it. Nothing stops a turn.
 */
export type SettledStep =
  | { step: Step; moved: true }
  | { step: Exclude<Step, "turnLeft" | "turnRight">; moved: false };

const isTurn = (step: Step): step is "turnLeft" | "turnRight" =>
  step === "turnLeft" || step === "turnRight";
/** A step that changes a spot by less than this changed nothing. */
const STILL = 1e-3;
const stayed = (a: Live, b: Live) =>
  Math.abs(a.x - b.x) < STILL && Math.abs(a.y - b.y) < STILL && Math.abs(a.s - b.s) < STILL;

type Gesture =
  | { mode: "maybe"; id: string; el: HTMLElement; p0: Pt }
  | { mode: "drag"; id: string; el: HTMLElement; p0: Pt; b0: Live; live: Live }
  | { mode: "scale" | "rotate"; id: string; el: HTMLElement; from: Pt; b0: Live; live: Live }
  | {
      mode: "pinch";
      id: string;
      el: HTMLElement;
      /** The pointers it follows, where `start` has them; a third finger isn't one of them. */
      pair: [number, number];
      start: [Pt, Pt];
      b0: Live;
      live: Live;
    }
  | { mode: "bg"; p0: Pt };

/** A tap on bare board may wander this far and still deselect. */
const TAP_SLOP = 8;
/** Removed, a sticker rides to the tray's edge, this far in from the board's. */
const STOW_EDGE = 30;
/** The step each key takes on the selected sticker. */
const KEY_STEPS: Record<string, Step> = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
  "[": "turnLeft",
  "]": "turnRight",
  "-": "smaller",
  "=": "bigger",
  "+": "bigger",
};
/** Steps apply as they come, and save once they've been quiet this long. */
export const STEP_SAVE_IDLE_MS = 400;

const round = (v: number, places: number) => Number(v.toFixed(places));

/**
 * The board's pointer and key input. A held sticker's transform is written straight to its element
 * on every move; the board hears about it only when a gesture starts, when it's let go, and when a
 * sticker is tapped or keyed. `stow` is Remove: the sticker rides back into the sticker tray.
 *
 * The stickers take one Tab stop, `tabStop`, the one last focused. Focus alone doesn't select: the
 * arrow keys go between stickers until Enter or Space selects one, then they move it; Escape lets go.
 * `arrange` takes the same steps for a button: moving, turning or resizing needs no drag.
 */
export function useBoardGestures(options: Options) {
  const latest = useRef(options);
  useLayoutEffect(() => {
    latest.current = options;
  });
  const gesture = useRef<Gesture | null>(null);
  const [hold, setHold] = useState<Hold | null>(null);
  const [tabStop, setTabStop] = useState<string | null>(null);
  const stowing = useRef<(id: string) => void>(() => {});
  const arranging = useRef<(id: string, step: Step) => void>(() => {});

  useEffect(() => {
    const stage = options.stage.current;
    if (!stage) return;
    const pointers = new Map<number, Pt>();
    let origin = { left: 0, top: 0, k: 1 };

    const stickerOf = (id: string) => latest.current.stickers.find((s) => s.id === id);
    const liveOf = (p: Placement, field: Field): Live => ({ ...toPx(field, p), s: p.s, r: p.r });

    const local = (e: PointerEvent): Pt => ({
      x: (e.clientX - origin.left) / origin.k,
      y: (e.clientY - origin.top) / origin.k,
    });

    /** The first two fingers down, where they are now: a pinch's pair and its start. */
    const pairOf = (): { pair: [number, number]; start: [Pt, Pt] } => {
      const [[a, at], [b, bt]] = [...pointers.entries()];
      return { pair: [a, b], start: [at, bt] };
    };

    /** Puts the element where `live` says, without React. */
    const draw = (el: HTMLElement, sticker: BoardSticker, live: Live) => {
      const W = latest.current.size?.W ?? 0;
      const { w, h } = sizeOf(W, live.s, sticker);
      el.style.width = `${w}px`;
      el.style.height = `${h}px`;
      el.style.transform = transformAt(live.x, live.y, w, h, live.r);
    };

    /** Saves where `live` leaves the sticker, and returns that spot. */
    const commit = (el: HTMLElement, sticker: BoardSticker, live: Live): Placement | null => {
      const { field } = latest.current;
      if (!field) return null;
      const at = toFrac(field, live);
      const placement: Placement = {
        on: true,
        x: round(at.x, 4),
        y: round(at.y, 4),
        s: round(live.s, 4),
        r: round(normalizeTurn(live.r), 2),
        z: sticker.placement.z,
      };
      // Let go past the field's edge, it settles on the field; React draws the same when it catches up.
      draw(el, sticker, liveOf(placement, field));
      latest.current.onCommit(sticker.id, placement);
      return placement;
    };

    const focusSticker = (id: string) =>
      stage.querySelector<HTMLElement>(`[data-sticker-id="${CSS.escape(id)}"]`)?.focus();

    /** Steps on one sticker, drawn as they come and saved once, when they've been quiet. */
    let stepped: {
      id: string;
      el: HTMLElement;
      live: Live;
      last: SettledStep;
      timer: number;
    } | null = null;
    /** Saves the steps waiting, and returns where they left their sticker. */
    const saveSteps = () => {
      const s = stepped;
      if (!s) return null;
      stepped = null;
      clearTimeout(s.timer);
      const sticker = stickerOf(s.id);
      const placement = sticker && commit(s.el, sticker, s.live);
      return placement ? { id: s.id, placement } : null;
    };
    /** Steps gone quiet: saved, and the last of them told. */
    const settle = () => {
      const last = stepped?.last;
      saveSteps();
      if (last) latest.current.onStepsSettled?.(last);
    };
    const step = (id: string, by: Step) => {
      const { field } = latest.current;
      const sticker = stickerOf(id);
      const el = stage.querySelector<HTMLElement>(`[data-sticker-id="${CSS.escape(id)}"]`);
      if (!field || !sticker || !el || leaving.has(id)) return;
      if (stepped && stepped.id !== id) saveSteps();
      const from = stepped?.live ?? liveOf(sticker.placement, field);
      const next = stepBy(from, by);
      // Past the field's edge it holds at the edge, as a drag does.
      const live = { ...next, ...toPx(field, toFrac(field, next)) };
      draw(el, sticker, live);
      if (stepped) clearTimeout(stepped.timer);
      const last: SettledStep =
        isTurn(by) || !stayed(from, live) ? { step: by, moved: true } : { step: by, moved: false };
      stepped = { id, el, live, last, timer: window.setTimeout(settle, STEP_SAVE_IDLE_MS) };
    };
    arranging.current = step;

    /** The backing shows for a moment where a sticker was peeled up. */
    const peelMark = (sticker: BoardSticker, live: Live) => {
      if (latest.current.reduced) return;
      const { w, h } = sizeOf(latest.current.size?.W ?? 0, live.s, sticker);
      const mark = document.createElement("span");
      mark.className = "peel-mark";
      mark.style.width = `${w}px`;
      mark.style.height = `${h}px`;
      mark.style.transform = transformAt(live.x, live.y, w, h, live.r);
      mark.style.setProperty("--m", `url("${sticker.urls.mask}")`);
      stage.prepend(mark);
      const remove = () => mark.remove();
      mark
        .animate([{ opacity: 1 }, { opacity: 1, offset: 0.35 }, { opacity: 0 }], {
          duration: 1500,
          easing: "ease-out",
        })
        .finished.then(remove, remove);
    };

    const startHold = (g: Gesture) => {
      if (g.mode === "maybe" || g.mode === "bg") return;
      setHold({ id: g.id, kind: g.mode === "drag" || g.mode === "pinch" ? "drag" : "handle" });
    };
    const release = (id: string) => setHold((held) => (held?.id === id ? null : held));

    /** A tap back on the board: an open tray closes, so it isn't in the way. */
    const closeTray = () => {
      const tray = latest.current.tray.current;
      if (tray?.isOpen) void tray.close();
    };

    /** Whether the tray took a sticker back into its used sticker silhouette. */
    const intoTray = async (id: string, at: Pt) => {
      const tray = latest.current.tray.current;
      if (!tray) return false;
      try {
        return await tray.boardDrop(id, at);
      } catch (error) {
        const sticker = stickerOf(id);
        console.error(
          `The sticker tray couldn't take ${sticker ? formatNo(sticker.no) : id} back, so it stays on the board`,
          error,
        );
        return false;
      }
    };

    /**
     * Stickers on their way into the tray. Until it has them they take no new press or key, so nothing
     * put down meanwhile is undone when they land.
     */
    const leaving = new Set<string>();

    /** A dragged sticker let go: still in hand, above the tray, until the tray says whether it's taking it. */
    const dropHeld = async (g: Extract<Gesture, { mode: "drag" }>) => {
      leaving.add(g.id);
      const into = await intoTray(g.id, g.live);
      leaving.delete(g.id);
      release(g.id);
      if (into) return;
      const sticker = stickerOf(g.id);
      if (!sticker) return;
      commit(g.el, sticker, g.live);
      const lift = g.el.querySelector<HTMLElement>(".placed-sticker__lift");
      // Under reduced motion it's simply there: it was never out of sight.
      if (lift && !latest.current.reduced) void playStick(lift, { reduced: false });
    };

    /**
     * Remove: the sticker peels up, rides to the tray's edge, and the tray takes it into its used
     * sticker silhouette.
     */
    let stowingId: string | null = null;
    const stow = async (id: string) => {
      const saved = saveSteps();
      const { field, size, reduced } = latest.current;
      const sticker = stickerOf(id);
      if (!sticker || !field || !size || stowingId || leaving.has(id)) return;
      // Focus on it or its toolbar goes to the next sticker along rather than falling to the page.
      const focused = stage.ownerDocument.activeElement;
      if (
        focused instanceof HTMLElement &&
        (focused.closest(".sticker-toolbar") ||
          focused.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId === id)
      ) {
        const order = readingOrder(
          latest.current.stickers.map((s) => ({ id: s.id, ...toPx(field, s.placement) })),
        );
        const i = order.indexOf(id);
        const next = [...order.slice(i + 1), ...order.slice(0, i).reverse()].find(
          (other) => !leaving.has(other),
        );
        if (next) focusSticker(next);
      }
      latest.current.onSelect(null);
      const el = stage.querySelector<HTMLElement>(`[data-sticker-id="${CSS.escape(id)}"]`);
      if (!latest.current.tray.current || !el) {
        latest.current.onRemove(id, saved?.id === id ? saved.placement : undefined);
        return;
      }
      stowingId = id;
      leaving.add(id);
      // The steps just saved aren't in the stickers until React draws them, so it peels from them.
      const from = liveOf(saved?.id === id ? saved.placement : sticker.placement, field);
      peelMark(sticker, from);
      const { w, h } = sizeOf(size.W, from.s, sticker);
      const to = {
        x: size.W - STOW_EDGE,
        y: Math.min(size.H - 90, Math.max(field.top + 40, from.y)),
      };
      const at = (c: Pt, k = 1) => `${transformAt(c.x, c.y, w, h, from.r)} scale(${k})`;
      setHold({ id, kind: "drag" });
      if (!reduced)
        await Promise.allSettled([
          el.animate(
            [
              { transform: at(from) },
              { transform: at({ x: from.x, y: from.y - 10 }, 1.05), offset: 0.25 },
              { transform: at(to, 0.9) },
            ],
            { duration: 340, easing: EASE_PEEL, fill: "forwards" },
          ).finished,
        ]);
      el.style.transform = at(to, 0.9);
      for (const a of el.getAnimations()) a.cancel();
      const into = await intoTray(id, to);
      stowingId = null;
      leaving.delete(id);
      release(id);
      if (!into) latest.current.onRemove(id);
    };
    stowing.current = (id) => void stow(id);

    /** A sticker a pointer picked: selected, and focused so the arrow keys reach it, with no ring. */
    const pick = (id: string, el: HTMLElement) => {
      if (latest.current.selected !== id) latest.current.onSelect(id);
      el.focus({ preventScroll: true, focusVisible: false });
    };

    const onDown = (e: PointerEvent) => {
      const { field, selected } = latest.current;
      if (e.button > 0 || !field || !(e.target instanceof Element)) return;
      // The toolbar's labels take their own presses.
      if (e.target.closest(".sticker-toolbar")) return;
      saveSteps();
      if (pointers.size === 0) {
        const r = stage.getBoundingClientRect();
        origin = { left: r.left, top: r.top, k: r.width / (stage.offsetWidth || r.width || 1) };
      }
      const el = e.target.closest<HTMLElement>(".placed-sticker");
      const id = el?.dataset.stickerId;
      if (id && leaving.has(id)) {
        e.preventDefault();
        return;
      }
      const pt = local(e);
      pointers.set(e.pointerId, pt);
      const handle = e.target.closest<HTMLElement>("[data-handle]")?.dataset.handle;
      // A second finger pinches the sticker in hand, or else the selected one.
      const inHand = gesture.current?.mode === "bg" ? null : gesture.current;
      const pinchId = inHand?.id ?? (selected && !leaving.has(selected) ? selected : null);
      const pinched = pinchId ? stickerOf(pinchId) : undefined;
      const pinchEl =
        inHand?.el ??
        (pinchId
          ? stage.querySelector<HTMLElement>(`[data-sticker-id="${CSS.escape(pinchId)}"]`)
          : null);
      if (pointers.size === 2 && pinched && pinchEl) {
        const b0 = inHand && "live" in inHand ? inHand.live : liveOf(pinched.placement, field);
        pick(pinched.id, pinchEl);
        gesture.current = { mode: "pinch", id: pinched.id, el: pinchEl, ...pairOf(), b0, live: b0 };
      } else if (pointers.size > 1) {
        return;
      } else if (el && id && handle && selected === id) {
        const sticker = stickerOf(id);
        if (!sticker) return;
        const b0 = liveOf(sticker.placement, field);
        const mode = handle === "rotate" ? "rotate" : "scale";
        gesture.current = { mode, id, el, from: pt, b0, live: b0 };
      } else if (el && id) {
        gesture.current = { mode: "maybe", id, el, p0: pt };
      } else {
        gesture.current = { mode: "bg", p0: pt };
      }
      startHold(gesture.current);
      stage.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      const pt = local(e);
      pointers.set(e.pointerId, pt);
      const { field, size } = latest.current;
      let g = gesture.current;
      if (!g || g.mode === "bg" || !field || !size) return;
      const sticker = stickerOf(g.id);
      if (!sticker) return;
      if (g.mode === "maybe") {
        if (!passedSlop(g.p0, pt)) return;
        const b0 = liveOf(sticker.placement, field);
        g = gesture.current = { mode: "drag", id: g.id, el: g.el, p0: g.p0, b0, live: b0 };
        pick(g.id, g.el);
        startHold(g);
        peelMark(sticker, b0);
        // Picked up, it catches the light: a sheen sweeps across its resin.
        const sheen = sheenIn(g.el);
        if (sheen && !latest.current.reduced) sweepSheen(sheen);
      }
      if (g.mode === "drag") {
        // The finger may carry it over the header and the tray's edge; it settles on the field.
        const bounds = dragBounds(field, size.W, size.H);
        const x = Math.min(bounds.maxX, Math.max(bounds.minX, g.b0.x + pt.x - g.p0.x));
        const y = Math.min(bounds.maxY, Math.max(bounds.minY, g.b0.y + pt.y - g.p0.y));
        g.live = { ...g.b0, x, y };
        // Near its used sticker silhouette in the open tray, the tray draws it in.
        const snap = latest.current.tray.current?.boardDrag(g.id, g.live)?.snap;
        if (snap) {
          const { w, h } = sizeOf(size.W, g.live.s, sticker);
          g.el.style.transform = `${transformAt(snap.x, snap.y, w, h, snap.r)} scale(${snap.scale.toFixed(3)})`;
          return;
        }
      } else if (g.mode === "scale") {
        g.live = { ...g.b0, s: scaleBy(g.b0, g.from, pt, g.b0.s) };
      } else if (g.mode === "rotate") {
        g.live = { ...g.b0, r: turnBy(g.b0, g.from, pt, g.b0.r) };
      } else if (g.mode === "pinch") {
        const a = pointers.get(g.pair[0]);
        const b = pointers.get(g.pair[1]);
        if (!a || !b) return;
        const next = pinchBy(g.start, [a, b], g.b0);
        const at = toPx(field, toFrac(field, next));
        g.live = { ...next, ...at };
      }
      draw(g.el, sticker, g.live);
    };

    const onUp = (e: PointerEvent) => {
      if (!pointers.delete(e.pointerId)) return;
      const g = gesture.current;
      if (!g) return;
      // A pinch ends with its last finger. One of its pair lifting hands it to two fingers still down,
      // from where the sticker is, so it doesn't jump to the new pair's spread and turn.
      if (g.mode === "pinch" && pointers.size > 0) {
        if (g.pair.includes(e.pointerId) && pointers.size >= 2)
          gesture.current = { ...g, ...pairOf(), b0: g.live };
        return;
      }
      gesture.current = null;
      if (g.mode === "drag") {
        void dropHeld(g);
        return;
      }
      setHold(null);
      const tap = e.type === "pointerup";
      if (g.mode === "bg") {
        const pt = local(e);
        if (!tap || Math.hypot(pt.x - g.p0.x, pt.y - g.p0.y) >= TAP_SLOP) return;
        latest.current.onSelect(null);
        closeTray();
        // A press here doesn't move focus as it would on a page, so a focused sticker is let go of
        // here; otherwise the arrow keys would still move it.
        const focused = document.activeElement;
        if (focused instanceof HTMLElement && stage.contains(focused)) focused.blur();
        return;
      }
      if (g.mode === "maybe") {
        if (!tap) return;
        if (latest.current.selected === g.id) latest.current.onOpen(g.id);
        else pick(g.id, g.el);
        // Its toolbar mustn't sit under the tray.
        closeTray();
        return;
      }
      const sticker = stickerOf(g.id);
      if (sticker) commit(g.el, sticker, g.live);
    };

    const onKey = (e: KeyboardEvent) => {
      const { field, selected } = latest.current;
      if (!field || !(e.target instanceof Element)) return;
      const el = e.target.closest<HTMLElement>(".placed-sticker");
      const id = el?.dataset.stickerId;
      const sticker = id && stickerOf(id);
      if (!el || !sticker || leaving.has(sticker.id)) return;
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        saveSteps();
        if (selected === sticker.id) latest.current.onOpen(sticker.id);
        else latest.current.onSelect(sticker.id);
        return;
      }
      if (e.key === "Escape") {
        saveSteps();
        // The tray's spread, or the tray, goes before the sticker is let go of; focus stays on it.
        if (latest.current.tray.current?.escape()) {
          e.preventDefault();
          return;
        }
        if (selected) latest.current.onSelect(null);
        return;
      }
      if (selected !== sticker.id) {
        const points = latest.current.stickers.map((s) => ({
          id: s.id,
          ...toPx(field, s.placement),
        }));
        const next = focusStep(points, sticker.id, e.key);
        if (next === undefined) return;
        e.preventDefault();
        focusSticker(next);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        void stow(sticker.id);
        return;
      }
      const by = KEY_STEPS[e.key];
      if (!by) return;
      e.preventDefault();
      step(sticker.id, by);
    };

    const onBlur = (e: FocusEvent) => {
      if (!(e.relatedTarget instanceof Node) || !stage.contains(e.relatedTarget)) saveSteps();
    };

    // The sticker last focused, by any means, is the one Tab comes back to.
    const onFocus = (e: FocusEvent) => {
      if (!(e.target instanceof Element)) return;
      const id = e.target.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId;
      if (id) setTabStop(id);
    };

    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointermove", onMove);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    stage.addEventListener("keydown", onKey);
    stage.addEventListener("focusin", onFocus);
    // Focus leaving the board takes the steps not yet saved with it.
    stage.addEventListener("focusout", onBlur);
    return () => {
      saveSteps();
      stage.removeEventListener("focusout", onBlur);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      stage.removeEventListener("keydown", onKey);
      stage.removeEventListener("focusin", onFocus);
      stowing.current = () => {};
      arranging.current = () => {};
    };
  }, [options.stage]);

  const stow = useCallback((id: string) => stowing.current(id), []);
  const arrange = useCallback((id: string, by: Step) => arranging.current(id, by), []);
  return { hold, stow, arrange, tabStop };
}
