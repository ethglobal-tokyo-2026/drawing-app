// @vitest-environment happy-dom
import { act, useRef, type CSSProperties } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DevicePose } from "../stickers/light";
import { STILL_POSE } from "../stickers/lightMode";
import type { PiledSticker } from "./pileLayout";
import { usePilePlay, type PlayDay } from "./usePilePlay";

const motion = vi.hoisted(() => ({
  reduced: false,
  device: "phone-or-tablet" as "phone-or-tablet" | "desktop" | "unknown",
  permission: "granted" as "granted" | "denied" | "unasked" | "not-needed",
  pose: { beta: 47, gamma: 0, screenAngle: 0 } as DevicePose,
  lightListeners: new Set<(pose: DevicePose) => void>(),
  permissionListeners: new Set<() => void>(),
  useLight: vi.fn(),
}));
vi.mock("../stickers/light", () => ({
  useLight: motion.useLight,
  currentLight: () => motion.pose,
  subscribeLight: (listener: (pose: DevicePose) => void) => {
    motion.lightListeners.add(listener);
    return () => motion.lightListeners.delete(listener);
  },
}));
vi.mock("../ui/deviceForLight", () => ({ deviceForLight: () => motion.device }));
vi.mock("../ui/motionPermission", () => ({
  getMotionPermission: () => motion.permission,
  subscribeMotionPermission: (listener: () => void) => {
    motion.permissionListeners.add(listener);
    return () => motion.permissionListeners.delete(listener);
  },
}));
vi.mock("../ui/useReducedMotion", () => ({ useReducedMotion: () => motion.reduced }));

/** An 80-unit square sticker laid with its center at (x, y) from the heap's floor. */
function laidAt(id: string, x: number, y: number): PlayDay["laid"][number] {
  const spot: PiledSticker = {
    id,
    n: 0,
    x,
    y,
    r: 0,
    s: 1,
    w: 80,
    h: 80,
    tag: { x: 0, y: 0, w: 0, h: 0, r: 0 },
    tagClear: { x0: 0, y0: 0, x1: 0, y1: 0 },
  };
  return { pile: { sticker: { id } }, spot, shape: { w: 80, h: 80, poly: [] } };
}

/** A day 300 units down, with "a" at (80, 150) and "b" at (250, 150) in it. */
const DAY: PlayDay = { day: 1, height: 300, laid: [laidAt("a", 80, -150), laidAt("b", 250, -150)] };

const opened = vi.fn<(id: string) => void>();
function Pile({ active = true, days = [DAY] }: { active?: boolean; days?: PlayDay[] }) {
  const root = useRef<HTMLDivElement>(null);
  usePilePlay(root, { active, days, width: 360 });
  // happy-dom lays nothing out, so client px are pile units from the heap's top left.
  return (
    <div ref={root} className="sticker-pile" style={{ "--k": "1" } as CSSProperties}>
      {days.map(({ day, laid }) => (
        <ol key={day} className="pile-day__heap" data-day={day}>
          {laid.map(({ pile: { sticker } }) => (
            <li key={sticker.id} className="pile-sticker" data-pile-id={sticker.id}>
              <button
                type="button"
                className="pile-sticker__button"
                onClick={() => opened(sticker.id)}
              >
                <span className="pile-sticker__hit" />
              </button>
            </li>
          ))}
        </ol>
      ))}
    </div>
  );
}

let host: HTMLDivElement;
let root: Root;
const show = (props: Parameters<typeof Pile>[0] = {}) =>
  act(() => root.render(<Pile {...props} />));
function element(selector: string): HTMLElement {
  const found = host.querySelector<HTMLElement>(selector);
  if (!found) throw new Error(`The pile is missing ${selector}`);
  return found;
}
const pile = () => element(".sticker-pile");
const heap = () => element(".pile-day__heap");
const item = (id: string) => element(`[data-pile-id="${id}"]`);
const hit = (id: string) => element(`[data-pile-id="${id}"] .pile-sticker__hit`);

function pointer(type: string, x: number, y: number, on: EventTarget = document, pointerId = 1) {
  act(() => {
    on.dispatchEvent(
      new PointerEvent(type, {
        pointerId,
        pointerType: "touch",
        isPrimary: pointerId === 1,
        button: 0,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
}
/** A finger's move over sticker `id`, as a touch; whether it kept the page from scrolling. */
function touchMove(id: string, x: number, y: number): boolean {
  const target = hit(id);
  const event = new TouchEvent("touchmove", {
    touches: [new Touch({ identifier: 1, target, clientX: x, clientY: y })],
    bubbles: true,
    cancelable: true,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event.defaultPrevented;
}
const click = (id: string) =>
  act(() => {
    hit(id).dispatchEvent(new MouseEvent("click", { detail: 1, bubbles: true, cancelable: true }));
  });
/** Plays `count` frames at 60 a second. */
const frames = (count = 1) =>
  act(() => {
    vi.advanceTimersByTime((1000 / 60) * count);
  });
/** How far play has moved sticker `id` from where the pile laid it. */
function moveOf(id: string) {
  const [x = 0, y = 0, turn = 0] = (item(id).style.transform.match(/-?[\d.]+/g) ?? []).map(Number);
  return { x, y, turn };
}
/** Swipes sticker `id` sideways from (x, y) by `by`, a frame a step, and lets go. */
function swipe(id: string, x: number, y: number, by: number) {
  pointer("pointerdown", x, y, hit(id));
  for (let step = 1; step <= 4; step++) {
    if (step > 1) frames();
    if (!touchMove(id, x + (by * step) / 4, y)) throw new Error("The swipe didn't pick it up");
    pointer("pointermove", x + (by * step) / 4, y);
  }
  pointer("pointerup", x + by, y);
}
/** Shares a device pose that leans the pile all the way: -1, 0 or 1 across, and 0 or -1 up. */
const publish = (x: -1 | 0 | 1, y: -1 | 0) =>
  act(() => {
    motion.pose = { beta: y ? 0 : STILL_POSE.beta, gamma: 60 * x, screenAngle: 0 };
    for (const listener of motion.lightListeners) listener(motion.pose);
  });

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
    ],
  });
  motion.reduced = false;
  motion.device = "phone-or-tablet";
  motion.permission = "granted";
  motion.pose = { ...STILL_POSE };
  motion.useLight.mockClear();
  opened.mockClear();
  vi.stubGlobal(
    "ResizeObserver",
    class implements ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  show();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Explore's loose stickers", () => {
  it("open with a tap, a slow one too, and stay where they lie", () => {
    pointer("pointerdown", 80, 150, hit("a"));
    pointer("pointerup", 80, 150);
    click("a");
    pointer("pointerdown", 80, 150, hit("a"));
    frames(15);
    expect(item("a").dataset.playing).toBe("held");
    pointer("pointerup", 80, 150);
    click("a");
    expect(opened.mock.calls).toEqual([["a"], ["a"]]);
    frames(30);
    expect(moveOf("a")).toEqual({ x: 0, y: 0, turn: 0 });
  });

  it("scroll the page under a swipe up or down, and aren't picked up by it", () => {
    pointer("pointerdown", 80, 150, hit("a"));
    expect(touchMove("a", 82, 170)).toBe(false);
    frames(30);
    expect(item("a").dataset.playing).toBeUndefined();
  });

  it("are picked up by a sideways swipe at once, thrown on by it, and knock what they hit", () => {
    swipe("a", 80, 150, 60);
    click("a");
    expect(opened).not.toHaveBeenCalled();
    expect(item("a").dataset.playing).toBeUndefined();
    const letGo = moveOf("a").x;
    frames(150);
    expect(moveOf("a").x).toBeGreaterThan(letGo + 20);
    expect(moveOf("b").x).toBeGreaterThan(10);
    expect(item("a").dataset.moving).toBeUndefined();
  });

  it("are picked up by a held touch, to drag any way without scrolling the page", () => {
    pointer("pointerdown", 80, 150, hit("a"));
    frames(13);
    expect(item("a").dataset.playing).toBe("held");
    expect(touchMove("a", 80, 200)).toBe(true);
    pointer("pointermove", 80, 200);
    frames(20);
    expect(moveOf("a").y).toBeGreaterThan(30);
  });

  it("are caught by a touch while they slide", () => {
    swipe("a", 80, 150, 60);
    frames(2);
    pointer("pointerdown", 80 + moveOf("a").x, 150, hit("a"));
    expect(item("a").dataset.playing).toBe("held");
    pointer("pointerup", 80 + moveOf("a").x, 150);
    click("a");
    expect(opened).not.toHaveBeenCalled();
  });

  it.each(["pointercancel", "blur", "visibilitychange"])(
    "are let go on %s, and picked up again by the next swipe",
    (reason) => {
      pointer("pointerdown", 80, 150, hit("a"));
      touchMove("a", 92, 150);
      expect(item("a").dataset.playing).toBe("held");
      if (reason === "pointercancel") pointer("pointercancel", 92, 150);
      else if (reason === "blur")
        act(() => {
          window.dispatchEvent(new Event("blur"));
        });
      else {
        vi.spyOn(document, "hidden", "get").mockReturnValueOnce(true);
        act(() => {
          document.dispatchEvent(new Event("visibilitychange"));
        });
      }
      expect(item("a").dataset.playing).toBeUndefined();
      pointer("pointerdown", 80, 150, hit("a"));
      expect(touchMove("a", 92, 150)).toBe(true);
      expect(item("a").dataset.playing).toBe("held");
    },
  );

  it("stay where they stopped while the pile is put away and brought back", () => {
    swipe("a", 80, 150, 60);
    frames(150);
    const stopped = item("a").style.transform;
    expect(stopped).not.toBe("");
    show({ active: false });
    show({ active: true });
    frames(5);
    expect(item("a").style.transform).toBe(stopped);
  });

  it("go back to their spots when their day is laid out anew", () => {
    swipe("a", 80, 150, 60);
    frames(150);
    show({ days: [{ ...DAY, laid: [...DAY.laid, laidAt("c", 300, -60)] }] });
    expect(item("a").style.transform).toBe("");
    expect(item("b").style.transform).toBe("");
  });

  it("under reduced motion, stop where they're let go, and the pile doesn't lean", () => {
    motion.reduced = true;
    show();
    expect(motion.useLight).toHaveBeenLastCalledWith(false);
    swipe("a", 80, 150, 60);
    const letGo = moveOf("a");
    frames(60);
    expect(moveOf("a")).toEqual(letGo);
    publish(1, -1);
    expect(heap().style.translate).toBe("0px 0px");
  });
});

describe("Explore's pile leaning with the device", () => {
  it.each([
    ["phone-or-tablet", "granted", "6px -4px"],
    ["phone-or-tablet", "not-needed", "6px -4px"],
    ["phone-or-tablet", "denied", "0px 0px"],
    ["phone-or-tablet", "unasked", "0px 0px"],
    ["desktop", "granted", "0px 0px"],
    ["unknown", "granted", "0px 0px"],
  ] as const)(
    "follows only permitted real-device tilt: %s / %s",
    (device, permission, expected) => {
      motion.device = device;
      motion.permission = permission;
      show();
      publish(1, -1);
      expect(motion.useLight).toHaveBeenLastCalledWith(expected !== "0px 0px");
      expect(heap().style.translate).toBe(expected);
    },
  );

  it("holds still through any touch, one let go outside the pile too, then follows again", () => {
    publish(1, 0);
    pointer("pointerdown", 0, 0, pile());
    publish(-1, -1);
    expect(heap().style.translate).toBe("6px 0px");
    pointer("pointerup", 0, 0);
    expect(heap().style.translate).toBe("-6px -4px");
  });

  it("holds still while a keyboard focuses a sticker, and follows permission changes", () => {
    const button = element(".pile-sticker__button");
    vi.spyOn(button, "matches").mockImplementation((selector) => selector === ":focus-visible");
    act(() => button.focus());
    publish(1, -1);
    expect(heap().style.translate).toBe("0px 0px");
    act(() => button.blur());
    publish(1, -1);
    expect(heap().style.translate).toBe("6px -4px");
    motion.permission = "denied";
    act(() => {
      for (const listener of motion.permissionListeners) listener();
    });
    expect(heap().style.translate).toBe("0px 0px");
  });
});
