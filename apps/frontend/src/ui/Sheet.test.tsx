// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LARGE_SCREEN } from "./largeScreen";
import { Sheet } from "./Sheet";
import { dragBy, onLargeScreen } from "./testing";
import { DISMISS_PX } from "./useSheetDrag";

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
/** A tap on the scrim. A browser's tap passes through an inert element, so it only counts if it's live. */
const tapScrim = () => {
  const scrim = host.querySelector<HTMLElement>(".sheet-scrim");
  if (scrim && !scrim.closest("[inert]")) act(() => scrim.click());
};

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
  vi.restoreAllMocks();
});

describe("Sheet", () => {
  it("draws an X that closes a card on a large screen, and none on a card that can't close", () => {
    const matchMedia = window.matchMedia.bind(window);
    vi.spyOn(window, "matchMedia").mockImplementation((query) =>
      matchMedia(query === LARGE_SCREEN ? "all" : query),
    );
    render(true, { card: true });
    act(() => host.querySelector<HTMLElement>(".sheet-x")?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    render(true, { card: true, closable: false });
    expect(host.querySelector(".sheet-x")).toBeNull();
  });

  it("on a large screen closes a card from its scrim while it can close, and lets taps through the scrim as it goes", () => {
    onLargeScreen();
    render(true, { card: true, scrim: true, closable: false });
    tapScrim();
    expect(onClose).not.toHaveBeenCalled();
    render(true, { card: true, scrim: true });
    tapScrim();
    expect(onClose).toHaveBeenCalledTimes(1);
    render(false, { card: true, scrim: true });
    tapScrim();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("on a phone draws a scrim only when it's always there, which closes the sheet unless it's busy", () => {
    render(true, { scrim: true });
    expect(host.querySelector(".sheet-scrim")).toBeNull();
    render(true, { scrim: "always", busy: true });
    tapScrim();
    expect(onClose).not.toHaveBeenCalled();
    render(true, { scrim: "always" });
    tapScrim();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

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

    it.each([{ busy: true }, { closable: false }])(
      "stays up while %o, whichever way it's asked to close, and Back can try again",
      (held) => {
        render(true, held);
        press("Escape");
        back();
        drag([0, DISMISS_PX * 2]);
        drag();
        expect(onClose).not.toHaveBeenCalled();

        render(true);
        back();
        expect(onClose).toHaveBeenCalledTimes(1);
      },
    );

    it("keeps its perforation a control, disabled, while its act is on its way", () => {
      render(true, { busy: true });
      expect(perf()?.getAttribute("aria-disabled")).toBe("true");
    });

    it("keeps its perforation out of the Tab order when it can't close, so focus starts past it", () => {
      render(true, { closable: false });
      const last = document.getElementById("last");
      expect(perf()).not.toBeNull();
      expect(document.activeElement).toBe(last);
      press("Tab");
      expect(document.activeElement).toBe(last);
      press("Tab", true);
      expect(document.activeElement).toBe(last);
    });
  });
});
