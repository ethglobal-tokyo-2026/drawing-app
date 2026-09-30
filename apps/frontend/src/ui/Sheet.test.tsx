// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISMISS_PX, Sheet } from "./Sheet";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const onClose = vi.fn();

const render = (open: boolean) =>
  act(() =>
    root.render(
      <Sheet label="Color" open={open} onClose={onClose}>
        <p>Swatches</p>
      </Sheet>,
    ),
  );
const sheet = () => host.querySelector(".bottom-sheet");
const animationEnds = () =>
  act(() => void sheet()?.dispatchEvent(new Event("animationend", { bubbles: true })));

/** A finger on the perforation, moved by each of `path`'s offsets in turn, then lifted there. */
const drag = (...path: [dx: number, dy: number][]) => {
  const perf = host.querySelector(".perf");
  const at = { clientX: 100, clientY: 100, pointerId: 1, bubbles: true };
  const send = (type: string, dx = 0, dy = 0) =>
    act(
      () =>
        void perf?.dispatchEvent(
          new PointerEvent(type, { ...at, clientX: at.clientX + dx, clientY: at.clientY + dy }),
        ),
    );
  send("pointerdown");
  for (const [dx, dy] of path) send("pointermove", dx, dy);
  const [dx, dy] = path.at(-1) ?? [0, 0];
  send("pointerup", dx, dy);
  // The browser's click follows the lift.
  act(() => void perf?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
};

beforeEach(() => {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onClose.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
});

describe("Sheet", () => {
  it("slides a closing sheet away before it goes", () => {
    render(true);
    render(false);
    expect(sheet()?.classList.contains("is-leaving")).toBe(true);
    animationEnds();
    expect(sheet()).toBeNull();
  });

  it("closes once on a tap of its perforation, and on a click that comes with no press", () => {
    render(true);
    drag();
    expect(onClose).toHaveBeenCalledTimes(1);
    // A screen reader's activation.
    act(
      () =>
        void host.querySelector(".perf")?.dispatchEvent(new MouseEvent("click", { bubbles: true })),
    );
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("closes when dragged down far enough, and stays for a drag up, sideways or back", () => {
    render(true);
    drag([0, -DISMISS_PX]);
    drag([DISMISS_PX, 0]);
    drag([0, DISMISS_PX * 2], [0, 0]);
    expect(onClose).not.toHaveBeenCalled();
    drag([0, DISMISS_PX * 2]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("stays when it opens again on its way out", () => {
    render(true);
    render(false);
    render(true);
    animationEnds();
    expect(sheet()?.classList.contains("is-leaving")).toBe(false);
  });
});
