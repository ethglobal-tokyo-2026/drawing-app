// @vitest-environment happy-dom
import { act, useRef, type RefObject } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardSticker } from "./boardSticker";
import { fieldOf } from "./placement";
import type { StickerTrayHandle } from "./tray/StickerTray";
import { useBoardGestures } from "./useBoardGestures";
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

describe("useBoardGestures", () => {
  it("lets a sticker on its way into the tray take no new gesture, so nothing done meanwhile is undone", async () => {
    let land: (into: boolean) => void = () => {};
    const boardDrop = vi
      .fn<StickerTrayHandle["boardDrop"]>()
      .mockReturnValueOnce(new Promise((resolve) => (land = resolve)))
      .mockResolvedValue(false);
    const tray: RefObject<StickerTrayHandle | null> = {
      current: {
        isOpen: false,
        open: () => Promise.resolve(false),
        close: () => Promise.resolve(false),
        boardDrag: () => null,
        boardDrop,
        escape: () => false,
      },
    };
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
    expect(onCommit).toHaveBeenCalledOnce();

    press("Escape");
    expect(onSelect).toHaveBeenLastCalledWith(null);
    expect(document.activeElement).toBe(el("b"));
  });
});
