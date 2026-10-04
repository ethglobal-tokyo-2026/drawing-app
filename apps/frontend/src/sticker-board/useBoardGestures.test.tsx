// @vitest-environment happy-dom
import { act, useRef, type RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardSticker } from "./boardSticker";
import { fieldOf, sizeOf, toPx, transformAt } from "./placement";
import type { StickerTrayHandle } from "./tray/StickerTray";
import { STEP_SAVE_IDLE_MS, useBoardGestures } from "./useBoardGestures";
import { yoursHeld } from "./testBoardSticker";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

type Options = Parameters<typeof useBoardGestures>[0];

const sticker: BoardSticker = {
  id: "a",
  no: 1,
  createdAt: 1,
  timeUsed: 60,
  ...yoursHeld,
  width: 100,
  height: 80,
  nsfw: false,
  urls: { png: "a.png" },
  placement: { on: true, x: 0.5, y: 0.5, s: 0.3, r: 0, z: 1 },
};

function Board(props: Omit<Options, "stage">) {
  const stage = useRef<HTMLDivElement>(null);
  useBoardGestures({ ...props, stage });
  return (
    <div ref={stage} className="board-stage">
      {props.stickers.map((s) => (
        <div key={s.id} className="placed-sticker" data-sticker-id={s.id} tabIndex={0} />
      ))}
    </div>
  );
}

const noTray: RefObject<StickerTrayHandle | null> = { current: null };

/** A sticker tray that answers a let-go sticker's `boardDrop` as given. */
const trayDropping = (
  boardDrop: StickerTrayHandle["boardDrop"],
): RefObject<StickerTrayHandle | null> => ({
  current: {
    isOpen: false,
    open: () => Promise.resolve(false),
    close: () => Promise.resolve(false),
    boardDrag: () => null,
    boardDrop,
    escape: () => false,
  },
});

let host: HTMLDivElement;
let root: Root;

/** A press, a move past the slop and a lift, at the board's middle height. */
const dragAcross = (el: Element, pointerId: number, from: number, to: number) => {
  const at = (type: string, x: number) =>
    el.dispatchEvent(
      new PointerEvent(type, { pointerId, clientX: x, clientY: 300, button: 0, bubbles: true }),
    );
  at("pointerdown", from);
  at("pointermove", to);
  at("pointerup", to);
};

beforeEach(() => {
  // Where things are drawn isn't tested here; happy-dom's own animations reject unhandled.
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
});

/** A pointer on `el` at (x, y). */
const point = (el: Element, type: string, pointerId: number, x: number, y: number) =>
  el.dispatchEvent(
    new PointerEvent(type, { pointerId, clientX: x, clientY: y, button: 0, bubbles: true }),
  );

describe("useBoardGestures", () => {
  it("hands a pinch to the fingers still down when one of its pair lifts, from where the sticker is", () => {
    const onCommit = vi.fn<Options["onCommit"]>();
    act(() =>
      root.render(
        <Board
          stickers={[sticker]}
          field={fieldOf(390, 657)}
          size={{ W: 390, H: 657 }}
          selected="a"
          reduced
          tray={noTray}
          onSelect={() => {}}
          onOpen={() => {}}
          onCommit={onCommit}
          onRemove={() => {}}
        />,
      ),
    );
    const stage = host.querySelector(".board-stage");
    const el = host.querySelector(".placed-sticker");
    if (!(stage instanceof HTMLElement) || !el) throw new Error("the board didn't render");
    stage.getBoundingClientRect = () => new DOMRect(0, 0, 390, 657);

    act(() => {
      point(el, "pointerdown", 1, 100, 300);
      point(el, "pointerdown", 2, 200, 300);
      // A third finger lands, the first lifts, and the other two stay where they are.
      point(el, "pointerdown", 3, 150, 400);
      point(el, "pointerup", 1, 100, 300);
      point(el, "pointermove", 3, 150, 400);
      point(el, "pointerup", 2, 200, 300);
      point(el, "pointerup", 3, 150, 400);
    });
    expect(onCommit).toHaveBeenCalledOnce();
    const [, placement] = onCommit.mock.calls[0];
    expect(placement).toMatchObject({
      x: sticker.placement.x,
      y: sticker.placement.y,
      s: sticker.placement.s,
      r: sticker.placement.r,
    });
  });

  it("lets a sticker on its way into the tray take no new gesture, so nothing done meanwhile is undone", async () => {
    let land: (into: boolean) => void = () => {};
    const boardDrop = vi
      .fn<StickerTrayHandle["boardDrop"]>()
      .mockReturnValueOnce(new Promise((resolve) => (land = resolve)))
      .mockResolvedValue(false);
    const tray = trayDropping(boardDrop);
    const onCommit = vi.fn();
    act(() =>
      root.render(
        <Board
          stickers={[sticker]}
          field={fieldOf(390, 657)}
          size={{ W: 390, H: 657 }}
          selected="a"
          reduced
          tray={tray}
          onSelect={() => {}}
          onOpen={() => {}}
          onCommit={onCommit}
          onRemove={() => {}}
        />,
      ),
    );
    const stage = host.querySelector(".board-stage");
    const el = host.querySelector(".placed-sticker");
    if (!(stage instanceof HTMLElement) || !el) throw new Error("the board didn't render");
    // happy-dom lays nothing out: the stage is given the board's size.
    stage.getBoundingClientRect = () => new DOMRect(0, 0, 390, 657);

    // Let go over the tray, which takes its time to take it.
    act(() => dragAcross(el, 1, 100, 140));
    // Meanwhile it's grabbed again and put down on the board, and nudged with a key.
    act(() => {
      dragAcross(el, 2, 140, 180);
      el.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft", bubbles: true }));
    });
    await act(async () => land(true));

    expect(boardDrop).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("goes between stickers on focus alone, and moves one only once it's selected", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const onSelect = vi.fn();
    const onCommit = vi.fn();
    const stickers = [
      sticker,
      { ...sticker, id: "b", placement: { ...sticker.placement, x: 0.8 } },
    ];
    const render = (selected: string | null) =>
      act(() =>
        root.render(
          <Board
            stickers={stickers}
            field={fieldOf(390, 657)}
            size={{ W: 390, H: 657 }}
            selected={selected}
            reduced
            tray={noTray}
            onSelect={onSelect}
            onOpen={() => {}}
            onCommit={onCommit}
            onRemove={() => {}}
          />,
        ),
      );
    const el = (id: string) => host.querySelector<HTMLElement>(`[data-sticker-id="${id}"]`);
    const press = (key: string) =>
      act(() => {
        document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      });

    render(null);
    act(() => el("a")?.focus());
    press("ArrowRight");
    expect(document.activeElement).toBe(el("b"));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();

    press("Enter");
    expect(onSelect).toHaveBeenLastCalledWith("b");
    render("b");
    press("ArrowLeft");
    expect(document.activeElement).toBe(el("b"));
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    expect(onCommit).toHaveBeenCalledOnce();

    press("Escape");
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(document.activeElement).toBe(el("b"));
  });

  describe("steps, from keys and from Arrange", () => {
    const board = (
      onCommit: Options["onCommit"],
      overrides: Partial<Omit<Options, "stage">> = {},
    ) =>
      act(() =>
        root.render(
          <Board
            stickers={[sticker]}
            field={fieldOf(390, 657)}
            size={{ W: 390, H: 657 }}
            selected="a"
            reduced
            tray={noTray}
            onSelect={() => {}}
            onOpen={() => {}}
            onCommit={onCommit}
            onRemove={() => {}}
            {...overrides}
          />,
        ),
      );
    const pressRight = (times: number) => {
      const el = host.querySelector<HTMLElement>(".placed-sticker");
      act(() => el?.focus());
      for (let i = 0; i < times; i++)
        act(
          () =>
            void el?.dispatchEvent(
              new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }),
            ),
        );
    };
    /** Where `times` presses of Right leave the sticker, once they've been saved. */
    const savedAfter = (times: number) => {
      const onCommit = vi.fn<Options["onCommit"]>();
      board(onCommit);
      pressRight(times);
      expect(onCommit).not.toHaveBeenCalled();
      act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
      expect(onCommit).toHaveBeenCalledOnce();
      act(() => root.render(null));
      return onCommit.mock.calls[0][1].x;
    };

    beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));
    afterEach(() => vi.useRealTimers());

    it("save once, where all of them added up, not once each", () => {
      const start = sticker.placement.x;
      const one = savedAfter(1) - start;
      expect(one).toBeGreaterThan(0);
      expect(savedAfter(4) - start).toBeCloseTo(4 * one, 3);
    });

    it("tell the last of a run once it settles, and that the board's edge stopped it", () => {
      const onStepsSettled = vi.fn<NonNullable<Options["onStepsSettled"]>>();
      board(() => {}, { onStepsSettled });
      pressRight(3);
      expect(onStepsSettled).not.toHaveBeenCalled();
      act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
      expect(onStepsSettled).toHaveBeenCalledExactlyOnceWith({ step: "right", moved: true });

      // More presses than the field has pixels: the last ones can't move it.
      pressRight(fieldOf(390, 657).w);
      act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
      expect(onStepsSettled).toHaveBeenLastCalledWith({ step: "right", moved: false });
    });

    it("save when the board is let go of, without waiting for the idle", () => {
      const onCommit = vi.fn<Options["onCommit"]>();
      board(onCommit);
      pressRight(2);
      act(() => root.render(null));
      expect(onCommit).toHaveBeenCalledOnce();
    });

    it("peel a removed sticker up from where they left it, not from where it was before", () => {
      const onCommit = vi.fn<Options["onCommit"]>();
      board(onCommit, { reduced: false, tray: trayDropping(() => Promise.resolve(true)) });
      pressRight(2);
      // Removed within the idle, before React has been given the steps' spot.
      const el = host.querySelector(".placed-sticker");
      act(
        () =>
          void el?.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })),
      );

      const [, saved] = onCommit.mock.calls[0];
      const { x, y } = toPx(fieldOf(390, 657), saved);
      const { w, h } = sizeOf(390, saved.s, sticker);
      const [frames] = vi.spyOn(Element.prototype, "animate").mock.calls[0];
      const first = Array.isArray(frames) ? frames[0]?.transform : undefined;
      expect(first).toContain(transformAt(x, y, w, h, saved.r));
    });

    it("take a sticker removed before the tray has loaded off from where they left it", () => {
      const onCommit = vi.fn<Options["onCommit"]>();
      const onRemove = vi.fn<Options["onRemove"]>();
      board(onCommit, { onRemove });
      pressRight(2);
      const el = host.querySelector(".placed-sticker");
      act(
        () =>
          void el?.dispatchEvent(new KeyboardEvent("keydown", { key: "Delete", bubbles: true })),
      );
      const [, saved] = onCommit.mock.calls[0];
      expect(onRemove).toHaveBeenCalledExactlyOnceWith("a", saved);
    });
  });
});
