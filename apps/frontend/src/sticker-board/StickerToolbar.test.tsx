// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { emptyApi, renderWithApi } from "../api/testing";
import { stickerBoard } from "../i18n/strings/stickerBoard";
import { FAST_AFTER_MS, HOLD_DELAY_MS } from "../ui/useHeldRepeat";
import type { Step } from "./boardGesture";
import { StickerToolbar } from "./StickerToolbar";

let unmount = () => {};
afterEach(() => {
  unmount();
  vi.restoreAllMocks();
});

const BOARD = { W: 390, H: 657 };

const toolbar = (extra: Partial<Parameters<typeof StickerToolbar>[0]> = {}) => (
  <StickerToolbar
    label="No.0133"
    sticker={{ x: 100, y: 200, w: 80, h: 80, r: 0 }}
    board={BOARD}
    knobBelow={false}
    clearOf={null}
    onView={() => {}}
    onEscape={() => {}}
    reduced
    {...extra}
  />
);

const show = (extra: Partial<Parameters<typeof StickerToolbar>[0]> = {}) => {
  const view = renderWithApi(toolbar(extra), emptyApi());
  unmount = view.unmount;
  return view.host;
};

describe("StickerToolbar's spot", () => {
  it("moves as its own size changes, and measures nothing on a render that leaves its spot", () => {
    const resized: (() => void)[] = [];
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(onResize: () => void) {
          resized.push(onResize);
        }
        observe() {}
        disconnect() {}
      },
    );
    onTestFinished(() => void vi.unstubAllGlobals());
    // happy-dom lays nothing out, so the toolbar is given a width.
    let width = 100;
    const measured = vi
      .spyOn(HTMLElement.prototype, "offsetWidth", "get")
      .mockImplementation(() => width);
    const view = renderWithApi(toolbar(), emptyApi());
    unmount = view.unmount;
    const bar = view.host.querySelector<HTMLElement>(".sticker-toolbar");
    const spot = bar?.style.transform;

    measured.mockClear();
    view.rerender(toolbar({ onView: () => {}, sticker: { x: 100, y: 200, w: 80, h: 80, r: 0 } }));
    expect(measured).not.toHaveBeenCalled();

    width = 160;
    act(() => resized.forEach((onResize) => onResize()));
    expect(bar?.style.transform).not.toBe(spot);
  });
});

const buttons = (host: HTMLElement, group: string) => [
  ...host.querySelectorAll<HTMLButtonElement>(`${group} button`),
];

const arrangeStrings = stickerBoard.toolbar.arrange;
const arrangeTile = (host: HTMLElement) =>
  host.querySelector<HTMLButtonElement>(".sticker-toolbar__arrange-toggle");
const tiles = (host: HTMLElement) => buttons(host, '[role="group"]');
const arranging = (
  open: boolean,
  onStep: (step: Step) => void = () => {},
  onOpen: (open: boolean) => void = () => {},
) => ({ arrange: { open, onOpen, onStep } });

describe("StickerToolbar's Arrange", () => {
  it("keeps the step tiles in until the Arrange tile is pressed, and says whether they're out", () => {
    const onOpen = vi.fn<(open: boolean) => void>();
    const closed = show(arranging(false, () => {}, onOpen));
    expect(arrangeTile(closed)?.getAttribute("aria-expanded")).toBe("false");
    expect(tiles(closed)).toEqual([]);
    act(() => arrangeTile(closed)?.click());
    expect(onOpen).toHaveBeenCalledExactlyOnceWith(true);

    unmount();
    const open = show(arranging(true));
    expect(arrangeTile(open)?.getAttribute("aria-expanded")).toBe("true");
    expect(open.querySelector('[role="group"]')?.id).toBe(
      arrangeTile(open)?.getAttribute("aria-controls"),
    );
  });

  it("opens a tile for every step, each taking the step it's named for once, for those who can't drag", () => {
    const onStep = vi.fn<(step: Step) => void>();
    const host = show(arranging(true, onStep));
    const taken = tiles(host).map((tile) => {
      act(() => tile.click());
      return { label: tile.getAttribute("aria-label"), step: onStep.mock.lastCall?.[0] };
    });
    const steps = Object.keys(arrangeStrings.moved);
    expect(onStep).toHaveBeenCalledTimes(steps.length);
    expect(new Set(taken.map((t) => t.step))).toEqual(new Set(steps));
    expect(taken.map((t) => t.label)).toEqual(
      taken.map((t) => t.step && arrangeStrings[t.step].en),
    );
  });

  describe("a held step tile", () => {
    const pointer = (el: Element, type: string, at: { clientX?: number; clientY?: number } = {}) =>
      act(
        () =>
          void el.dispatchEvent(
            new PointerEvent(type, { bubbles: true, isPrimary: true, pointerId: 1, ...at }),
          ),
      );
    const wait = (ms: number) => act(() => void vi.advanceTimersByTime(ms));
    beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
    afterEach(() => vi.useRealTimers());

    it("repeats its step, faster the longer it's held, and takes none for the release", () => {
      const onStep = vi.fn<(step: Step) => void>();
      const [tile] = tiles(show(arranging(true, onStep)));
      pointer(tile, "pointerdown");
      wait(HOLD_DELAY_MS - 1);
      expect(onStep).not.toHaveBeenCalled();
      wait(FAST_AFTER_MS - HOLD_DELAY_MS + 1);
      const early = onStep.mock.calls.length;
      wait(FAST_AFTER_MS - HOLD_DELAY_MS);
      expect(onStep.mock.calls.length - early).toBeGreaterThan(early);

      pointer(tile, "pointerup");
      const held = onStep.mock.calls.length;
      act(() => tile.click());
      wait(FAST_AFTER_MS);
      expect(onStep).toHaveBeenCalledTimes(held);
    });

    it("stops when the finger slides off it", () => {
      const onStep = vi.fn<(step: Step) => void>();
      const [tile] = tiles(show(arranging(true, onStep)));
      pointer(tile, "pointerdown");
      wait(HOLD_DELAY_MS);
      const before = onStep.mock.calls.length;
      // happy-dom lays nothing out, so the tile is a point at 0,0, and this is far past it.
      pointer(tile, "pointermove", { clientX: 200, clientY: 200 });
      wait(FAST_AFTER_MS);
      expect(onStep).toHaveBeenCalledTimes(before);
    });
  });

  it("is left off a board that can't be rearranged", () => {
    const host = show();
    expect(arrangeTile(host)).toBeNull();
    expect(tiles(host)).toEqual([]);
    expect(host.querySelector('[role="toolbar"]')?.textContent).toContain("View");
  });
});
