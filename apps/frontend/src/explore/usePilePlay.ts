import { useEffect, useState, useSyncExternalStore, type RefObject } from "react";
import type { Shape } from "../sticker-board/tray/sheetPacking";
import { currentLight, subscribeLight, useLight } from "../stickers/light";
import { screenLean } from "../stickers/lightMode";
import { deviceForLight } from "../ui/deviceForLight";
import { clamp } from "../ui/easing";
import { getMotionPermission, subscribeMotionPermission } from "../ui/motionPermission";
import { useReducedMotion } from "../ui/useReducedMotion";
import type { PiledSticker } from "./pileLayout";
import { PileWorld, type BodySpec } from "./pilePhysics";

/** A day's section of the pile, as StickerPile laid it out. */
export interface PlayDay {
  day: number;
  /** Its heap box's height, in pile units. */
  height: number;
  laid: readonly { pile: { sticker: { id: string } }; spot: PiledSticker; shape: Shape }[];
}

interface Options {
  active: boolean;
  days: readonly PlayDay[];
  /** The pile's width in units, from pileFit. */
  width: number;
}

type Device = ReturnType<typeof deviceForLight>;

/** A touch held still this long picks its sticker up, to drag it any way. */
const HOLD_MS = 200;
/** A press that moves this far, in px, is decided: sideways picks its sticker up, up or down scrolls. */
const SLOP_PX = 8;
/** A throw takes the finger's speed over its last this long; a finger still for longer sets it down. */
const THROW_WINDOW_MS = 80;
/** A browser's click after a drag's release, this soon, doesn't open the sticker. */
const CLICK_AFTER_RELEASE_MS = 600;
/** Picked-up stickers stack from here: over every sticker as laid, under a focused one. */
const RAISED_Z = 1000;

interface Section {
  signature: string;
  world: PileWorld;
  specs: Map<string, BodySpec>;
  /** Its stickers' elements, as they're first moved. */
  items: Map<string, HTMLElement>;
}

/** A press on a sticker that hasn't yet shown whether it picks the sticker up. */
interface Pressed {
  kind: "pressed";
  pointerId: number;
  mouse: boolean;
  /** Where it went down, in client px. */
  x: number;
  y: number;
  section: Section;
  id: string;
  item: HTMLElement;
  timer: number;
}

/** A sticker under the finger. */
interface Held {
  kind: "held";
  pointerId: number;
  section: Section;
  id: string;
  item: HTMLElement;
  heap: HTMLElement;
  /** The heap's box and the pile's scale, to read the finger in pile units. */
  box: DOMRect;
  k: number;
  /** Where the finger picked it up, in client px, and whether it has moved off since. */
  x: number;
  y: number;
  moved: boolean;
  /** The finger's recent places, in pile units. */
  samples: { t: number; x: number; y: number }[];
}

const signatureOf = (day: PlayDay, width: number) =>
  `${width}:${day.height}:${day.laid.map(({ pile }) => pile.sticker.id).join(" ")}`;

/** A sticker with no cut line is its image's box. */
const WHOLE_IMAGE: readonly (readonly [number, number])[] = [
  [0, 0],
  [1, 0],
  [1, 1],
  [0, 1],
];

/**
 * A sticker's name tags' corners, around its image's center before its turn: they hang off the cut,
 * turned on their own, and the section's edges keep them in as they keep in its cut.
 */
function tagCorners({ x, y, r, tag }: PiledSticker): (readonly [number, number])[] {
  const turn = (tag.r * Math.PI) / 180;
  const back = (-r * Math.PI) / 180;
  const midX = tag.x + tag.w / 2 - x;
  const midY = tag.y + tag.h / 2 - y;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([sx, sy]) => {
    const dx = (sx * tag.w) / 2;
    const dy = (sy * tag.h) / 2;
    const px = midX + dx * Math.cos(turn) - dy * Math.sin(turn);
    const py = midY + dx * Math.sin(turn) + dy * Math.cos(turn);
    return [px * Math.cos(back) - py * Math.sin(back), px * Math.sin(back) + py * Math.cos(back)];
  });
}

function specsOf({ height, laid }: PlayDay): BodySpec[] {
  return laid.map(({ pile, spot, shape }) => ({
    id: pile.sticker.id,
    x: spot.x,
    y: height + spot.y,
    turn: spot.r,
    outline: (shape.poly.length > 2 ? shape.poly : WHOLE_IMAGE).map(
      ([u, v]) => [(u - 0.5) * spot.w, (v - 0.5) * spot.h] as const,
    ),
    extent: spot.tag.w > 0 ? tagCorners(spot) : undefined,
  }));
}

/**
 * The finger's speed as it let go, in pile units a second, or null when its moves don't tell: it had
 * stopped first, or its last move came late, and the sticker slides on as the drag left it. A slow
 * device's moves can come further apart than the window, so the move before the last counts too.
 */
function throwOf(samples: Held["samples"], now: number) {
  const last = samples.at(-1);
  if (!last || now - last.t > THROW_WINDOW_MS) return null;
  const inWindow = samples.findIndex((s) => last.t - s.t <= THROW_WINDOW_MS);
  const first = samples[Math.min(inWindow, samples.length - 2)] ?? last;
  const seconds = (last.t - first.t) / 1000;
  return seconds > 0 ? { x: (last.x - first.x) / seconds, y: (last.y - first.y) / seconds } : null;
}

const round = (n: number) => Math.round(n * 100) / 100;

/** Leans every day's heap; its own translation, which no sticker or tag inherits to recalculate. */
function lean(pile: HTMLElement, x: number, y: number) {
  const by = `${x}px ${y}px`;
  for (const heap of pile.querySelectorAll<HTMLElement>(".pile-day__heap")) {
    heap.style.setProperty("translate", by);
  }
}

/** Takes a sticker back to where the pile laid it. */
function unplay(item: HTMLElement) {
  item.style.removeProperty("transform");
  item.style.removeProperty("--raised");
  delete item.dataset.playing;
  delete item.dataset.moving;
}

/**
 * Explore's loose stickers: each day's section is a table they lie on (pilePhysics). A sideways
 * swipe picks a sticker up at once, a held touch picks it up to drag any way, and up or down
 * scrolls; let go, it's thrown at the finger's speed and stays where it stops. A touch catches a
 * sticker still sliding. The heaps lean with permitted device tilt, held still while touched.
 */
class PilePlay {
  private days: readonly PlayDay[] = [];
  private width = 0;
  private readonly sections = new Map<number, Section>();
  private raised = RAISED_Z;
  private press: Pressed | Held | null = null;
  private suppressed: { item: HTMLElement; until: number } | null = null;
  private pile: HTMLElement | null = null;
  private frame = 0;
  private last = 0;
  private reduced = false;
  private device: Device = "unknown";
  private readonly pointers = new Set<number>();
  private keyboardFocused = false;

  layout(days: readonly PlayDay[], width: number) {
    this.days = days;
    this.width = width;
    for (const [day, section] of this.sections) {
      const laid = days.find((d) => d.day === day);
      if (laid && signatureOf(laid, width) === section.signature) continue;
      // Laid out anew, its stickers go to the spots the new layout gives them.
      if (this.press?.section === section) this.letGo();
      for (const item of section.items.values()) unplay(item);
      this.sections.delete(day);
    }
  }

  attach(pile: HTMLElement, active: boolean, reduced: boolean, device: Device): () => void {
    this.reduced = reduced;
    this.device = device;
    for (const { world } of this.sections.values()) world.reduced = reduced;
    const doc = pile.ownerDocument;
    const win = doc.defaultView;
    lean(pile, 0, 0);
    if (!active || !win) return () => {};
    this.pile = pile;
    const focused = doc.activeElement;
    this.keyboardFocused =
      focused instanceof Element && pile.contains(focused) && focused.matches(":focus-visible");
    const off = new AbortController();
    const { signal } = off;
    doc.addEventListener("pointerdown", this.onDown, { signal });
    doc.addEventListener("pointermove", this.onMove, { signal });
    doc.addEventListener("pointerup", this.onUp, { signal });
    doc.addEventListener("pointercancel", this.onCancel, { signal });
    // Not passive, and in place before a touch starts, as iOS needs to let a held sticker stop the
    // page from scrolling.
    pile.addEventListener("touchmove", this.onTouchMove, { signal, passive: false });
    pile.addEventListener("contextmenu", this.onContextMenu, { signal });
    pile.addEventListener("focusin", this.onFocus, { signal });
    pile.addEventListener("focusout", this.onFocus, { signal });
    pile.addEventListener("keydown", this.onKey, { signal });
    doc.addEventListener("scroll", this.onScroll, { signal, capture: true });
    doc.addEventListener("visibilitychange", this.onVisibility, { signal });
    win.addEventListener("blur", this.onBlur, { signal });
    const resized = new ResizeObserver(this.onResize);
    resized.observe(pile);
    const stopLight = subscribeLight(this.applyTilt);
    const stopPermission = subscribeMotionPermission(this.applyTilt);
    this.applyTilt();
    if ([...this.sections.values()].some(({ world }) => world.moving)) this.loop();
    return () => {
      this.letGo();
      win.cancelAnimationFrame(this.frame);
      this.frame = 0;
      lean(pile, 0, 0);
      off.abort();
      resized.disconnect();
      stopLight();
      stopPermission();
      this.pointers.clear();
      this.pile = null;
    };
  }

  /** Always listening, so a click a browser sends after a drag never opens its sticker. */
  readonly onClick = (event: MouseEvent) => {
    const skip = this.suppressed;
    this.suppressed = null;
    const item = event.target instanceof Element ? event.target.closest(".pile-sticker") : null;
    // A keyboard's or assistive tech's click has no detail, and always opens the sticker.
    if (event.detail === 0 || skip?.item !== item || performance.now() > skip.until) return;
    event.preventDefault();
    event.stopImmediatePropagation();
  };

  private readonly applyTilt = () => {
    const pile = this.pile;
    if (!pile || this.pointers.size || this.keyboardFocused) return;
    const answer = getMotionPermission();
    if (
      pile.ownerDocument.hidden ||
      this.reduced ||
      this.device !== "phone-or-tablet" ||
      (answer !== "granted" && answer !== "not-needed")
    ) {
      lean(pile, 0, 0);
      return;
    }
    const { x, y } = screenLean(currentLight());
    lean(
      pile,
      clamp(Number.isFinite(x) ? x : 0, -1, 1) * 6,
      clamp(Number.isFinite(y) ? y : 0, -1, 1) * 4,
    );
  };

  private readonly onDown = (event: PointerEvent) => {
    this.pointers.add(event.pointerId);
    this.keyboardFocused = false;
    if (this.press) {
      // A second finger pinches or scrolls; a sticker already held stays held.
      if (this.press.kind === "pressed") this.drop();
      return;
    }
    // A browser can leave out the click after a drag: a fresh press is a fresh tap.
    this.suppressed = null;
    if (!event.isPrimary || event.button !== 0) return;
    const item =
      event.target instanceof Element && this.pile?.contains(event.target)
        ? event.target.closest<HTMLElement>(".pile-sticker")
        : null;
    const heap = item?.parentElement;
    const id = item?.dataset.pileId;
    // Stickers still falling in can't be picked up yet.
    if (!item || !heap || !id || heap.querySelector("[data-falling]")) return;
    const section = this.section(Number(heap.dataset.day));
    if (!section) return;
    // A sticker still sliding is caught, and a catch never opens it.
    if (section.world.isMoving(id)) {
      this.grab(event.pointerId, event.clientX, event.clientY, section, id, item, true);
      return;
    }
    this.press = {
      kind: "pressed",
      pointerId: event.pointerId,
      mouse: event.pointerType === "mouse",
      x: event.clientX,
      y: event.clientY,
      section,
      id,
      item,
      timer: window.setTimeout(this.onHeld, HOLD_MS),
    };
  };

  private readonly onHeld = () => {
    const press = this.press;
    if (press?.kind === "pressed")
      this.grab(press.pointerId, press.x, press.y, press.section, press.id, press.item, false);
  };

  private readonly onMove = (event: PointerEvent) => {
    if (this.press?.pointerId !== event.pointerId) return;
    if (this.press.kind === "pressed") this.decide(event.clientX, event.clientY);
    else this.drag(event.clientX, event.clientY);
  };

  private readonly onTouchMove = (event: TouchEvent) => {
    if (this.press?.kind === "pressed") {
      const touch = event.touches.length === 1 ? event.touches[0] : null;
      if (touch) this.decide(touch.clientX, touch.clientY);
      else this.drop();
    }
    if (this.press?.kind === "held" && event.cancelable) event.preventDefault();
  };

  private readonly onUp = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    if (this.press?.pointerId === event.pointerId) {
      // Let go of a sticker it's thrown; a press that never picked one up was a tap, which opens it.
      if (this.press.kind === "held") this.release(true);
      else this.drop();
    }
    this.applyTilt();
  };

  private readonly onCancel = (event: PointerEvent) => {
    this.pointers.delete(event.pointerId);
    if (this.press?.pointerId === event.pointerId) this.letGo();
    this.applyTilt();
  };

  private readonly onContextMenu = (event: Event) => {
    if (this.press) event.preventDefault();
  };

  private readonly onFocus = (event: FocusEvent) => {
    const target = event.type === "focusout" ? event.relatedTarget : event.target;
    this.keyboardFocused =
      target instanceof Element &&
      !!this.pile?.contains(target) &&
      target.matches(":focus-visible");
    if (this.keyboardFocused) this.letGo();
    this.applyTilt();
  };

  private readonly onKey = () => {
    this.keyboardFocused = true;
    this.letGo();
  };

  private readonly onScroll = () => {
    const press = this.press;
    if (press?.kind === "pressed") this.drop();
    else if (press) press.box = press.heap.getBoundingClientRect();
  };

  private readonly onVisibility = () => {
    if (!this.pile?.ownerDocument.hidden) {
      this.applyTilt();
      return;
    }
    this.letGo();
    this.pointers.clear();
    lean(this.pile, 0, 0);
  };

  private readonly onBlur = () => {
    this.letGo();
    this.pointers.clear();
    if (this.pile) lean(this.pile, 0, 0);
  };

  private readonly onResize = () => {
    this.letGo();
    const k = this.scale();
    for (const section of this.sections.values()) {
      for (const id of section.items.keys()) this.paint(section, id, k);
    }
  };

  /** The section of `day`, its table set up the first time a sticker on it is touched. */
  private section(day: number): Section | null {
    const known = this.sections.get(day);
    if (known) return known;
    const laid = this.days.find((d) => d.day === day);
    if (!laid?.laid.length) return null;
    const specs = specsOf(laid);
    const world = new PileWorld(specs, this.width, laid.height);
    world.reduced = this.reduced;
    const section: Section = {
      signature: signatureOf(laid, this.width),
      world,
      specs: new Map(specs.map((spec) => [spec.id, spec])),
      items: new Map(),
    };
    this.sections.set(day, section);
    return section;
  }

  /** A press that has moved past the slop: sideways, or any way with a mouse, picks it up. */
  private decide(x: number, y: number) {
    const press = this.press;
    if (press?.kind !== "pressed") return;
    const dx = x - press.x;
    const dy = y - press.y;
    if (Math.hypot(dx, dy) <= SLOP_PX) return;
    if (!press.mouse && Math.abs(dy) >= Math.abs(dx)) {
      this.drop();
      return;
    }
    this.grab(press.pointerId, press.x, press.y, press.section, press.id, press.item, true);
    this.drag(x, y);
  }

  /**
   * Picks the sticker up by the point (x, y), in client px, and puts it on top of the pile. Set down
   * where it was picked up, without `moved`, it was a slow tap, and its click opens it.
   */
  private grab(
    pointerId: number,
    x: number,
    y: number,
    section: Section,
    id: string,
    item: HTMLElement,
    moved: boolean,
  ) {
    this.drop();
    const heap = item.parentElement;
    if (!heap || !item.isConnected) return;
    const box = heap.getBoundingClientRect();
    const k = this.scale();
    const at = { t: performance.now(), x: (x - box.left) / k, y: (y - box.top) / k };
    if (!section.world.grab(id, at.x, at.y)) return;
    section.items.set(id, item);
    item.dataset.playing = "held";
    item.style.setProperty("--raised", String(++this.raised));
    this.press = {
      kind: "held",
      pointerId,
      section,
      id,
      item,
      heap,
      box,
      k,
      x,
      y,
      moved,
      samples: [at],
    };
    this.loop();
  }

  /** Moves a held sticker's finger to (x, y), in client px. */
  private drag(x: number, y: number) {
    const press = this.press;
    if (press?.kind !== "held") return;
    press.moved ||= Math.hypot(x - press.x, y - press.y) > SLOP_PX;
    const at = {
      t: performance.now(),
      x: (x - press.box.left) / press.k,
      y: (y - press.box.top) / press.k,
    };
    press.section.world.drag(at.x, at.y);
    press.samples.push(at);
    while (at.t - press.samples[0].t > THROW_WINDOW_MS * 2) press.samples.shift();
    this.loop();
  }

  /** Lets go of a held sticker: thrown at the finger's speed, or with `thrown` false, as it moves. */
  private release(thrown: boolean) {
    const press = this.press;
    if (press?.kind !== "held") return;
    this.press = null;
    const now = performance.now();
    press.section.world.release(thrown ? throwOf(press.samples, now) : null);
    delete press.item.dataset.playing;
    if (press.moved) this.suppressed = { item: press.item, until: now + CLICK_AFTER_RELEASE_MS };
    this.loop();
  }

  /** Forgets a press that hasn't picked anything up. */
  private drop() {
    if (this.press?.kind !== "pressed") return;
    window.clearTimeout(this.press.timer);
    this.press = null;
  }

  private letGo() {
    if (this.press?.kind === "held") this.release(false);
    else this.drop();
  }

  private scale() {
    return parseFloat(this.pile?.style.getPropertyValue("--k") ?? "") || 1;
  }

  private loop() {
    const win = this.pile?.ownerDocument.defaultView;
    if (!win || this.frame) return;
    this.last = performance.now();
    this.frame = win.requestAnimationFrame(this.tick);
  }

  private readonly tick = (now: number) => {
    this.frame = 0;
    const win = this.pile?.ownerDocument.defaultView;
    if (!win) return;
    const seconds = Math.max(0, now - this.last) / 1000;
    this.last = now;
    const k = this.scale();
    let moving = false;
    for (const section of this.sections.values()) {
      if (!section.world.moving) continue;
      for (const id of section.world.step(seconds)) this.paint(section, id, k);
      if (section.world.moving) moving = true;
      else this.settle(section);
    }
    if (moving) this.frame = win.requestAnimationFrame(this.tick);
  };

  /** Moves a sticker's element to where its body is. */
  private paint(section: Section, id: string, k: number) {
    const spec = section.specs.get(id);
    const pose = section.world.pose(id);
    let item = section.items.get(id);
    // React may have put a new element in its place.
    if (!item?.isConnected) {
      item =
        this.pile?.querySelector<HTMLElement>(`.pile-sticker[data-pile-id="${CSS.escape(id)}"]`) ??
        undefined;
      if (item) section.items.set(id, item);
    }
    if (!spec || !pose || !item) return;
    item.style.transform = `translate(${round((pose.x - spec.x) * k)}px, ${round((pose.y - spec.y) * k)}px) rotate(${round(pose.turn - spec.turn)}deg)`;
    if (item.dataset.moving === undefined) item.dataset.moving = "";
  }

  /** The section has stopped: its stickers lose their layers. */
  private settle(section: Section) {
    for (const item of section.items.values()) delete item.dataset.moving;
  }
}

export function usePilePlay(
  root: RefObject<HTMLDivElement | null>,
  { active, days, width }: Options,
) {
  const reduced = useReducedMotion();
  const permission = useSyncExternalStore(subscribeMotionPermission, getMotionPermission);
  const device = deviceForLight(navigator);
  const allowed = permission === "granted" || permission === "not-needed";
  useLight(active && !reduced && device === "phone-or-tablet" && allowed);
  const [play] = useState(() => new PilePlay());

  useEffect(() => play.layout(days, width), [play, days, width]);

  useEffect(() => {
    const pile = root.current;
    if (!pile) return;
    pile.addEventListener("click", play.onClick, true);
    return () => pile.removeEventListener("click", play.onClick, true);
  }, [play, root]);

  useEffect(() => {
    const pile = root.current;
    return pile ? play.attach(pile, active, reduced, device) : undefined;
  }, [play, root, active, reduced, device]);
}
