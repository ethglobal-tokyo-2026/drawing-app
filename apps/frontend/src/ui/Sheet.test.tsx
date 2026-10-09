// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DISMISS_PX, Sheet } from "./Sheet";
import { dragBy } from "./testing";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
let opener: HTMLButtonElement;
const onClose = vi.fn();

const render = (open: boolean, props: Partial<ComponentProps<typeof Sheet>> = {}) =>
  act(() =>
    root.render(
      <Sheet label="Color" open={open} onClose={onClose} {...props}>
        <p>Swatches</p>
        <button id="last">Last</button>
      </Sheet>,
    ),
  );
const sheet = () => host.querySelector(".bottom-sheet");
const perf = () => host.querySelector<HTMLElement>(".perf");
const press = (key: string, shiftKey = false) =>
  act(
    () =>
      void document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key, shiftKey, bubbles: true, cancelable: true }),
      ),
  );
/** The browser's Back: history lands on an entry that isn't the sheet's. */
const back = () =>
  act(() => void window.dispatchEvent(new PopStateEvent("popstate", { state: null })));
const animationEnds = () =>
  act(() => void sheet()?.dispatchEvent(new Event("animationend", { bubbles: true })));

/** A finger on the perforation, moved by each of `path`'s offsets in turn, then lifted there. */
const drag = (...path: [dx: number, dy: number][]) => dragBy(perf(), ...path);

beforeEach(() => {
  // A closed sheet's step back in history waits on a timer; none of these tests wants it to run.
  vi.useFakeTimers();
  opener = document.createElement("button");
  document.body.append(opener);
  opener.focus();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  onClose.mockReset();
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  opener.remove();
  vi.useRealTimers();
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

  describe("as a modal dialog", () => {
    it("takes focus and makes the page behind inert while it's open, and gives both back as it starts to close", () => {
      render(true);
      expect(sheet()?.contains(document.activeElement)).toBe(true);
      expect(opener.inert).toBe(true);
      render(false);
      expect(opener.inert).toBe(false);
      expect(document.activeElement).toBe(opener);
    });

    it("keeps Tab inside, from its last control round to its perforation and back", () => {
      render(true);
      document.getElementById("last")?.focus();
      press("Tab");
      expect(document.activeElement).toBe(perf());
      press("Tab", true);
      expect(document.activeElement).toBe(document.getElementById("last"));
    });

    it("closes on Escape, wherever focus is, and on Back", () => {
      render(true);
      opener.focus();
      press("Escape");
      expect(onClose).toHaveBeenCalledTimes(1);
      back();
      expect(onClose).toHaveBeenCalledTimes(2);
    });

    it("steps back with Escape's own answer when it has one, and closes any other way", () => {
      const onEscape = vi.fn();
      render(true, { onEscape });
      press("Escape");
      expect(onEscape).toHaveBeenCalledTimes(1);
      expect(onClose).not.toHaveBeenCalled();
      back();
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("stays up while busy, whichever way it's asked to close, and Back can try again", () => {
      render(true, { busy: true });
      press("Escape");
      back();
      drag([0, DISMISS_PX * 2]);
      drag();
      expect(onClose).not.toHaveBeenCalled();
      expect(perf()?.getAttribute("aria-disabled")).toBe("true");

      render(true);
      back();
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });
});
