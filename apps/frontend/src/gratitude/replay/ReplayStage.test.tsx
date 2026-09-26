// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi, type MockInstance } from "vitest";
import { ReplayStage, STAGE_EASE_MS } from "./ReplayStage";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
let animate: MockInstance<Element["animate"]>;

/** The stage in a card whose one control is where focus goes back to. */
function Card({ open, reduced }: { open: boolean; reduced: boolean }) {
  const host = useRef<HTMLDivElement>(null);
  const control = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={control} type="button" className="control">
        Stop
      </button>
      <ReplayStage open={open} reduced={reduced} host={host} returnFocus={() => control.current} />
    </>
  );
}

const show = (open: boolean, reduced = false) =>
  act(() => root.render(<Card open={open} reduced={reduced} />));
const stage = () => container.querySelector<HTMLElement>(".replay-stage");
const host = () => {
  const found = container.querySelector<HTMLElement>(".replay-stage__host");
  if (!found) throw new Error("No stage host");
  return found;
};
const wait = (ms = 0) => act(() => vi.advanceTimersByTimeAsync(ms));
/** The keyframes of each ease the stage ran, in order. */
const eases = () =>
  animate.mock.calls.filter((_, i) => animate.mock.contexts[i] === stage()).map(([k]) => k);

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  // happy-dom's Web Animations run on their own clock; a stand-in records the eases instead.
  animate = vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(() => {
  act(() => root.unmount());
  container.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("ReplayStage", () => {
  it("eases open from nothing, and shut to nothing, then goes", async () => {
    show(false);
    expect(stage()).toBeNull();
    show(true);
    expect(stage()?.getAttribute("aria-hidden")).toBe("true");
    // Its card renders again as the replay plays; the stage stays as it is.
    show(true);
    show(false);
    expect(eases()).toMatchObject([
      [{ height: "0px", opacity: 0 }, { opacity: 1 }],
      [{ opacity: 1 }, { height: "0px", opacity: 0 }],
    ]);
    await wait(STAGE_EASE_MS - 1);
    expect(stage()).not.toBeNull();
    await wait(1);
    expect(stage()).toBeNull();
  });

  it("turns an ease back from where it is when it's reopened mid-shut", async () => {
    show(true);
    show(false);
    const shutting = new Animation();
    const reverse = vi.spyOn(shutting, "reverse").mockImplementation(() => {});
    vi.spyOn(Element.prototype, "getAnimations").mockReturnValue([shutting]);
    animate.mockClear();
    show(true);
    expect(reverse).toHaveBeenCalledTimes(1);
    expect(animate).not.toHaveBeenCalled();
    await wait(STAGE_EASE_MS);
    expect(stage()).not.toBeNull();
  });

  it("opens and shuts at once under reduced motion", async () => {
    show(true, true);
    expect(stage()).not.toBeNull();
    show(false, true);
    await wait();
    expect(stage()).toBeNull();
    expect(animate).not.toHaveBeenCalled();
  });

  it("gives focus back to its card as it shuts", () => {
    show(true);
    act(() => host().focus());
    show(false);
    expect(document.activeElement).toBe(container.querySelector(".control"));
  });

  it("brings itself into view once it's fully open", async () => {
    const scroll = vi.spyOn(Element.prototype, "scrollIntoView").mockImplementation(() => {});
    show(true);
    await wait(STAGE_EASE_MS - 1);
    expect(scroll).not.toHaveBeenCalled();
    await wait(1);
    expect(scroll.mock.contexts).toEqual([stage()]);
    expect(scroll).toHaveBeenCalledWith(expect.objectContaining({ block: "nearest" }));
  });
});
