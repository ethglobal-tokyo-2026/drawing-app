// @vitest-environment happy-dom
import { act, createRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BoardSticker } from "../boardSticker";
import { StickerTray, type StickerTrayHandle } from "./StickerTray";
import type { TrayBoard } from "./trayEngine";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let board: HTMLDivElement;
let root: Root;
const tray = createRef<StickerTrayHandle>();

const sticker = (id: string, createdAt: number, on: boolean): BoardSticker => ({
  id,
  no: createdAt,
  createdAt,
  timeUsed: 120,
  blob: new Blob(),
  width: 100,
  height: 80,
  // A stored cut line, so its shape is known without reading an image.
  outline: "M10.0 10.0L90.0 10.0L90.0 70.0L10.0 70.0Z",
  urls: { png: `${id}.png`, mask: `${id}-mask.png` },
  placement: { on, x: 0.5, y: 0.5, s: 0.3, r: 0, z: 1 },
});
const api: TrayBoard = {
  stickerRect: () => null,
  sizeFor: () => ({ w: 100, h: 80 }),
  place: () => Promise.resolve(null),
  remove: () => {},
  pulse: () => {},
};
const render = (stickers: BoardSticker[], side: Partial<TrayBoard> = {}) =>
  act(() =>
    root.render(
      <StickerTray
        ref={tray}
        board={board}
        stickers={stickers}
        gifts={new Map()}
        api={{ ...api, ...side }}
      />,
    ),
  );
const slotOf = (id: string) => board.querySelector(`.tray__slot[data-id="${id}"]`);
const stateOf = (id: string) => slotOf(id)?.getAttribute("data-state");

beforeEach(() => {
  // Reduced motion: the tray opens and shuts at once. happy-dom's own animations reject unhandled.
  vi.spyOn(window, "matchMedia").mockReturnValue(window.matchMedia("all"));
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  // happy-dom lays nothing out: every box is given the board's size, so the Zipper draws its mouth.
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(390);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(657);
  host = document.createElement("div");
  board = document.createElement("div");
  document.body.append(host, board);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  board.remove();
  vi.restoreAllMocks();
});

describe("StickerTray", () => {
  it("follows the board's stickers, catching up as it shows, and leaves with the board", async () => {
    render([sticker("a", 1, true), sticker("b", 2, false)]);
    expect(stateOf("a")).toBe("used");
    expect(stateOf("b")).toBe("here");

    const drawn = slotOf("a");
    render([sticker("a", 1, false), sticker("b", 2, false)]);
    // Shut, the change waits for it to show.
    expect(slotOf("a")).toBe(drawn);
    await act(async () => void (await tray.current?.open()));
    expect(stateOf("a")).toBe("here");

    act(() => root.unmount());
    expect(board.querySelector(".tray")).toBeNull();
  });

  it("refuses a second drop of a sticker already on its way into its used sticker silhouette", async () => {
    const remove = vi.fn();
    render([sticker("a", 1, true)], { remove });
    // Let go at the shut tray's edge: it opens for the sticker before taking it.
    const atEdge = { x: 380, y: 300 };
    let first = Promise.resolve(false);
    let again = Promise.resolve(true);
    await act(async () => {
      first = tray.current?.boardDrop("a", atEdge) ?? first;
      again = tray.current?.boardDrop("a", atEdge) ?? again;
      await first;
    });
    expect(await again).toBe(false);
    expect(await first).toBe(true);
    expect(remove).toHaveBeenCalledTimes(1);
  });
});
