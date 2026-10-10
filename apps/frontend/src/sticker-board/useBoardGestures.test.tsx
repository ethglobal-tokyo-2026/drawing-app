// @vitest-environment happy-dom
import { act, useRef, type RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardSticker } from "./boardSticker";
import { fieldOf, PHONE_BOARD, sizeOf, toPx, transformAt, type Placement } from "./placement";
import type { StickerTrayHandle } from "./tray/StickerTray";
import { STEP_SAVE_IDLE_MS, useBoardGestures } from "./useBoardGestures";
import { testBoardSticker } from "./testBoardSticker";

type Options = Parameters<typeof useBoardGestures>[0];
type BoardProps = Omit<Options, "stage">;

const sticker: BoardSticker = testBoardSticker({ id: "a" });

/** Each sticker carries a corner handle, as a placed sticker does. */
function Board(props: BoardProps) {
  const stage = useRef<HTMLDivElement>(null);
  useBoardGestures({ ...props, stage });
  return (
    <div ref={stage} className="board-stage">
      {props.stickers.map((s) => (
        <div key={s.id} className="placed-sticker" data-sticker-id={s.id} tabIndex={0}>
          <span data-handle="scale" />
        </div>
      ))}
    </div>
  );
}

const noTray: RefObject<StickerTrayHandle | null> = { current: null };

/** A sticker tray that answers as `overrides` say, and holds nothing otherwise. */
const trayWith = (overrides: Partial<StickerTrayHandle>): RefObject<StickerTrayHandle | null> => ({
  current: {
    isOpen: false,
    open: () => Promise.resolve(false),
    close: () => Promise.resolve(false),
    boardDrag: () => null,
    boardDrop: () => Promise.resolve(false),
    boardDragEnd: () => {},
    escape: () => false,
    pouchFoot: () => null,
    focusZipper: () => {},
    ...overrides,
  },
});

/** A sticker tray that answers a let-go sticker's `boardDrop` as given. */
const trayDropping = (boardDrop: StickerTrayHandle["boardDrop"]) => trayWith({ boardDrop });

const phone = { ...PHONE_BOARD, U: PHONE_BOARD.W };
const phoneField = fieldOf(phone.W, phone.H);

/** One sticker, selected, on a phone's board with motion off and no tray. */
const defaults: BoardProps = {
  stickers: [sticker],
  field: phoneField,
  size: phone,
  layout: "phone",
  selected: sticker.id,
  reduced: true,
  tray: noTray,
  onSelect: () => {},
  onOpen: () => {},
  onCommit: () => {},
  onRemove: () => {},
};

let host: HTMLDivElement;
let root: Root;

/** Draws the board, `overrides` on `defaults`, and returns its stage. */
const show = (overrides: Partial<BoardProps> = {}) => {
  const props = { ...defaults, ...overrides };
  act(() => root.render(<Board {...props} />));
  const stage = host.querySelector<HTMLElement>(".board-stage");
  if (!stage) throw new Error("the board didn't render");
  // happy-dom lays nothing out: the stage is given the board's size.
  const { W, H } = props.size ?? phone;
  stage.getBoundingClientRect = () => new DOMRect(0, 0, W, H);
  return stage;
};

const stickerEl = (id = sticker.id) => {
  const el = host.querySelector<HTMLElement>(`[data-sticker-id="${id}"]`);
  if (!el) throw new Error(`${id} isn't on the board`);
  return el;
};

/** `key` pressed where focus is, or on `on`. */
const keyDown = (key: string, on: Element | null = document.activeElement) =>
  on?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
const press = (key: string, on?: Element) => act(() => void keyDown(key, on));

/** A pointer on `el` at (x, y). */
const point = (el: Element, type: string, pointerId: number, x: number, y: number) =>
  el.dispatchEvent(
    new PointerEvent(type, { pointerId, clientX: x, clientY: y, button: 0, bubbles: true }),
  );

/** A press, a move past the slop and a lift, at the board's middle height. */
const dragAcross = (el: Element, pointerId: number, from: number, to: number) => {
  point(el, "pointerdown", pointerId, from, 300);
  point(el, "pointermove", pointerId, to, 300);
  point(el, "pointerup", pointerId, to, 300);
};

/** The transform that draws the sticker at `placement` on the phone's board. */
const drawnAt = (placement: Placement) => {
  const { x, y } = toPx(phoneField, placement);
  const { w, h } = sizeOf(phone.U, placement.s, sticker);
  return transformAt(x, y, w, h, placement.r);
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
  vi.useRealTimers();
});

describe("useBoardGestures", () => {
  it("hands a pinch to the fingers still down when one of its pair lifts, from where the sticker is", () => {
    const onCommit = vi.fn<Options["onCommit"]>();
    show({ onCommit });
    const el = stickerEl();

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

  it("keeps a sticker pinched bigger at the field's edge whole on the field, as its handles do", () => {
    const onCommit = vi.fn<Options["onCommit"]>();
    const atEdge = { ...sticker, placement: { ...sticker.placement, x: 1 } };
    show({ stickers: [atEdge], onCommit });
    const el = stickerEl();

    // Two fingers on it spread apart, toward the edge.
    act(() => {
      point(el, "pointerdown", 1, 300, 300);
      point(el, "pointerdown", 2, 340, 300);
      point(el, "pointermove", 2, 380, 300);
      point(el, "pointerup", 1, 300, 300);
      point(el, "pointerup", 2, 380, 300);
    });
    const [, placement] = onCommit.mock.calls[0];
    expect(placement.s).toBeGreaterThan(sticker.placement.s);
    const { x } = toPx(phoneField, placement);
    const { w } = sizeOf(phone.U, placement.s, sticker);
    // Within the saved spot's rounding.
    expect(x + w / 2).toBeLessThanOrEqual(phoneField.left + phoneField.w + 0.05);
  });

  describe("a gesture the system takes, as iOS or LINE can", () => {
    /** Each gesture begun on the sticker, which moves it; returns the pointers it holds. */
    const gestures = {
      drag: (el: HTMLElement) => {
        point(el, "pointerdown", 1, 100, 300);
        point(el, "pointermove", 1, 160, 300);
        return [1];
      },
      pinch: (el: HTMLElement) => {
        point(el, "pointerdown", 1, 100, 300);
        point(el, "pointerdown", 2, 200, 300);
        point(el, "pointermove", 2, 260, 300);
        return [1, 2];
      },
      resize: (el: HTMLElement) => {
        const handle = el.querySelector("[data-handle]");
        if (!handle) throw new Error("the sticker has no handle");
        point(handle, "pointerdown", 1, 250, 250);
        point(handle, "pointermove", 1, 300, 200);
        return [1];
      },
    };

    it.each(Object.entries(gestures))(
      "puts the sticker back where its %s began, and saves nothing",
      async (_, begin) => {
        const onCommit = vi.fn<Options["onCommit"]>();
        const boardDrop = vi.fn<StickerTrayHandle["boardDrop"]>(() => Promise.resolve(true));
        show({ onCommit, tray: trayWith({ boardDrop }) });
        const el = stickerEl();
        await act(async () => {
          const held = begin(el);
          expect(el.style.transform).not.toBe(drawnAt(sticker.placement));
          for (const pointerId of held) point(el, "pointercancel", pointerId, 0, 0);
        });
        expect(onCommit).not.toHaveBeenCalled();
        expect(boardDrop).not.toHaveBeenCalled();
        expect(el.style.transform).toBe(drawnAt(sticker.placement));
      },
    );
  });

  it("ends the tray's part in a drag that becomes a pinch, or that the system takes", () => {
    const boardDragEnd = vi.fn<StickerTrayHandle["boardDragEnd"]>();
    show({ tray: trayWith({ boardDragEnd }) });
    const el = stickerEl();
    act(() => {
      point(el, "pointerdown", 1, 100, 300);
      point(el, "pointermove", 1, 160, 300);
      point(el, "pointerdown", 2, 200, 300);
    });
    expect(boardDragEnd).toHaveBeenCalledExactlyOnceWith(sticker.id);

    act(() => {
      point(el, "pointerup", 1, 100, 300);
      point(el, "pointerup", 2, 200, 300);
      point(el, "pointerdown", 3, 100, 300);
      point(el, "pointermove", 3, 160, 300);
      point(el, "pointercancel", 3, 160, 300);
    });
    expect(boardDragEnd).toHaveBeenCalledTimes(2);
  });

  it("lets a sticker on its way into the tray take no new gesture, so nothing done meanwhile is undone", async () => {
    let land: (into: boolean) => void = () => {};
    const boardDrop = vi
      .fn<StickerTrayHandle["boardDrop"]>()
      .mockReturnValueOnce(new Promise((resolve) => (land = resolve)))
      .mockResolvedValue(false);
    const onCommit = vi.fn();
    show({ tray: trayDropping(boardDrop), onCommit });
    const el = stickerEl();

    // Let go over the tray, which takes its time to take it.
    act(() => dragAcross(el, 1, 100, 140));
    // Meanwhile it's grabbed again and put down on the board, and nudged with a key.
    act(() => dragAcross(el, 2, 140, 180));
    press("ArrowLeft", el);
    await act(async () => land(true));

    expect(boardDrop).toHaveBeenCalledTimes(1);
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("takes a sticker removed while another rides into the tray in after it", async () => {
    let land: (into: boolean) => void = () => {};
    const boardDrop = vi
      .fn<StickerTrayHandle["boardDrop"]>()
      .mockReturnValueOnce(new Promise((resolve) => (land = resolve)))
      .mockResolvedValue(true);
    const onRemove = vi.fn();
    const b = { ...sticker, id: "b", placement: { ...sticker.placement, x: 0.8 } };
    const shown = { stickers: [sticker, b], tray: trayDropping(boardDrop), onRemove };
    show(shown);
    press("Delete", stickerEl("a"));
    show({ ...shown, selected: "b" });
    press("Delete", stickerEl("b"));
    const dropped = () => boardDrop.mock.calls.map(([id]) => id);
    expect(dropped()).toEqual(["a"]);

    await act(async () => land(true));
    expect(dropped()).toEqual(["a", "b"]);
    expect(onRemove).not.toHaveBeenCalled();
  });

  it("goes between stickers on focus alone, and moves one only once it's selected", () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const onSelect = vi.fn();
    const onCommit = vi.fn();
    const stickers = [
      sticker,
      { ...sticker, id: "b", placement: { ...sticker.placement, x: 0.8 } },
    ];
    const render = (selected: string | null) => show({ stickers, selected, onSelect, onCommit });

    render(null);
    act(() => stickerEl("a").focus());
    press("ArrowRight");
    expect(document.activeElement).toBe(stickerEl("b"));
    expect(onSelect).not.toHaveBeenCalled();
    expect(onCommit).not.toHaveBeenCalled();

    // Enter selects as a tap does, which a peek at the Kyoto Seika Subjects of a sticker drawn in Kyoto Seika Practice Mode follows.
    press("Enter");
    expect(onSelect).toHaveBeenLastCalledWith("b", "tap");
    render("b");
    press("ArrowLeft");
    expect(document.activeElement).toBe(stickerEl("b"));
    act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
    expect(onCommit).toHaveBeenCalledOnce();

    press("Escape");
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(document.activeElement).toBe(stickerEl("b"));
  });

  it("draws a sticker in hand at the board's unit, which on a large board isn't its width", async () => {
    const large = { W: 1180, H: 662, U: PHONE_BOARD.W };
    show({ field: fieldOf(large.W, large.H), size: large });
    const el = stickerEl();
    await act(async () => dragAcross(el, 1, 100, 160));
    expect(parseFloat(el.style.width)).toBeCloseTo(sizeOf(large.U, sticker.placement.s, sticker).w);
  });

  describe("when the stage can't capture a pointer", () => {
    /** The board, with its stage's `setPointerCapture` throwing `error`; returns its sticker. */
    const boardCapturing = (error: Error, onCommit: Options["onCommit"] = () => {}) => {
      const stage = show({ onCommit });
      stage.setPointerCapture = () => {
        throw error;
      };
      return stickerEl();
    };

    it("carries a drag on uncaptured when WebKit no longer has its pointer", async () => {
      const onCommit = vi.fn<Options["onCommit"]>();
      const el = boardCapturing(
        new DOMException("The object can not be found here.", "NotFoundError"),
        onCommit,
      );
      await act(async () => dragAcross(el, 1, 100, 160));
      expect(onCommit).toHaveBeenCalledOnce();
      expect(onCommit.mock.calls[0][1].x).toBeGreaterThan(sticker.placement.x);
    });

    it("lets any other error from capturing it surface", () => {
      const error = new DOMException("The object is in an invalid state.", "InvalidStateError");
      const el = boardCapturing(error);
      expect(() => act(() => void point(el, "pointerdown", 1, 100, 300))).toThrow(error);
    });
  });

  describe("steps, from keys and from Arrange", () => {
    const pressRight = (times: number) => {
      act(() => stickerEl().focus());
      for (let i = 0; i < times; i++) press("ArrowRight");
    };
    /** Where `times` presses of Right leave the sticker, once they've been saved. */
    const savedAfter = (times: number) => {
      const onCommit = vi.fn<Options["onCommit"]>();
      show({ onCommit });
      pressRight(times);
      expect(onCommit).not.toHaveBeenCalled();
      act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
      expect(onCommit).toHaveBeenCalledOnce();
      act(() => root.render(null));
      return onCommit.mock.calls[0][1].x;
    };

    beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] }));

    it("save once, where all of them added up, not once each", () => {
      const start = sticker.placement.x;
      const one = savedAfter(1) - start;
      expect(one).toBeGreaterThan(0);
      expect(savedAfter(4) - start).toBeCloseTo(4 * one, 3);
    });

    it("tell the last of a run once it settles, and that the board's edge stopped it", () => {
      const onStepsSettled = vi.fn<NonNullable<Options["onStepsSettled"]>>();
      show({ onStepsSettled });
      pressRight(3);
      expect(onStepsSettled).not.toHaveBeenCalled();
      act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
      expect(onStepsSettled).toHaveBeenCalledExactlyOnceWith({ step: "right", moved: true });

      // More presses than the field has pixels: the last ones can't move it.
      pressRight(phoneField.w);
      act(() => void vi.advanceTimersByTime(STEP_SAVE_IDLE_MS));
      expect(onStepsSettled).toHaveBeenLastCalledWith({ step: "right", moved: false });
    });

    it("save when the board is let go of, without waiting for the idle", () => {
      const onCommit = vi.fn<Options["onCommit"]>();
      show({ onCommit });
      pressRight(2);
      act(() => root.render(null));
      expect(onCommit).toHaveBeenCalledOnce();
    });

    it("peel a removed sticker up from where they left it, not from where it was before", () => {
      const onCommit = vi.fn<Options["onCommit"]>();
      show({ onCommit, reduced: false, tray: trayDropping(() => Promise.resolve(true)) });
      pressRight(2);
      // Removed within the idle, before React has been given the steps' spot.
      const el = stickerEl();
      press("Delete", el);

      const [, saved] = onCommit.mock.calls[0];
      // The sticker's own peel, after the mark it leaves behind.
      const { calls, contexts } = vi.spyOn(Element.prototype, "animate").mock;
      const [frames] = calls[contexts.indexOf(el)] ?? [];
      const first = Array.isArray(frames) ? frames[0]?.transform : undefined;
      expect(first).toContain(drawnAt(saved));
    });

    it("take a sticker removed into the tray with motion off from where they left it", async () => {
      const onCommit = vi.fn<Options["onCommit"]>();
      /** Each spot the board is told to take the sticker off from: the last one stays. */
      const offFrom: Placement[] = [];
      // The tray takes it off at once, through the board's remove as React last drew it.
      const tray = trayDropping(() => {
        offFrom.push(sticker.placement);
        return Promise.resolve(true);
      });
      show({ onCommit, tray, onRemove: (_, at) => offFrom.push(at ?? sticker.placement) });
      pressRight(2);
      await act(async () => void keyDown("Delete", stickerEl()));

      const [, saved] = onCommit.mock.calls[0];
      expect(offFrom.at(-1)).toEqual(saved);
    });

    it("take a sticker removed before the tray has loaded off from where they left it", () => {
      const onCommit = vi.fn<Options["onCommit"]>();
      const onRemove = vi.fn<Options["onRemove"]>();
      show({ onCommit, onRemove });
      pressRight(2);
      press("Delete", stickerEl());
      const [, saved] = onCommit.mock.calls[0];
      expect(onRemove).toHaveBeenCalledExactlyOnceWith(sticker.id, saved);
    });
  });
});

describe("useBoardGestures' focus on a sticker that leaves the board", () => {
  /** Three stickers in a row, read from the left. */
  const [a, b, c] = ["a", "b", "c"].map((id, i) => ({
    ...sticker,
    id,
    placement: { ...sticker.placement, x: 0.2 + 0.3 * i },
  }));
  const showRow = (
    stickers: readonly BoardSticker[],
    tray: RefObject<StickerTrayHandle | null>,
    selected: string | null = null,
  ) => show({ stickers, tray, selected });
  const focusedId = () =>
    document.activeElement instanceof HTMLElement
      ? document.activeElement.dataset.stickerId
      : undefined;

  it("goes to the next sticker along, else the one before it, else the Zipper, as it leaves", () => {
    const focusZipper = vi.fn();
    const tray = trayWith({ focusZipper });
    /** `gone` leaves with focus on it, as a gift takes it off the board. */
    const leave = (gone: BoardSticker, ...stays: BoardSticker[]) => {
      act(() => stickerEl(gone.id).focus());
      showRow(stays, tray);
    };
    showRow([a, b, c], tray);
    leave(b, a, c);
    expect(focusedId()).toBe("c");
    leave(c, a);
    expect(focusedId()).toBe("a");
    expect(focusZipper).not.toHaveBeenCalled();
    leave(a);
    expect(focusZipper).toHaveBeenCalledOnce();
  });

  it("leaves focus that has gone elsewhere where it is", () => {
    const elsewhere = document.createElement("button");
    document.body.append(elsewhere);
    showRow([a, b, c], noTray);
    act(() => stickerEl("b").focus());
    act(() => elsewhere.focus());
    showRow([a, c], noTray);
    expect(document.activeElement).toBe(elsewhere);
    elsewhere.remove();
  });

  it("moves on at once on Remove, to the Zipper when it was the last sticker", () => {
    const focusZipper = vi.fn();
    showRow([a], trayWith({ focusZipper }), "a");
    act(() => stickerEl("a").focus());
    press("Delete", stickerEl("a"));
    expect(focusZipper).toHaveBeenCalledOnce();
  });
});
