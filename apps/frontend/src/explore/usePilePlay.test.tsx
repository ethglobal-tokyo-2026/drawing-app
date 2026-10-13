// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { LightPose } from "../stickers/light";
import { usePilePlay } from "./usePilePlay";

const motion = vi.hoisted(() => ({
  reduced: false,
  device: "phone-or-tablet" as "phone-or-tablet" | "desktop" | "unknown",
  permission: "granted" as "granted" | "denied" | "unasked" | "not-needed",
  pose: { x: 0, y: 0, rotationDegrees: 0 },
  lightListeners: new Set<(pose: LightPose) => void>(),
  permissionListeners: new Set<() => void>(),
  useLight: vi.fn(),
}));
vi.mock("../stickers/light", () => ({
  useLight: motion.useLight,
  currentLight: () => motion.pose,
  subscribeLight: (listener: (pose: LightPose) => void) => {
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

const firstLayout = {};
const opened = vi.fn();
const captured = vi.fn();
function Pile({ active = true, layout = firstLayout }: { active?: boolean; layout?: unknown }) {
  const root = useRef<HTMLDivElement>(null);
  usePilePlay(root, { active, layout });
  return (
    <div ref={root} className="sticker-pile">
      <ol className="pile-day__heap">
        <li className="pile-sticker">
          <button type="button" className="pile-sticker__button" onClick={opened}>
            <span className="pile-sticker__play">
              <span className="pile-sticker__drop">Sticker and name tags</span>
            </span>
          </button>
        </li>
      </ol>
    </div>
  );
}

interface Played {
  frames: Keyframe[];
  cancel: ReturnType<typeof vi.fn>;
  pause: ReturnType<typeof vi.fn>;
  play: ReturnType<typeof vi.fn>;
  finish: () => void;
}
let played: Played[];
let host: HTMLDivElement;
let root: Root;
let resized: () => void;
let hidden = false;
const show = (props: Parameters<typeof Pile>[0] = {}) =>
  act(() => root.render(<Pile {...props} />));
function element<T extends HTMLElement>(selector: string): T {
  const found = host.querySelector<T>(selector);
  if (!found) throw new Error(`The pile is missing ${selector}`);
  return found;
}
const pile = () => element<HTMLElement>(".sticker-pile");
const heap = () => element<HTMLElement>(".pile-day__heap");
const item = () => element<HTMLElement>(".pile-sticker");
const button = () => element<HTMLButtonElement>("button");
const wrapper = () => element<HTMLElement>(".pile-sticker__play");
const pointer = (type: string, x = 0, y = 0, id = 1, on: EventTarget = button()) =>
  act(() => {
    on.dispatchEvent(
      new PointerEvent(type, {
        pointerId: id,
        pointerType: "touch",
        clientX: x,
        clientY: y,
        button: 0,
        isPrimary: id === 1,
        bubbles: true,
        cancelable: true,
      }),
    );
  });
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const hold = () => {
  pointer("pointerdown");
  wait(320);
};
const publish = (x: number, y: number) =>
  act(() => {
    motion.pose = { x, y, rotationDegrees: 0 };
    for (const listener of motion.lightListeners) listener(motion.pose);
  });
const click = (detail = 1) =>
  act(() => {
    button().dispatchEvent(new MouseEvent("click", { detail, bubbles: true, cancelable: true }));
  });

beforeEach(() => {
  vi.useFakeTimers();
  played = [];
  hidden = false;
  motion.reduced = false;
  motion.device = "phone-or-tablet";
  motion.permission = "granted";
  motion.pose = { x: 0, y: 0, rotationDegrees: 0 };
  motion.useLight.mockClear();
  opened.mockClear();
  captured.mockClear();
  vi.spyOn(document, "hidden", "get").mockImplementation(() => hidden);
  vi.spyOn(Element.prototype, "setPointerCapture").mockImplementation(captured);
  vi.spyOn(Element.prototype, "hasPointerCapture").mockReturnValue(false);
  vi.stubGlobal(
    "ResizeObserver",
    class implements ResizeObserver {
      constructor(callback: ResizeObserverCallback) {
        resized = () => callback([], this);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.spyOn(Element.prototype, "animate").mockImplementation((frames) => {
    if (!Array.isArray(frames))
      throw new Error("The pile toss must supply a sequence of keyframes");
    let finish!: () => void;
    let reject!: (reason: Error) => void;
    const finished = new Promise<void>((resolve, no) => {
      finish = resolve;
      reject = no;
    });
    const cancel = vi.fn(() => reject(new Error("Animation cancelled")));
    const pause = vi.fn();
    const play = vi.fn();
    played.push({ frames, cancel, pause, play, finish });
    const animation = new Animation();
    Object.defineProperty(animation, "finished", { get: () => finished });
    animation.cancel = cancel;
    animation.pause = pause;
    animation.play = play;
    return animation;
  });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  show();
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("Explore's loose sticker play", () => {
  it("keeps a short tap as the existing preview action without capturing the pointer", () => {
    pointer("pointerdown");
    wait(180);
    pointer("pointerup");
    click();
    expect(opened).toHaveBeenCalledOnce();
    expect(captured).not.toHaveBeenCalled();
    expect(item().dataset.playing).toBeUndefined();
  });

  it("lets movement and page scrolling before pickup cancel the hold", () => {
    pointer("pointerdown");
    pointer("pointermove", 0, 25);
    wait(400);
    expect(item().dataset.playing).toBeUndefined();
    expect(captured).not.toHaveBeenCalled();
    pointer("pointerup");
    pointer("pointerdown");
    document.dispatchEvent(new Event("scroll"));
    wait(400);
    expect(item().dataset.playing).toBeUndefined();
  });

  it("picks up after a hold, follows the drag, suppresses its click and tosses back to rest", async () => {
    hold();
    expect(item().dataset.playing).toBe("held");
    expect(captured).toHaveBeenCalledOnce();
    pointer("pointermove", 30);
    wait(16);
    pointer("pointermove", 60);
    expect(wrapper().style.transform).toContain("60px");
    const menu = new Event("contextmenu", { bubbles: true, cancelable: true });
    button().dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(true);
    pointer("pointerup", 60);
    expect(item().dataset.playing).toBe("settling");
    click();
    expect(opened).not.toHaveBeenCalled();
    expect(played).toHaveLength(1);
    expect(played[0].frames.at(-1)?.transform).toBe("none");
    await act(async () => played[0].finish());
    expect(item().dataset.playing).toBeUndefined();
    expect(wrapper().style.transform).toBe("");
  });

  it.each(["pointercancel", "second pointer", "inactive", "layout", "resize", "hidden", "blur"])(
    "restores a held sticker on %s and permits a later tap",
    (reason) => {
      hold();
      pointer("pointermove", 40);
      expect(item().dataset.playing).toBe("held");
      if (reason === "pointercancel") pointer("pointercancel");
      else if (reason === "second pointer") {
        pointer("pointerdown", 0, 0, 2);
        pointer("pointerup", 0, 0, 2);
      } else if (reason === "inactive") {
        show({ active: false });
        show();
      } else if (reason === "layout") show({ layout: {} });
      else if (reason === "resize") resized();
      else if (reason === "blur") {
        window.dispatchEvent(new Event("blur"));
        window.dispatchEvent(new Event("focus"));
      } else {
        hidden = true;
        document.dispatchEvent(new Event("visibilitychange"));
        hidden = false;
        document.dispatchEvent(new Event("visibilitychange"));
      }
      pointer("pointerup");
      wait(800);
      expect(item().dataset.playing).toBeUndefined();
      expect(wrapper().style.transform).toBe("");
      expect(played).toHaveLength(0);
      pointer("pointerdown");
      pointer("pointerup");
      click();
      expect(opened).toHaveBeenCalledOnce();
    },
  );

  it("releases a settling animation when the old list detaches or the view hides", async () => {
    hold();
    pointer("pointermove", 40);
    pointer("pointerup", 40);
    const old = wrapper();
    item().remove();
    show({ active: false });
    expect(played[0].cancel).toHaveBeenCalledOnce();
    expect(old.style.transform).toBe("");
    await act(async () => played[0].finish());
    show();
    expect(pile().querySelector("[data-playing]")).toBeNull();
  });

  it("bounds a stalled settling animation and restores the sticker", () => {
    hold();
    pointer("pointermove", 40);
    pointer("pointerup", 40);
    wait(1000);
    expect(played[0].cancel).toHaveBeenCalledOnce();
    expect(item().dataset.playing).toBeUndefined();
  });

  it("holds a tossing sticker still for a new tap, then restores its preview origin before opening", () => {
    hold();
    pointer("pointermove", 40);
    pointer("pointerup", 40);
    click();
    pointer("pointerdown");
    expect(played[0].pause).toHaveBeenCalledOnce();
    pointer("pointerup");
    click();
    expect(opened).toHaveBeenCalledOnce();
    expect(played[0].cancel).toHaveBeenCalledOnce();
    expect(wrapper().style.transform).toBe("");
    expect(item().dataset.playing).toBeUndefined();
  });

  it("allows a deliberate new tap when the browser omitted the previous drag's click", () => {
    hold();
    pointer("pointermove", 40);
    pointer("pointerup", 40);
    pointer("pointerdown");
    wait(30);
    pointer("pointerup");
    click();
    expect(opened).toHaveBeenCalledOnce();
    expect(item().dataset.playing).toBeUndefined();
  });

  it("never swallows keyboard or assistive activation after a pickup", () => {
    hold();
    pointer("pointermove", 40);
    pointer("pointerup", 40);
    click(0);
    expect(opened).toHaveBeenCalledOnce();
    expect(item().dataset.playing).toBeUndefined();
  });

  it("leaves an ordinary context menu alone and does not pick up a sticker still falling in", () => {
    const menu = new Event("contextmenu", { bubbles: true, cancelable: true });
    button().dispatchEvent(menu);
    expect(menu.defaultPrevented).toBe(false);
    item().dataset.falling = "falling";
    hold();
    expect(captured).not.toHaveBeenCalled();
    expect(item().dataset.playing).toBeUndefined();
  });

  it("under reduced motion allows direct drag and immediate return without a toss or tilt", () => {
    motion.reduced = true;
    show();
    expect(motion.useLight).toHaveBeenLastCalledWith(false);
    publish(1, 1);
    hold();
    pointer("pointermove", 45);
    expect(wrapper().style.transform).toBe("translate(45px, 0px)");
    pointer("pointerup", 45);
    expect(played).toHaveLength(0);
    expect(item().dataset.playing).toBeUndefined();
    expect(heap().style.translate).toBe("0px 0px");
  });

  it.each([
    ["phone-or-tablet", "granted", "6px -4px"],
    ["phone-or-tablet", "not-needed", "6px -4px"],
    ["phone-or-tablet", "denied", "0px 0px"],
    ["phone-or-tablet", "unasked", "0px 0px"],
    ["desktop", "granted", "0px 0px"],
    ["unknown", "granted", "0px 0px"],
  ] as const)(
    "only permitted real-device tilt moves the pile: %s / %s",
    (device, permission, expected) => {
      motion.device = device;
      motion.permission = permission;
      show({ layout: {} });
      publish(2, -2);
      expect(motion.useLight).toHaveBeenLastCalledWith(expected !== "0px 0px");
      expect(heap().style.translate).toBe(expected);
    },
  );

  it("freezes tilt through any touch, including one released outside the pile, then follows again", () => {
    publish(1, 0);
    pointer("pointerdown", 0, 0, 1, pile());
    publish(-1, 1);
    expect(heap().style.translate).toBe("6px 0px");
    pointer("pointerup", 0, 0, 1, document);
    expect(heap().style.translate).toBe("-6px 4px");
  });

  it("freezes tilt while touching elsewhere on Explore and cancels pickup for a second touch there", () => {
    publish(1, 0);
    pointer("pointerdown", 0, 0, 1, document.body);
    publish(-1, 0);
    wait(400);
    expect(heap().style.translate).toBe("6px 0px");
    expect(item().dataset.playing).toBeUndefined();
    pointer("pointerup", 0, 0, 1, document.body);
    expect(heap().style.translate).toBe("-6px 0px");
    hold();
    pointer("pointerdown", 0, 0, 2, document.body);
    expect(item().dataset.playing).toBeUndefined();
    pointer("pointerup", 0, 0, 2, document.body);
    pointer("pointerup");
    expect(played).toHaveLength(0);
  });

  it("keeps a keyboard-focused sticker still and responds to permission changes", () => {
    vi.spyOn(button(), "matches").mockImplementation((selector) => selector === ":focus-visible");
    act(() => button().focus());
    publish(1, 1);
    expect(heap().style.translate).toBe("0px 0px");
    act(() => button().blur());
    publish(1, 1);
    expect(heap().style.translate).toBe("6px 4px");
    motion.permission = "denied";
    act(() => {
      for (const listener of motion.permissionListeners) listener();
    });
    expect(heap().style.translate).toBe("0px 0px");
  });
});
