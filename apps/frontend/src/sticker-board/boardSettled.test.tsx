// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

beforeEach(() => {
  // The board settles once per page load, so each test starts from a fresh module.
  vi.resetModules();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  performance.clearMarks();
});

interface Board {
  stickers: string | null;
  failed?: boolean;
  chipsPlaying?: boolean;
}

/**
 * A board stage whose settling the test watches: with any stickers, two sticker images, still loading.
 */
async function openBoard() {
  const { boardSettled, useSettleBoard } = await import("./boardSettled");
  let settled = false;
  void boardSettled().then(() => (settled = true));
  function Stage({ stickers, failed = false, chipsPlaying = false }: Board) {
    const stage = useRef<HTMLDivElement>(null);
    useSettleBoard(stage, { stickers, failed, chipsPlaying });
    return (
      <div ref={stage}>
        {stickers && (
          <>
            <img alt="" src="/a.png" ref={loading} />
            <img alt="" src="/b.png" ref={loading} />
          </>
        )}
      </div>
    );
  }
  const show = (board: Board) => act(async () => root.render(<Stage {...board} />));
  const images = () => Array.from(host.querySelectorAll("img"));
  const flush = () => act(() => Promise.resolve());
  return { show, images, flush, settled: () => settled };
}

/** happy-dom counts every image loaded; these load when the test says. */
function loading(img: HTMLImageElement | null) {
  if (img) Object.defineProperty(img, "complete", { value: false, configurable: true });
}

const load = (img: HTMLImageElement | undefined) =>
  act(async () => {
    img?.dispatchEvent(new Event("load"));
  });

describe("the board settling", () => {
  it("waits for the stickers' images, then for the artist chips", async () => {
    const board = await openBoard();
    await board.show({ stickers: null });
    await board.flush();
    expect(board.settled()).toBe(false);

    await board.show({ stickers: "a b", chipsPlaying: true });
    const [a, b] = board.images();
    await load(a);
    await board.flush();
    expect(board.settled()).toBe(false);
    // A broken image is as loaded as it will get.
    await act(async () => {
      b?.dispatchEvent(new Event("error"));
    });
    await board.flush();
    expect(board.settled()).toBe(false);

    await board.show({ stickers: "a b", chipsPlaying: false });
    await board.flush();
    expect(board.settled()).toBe(true);
    expect(performance.getEntriesByName("board-settled")).toHaveLength(1);
  });

  it("settles at once when the board has no stickers, or didn't load", async () => {
    const empty = await openBoard();
    await empty.show({ stickers: "" });
    await empty.flush();
    expect(empty.settled()).toBe(true);

    vi.resetModules();
    const failed = await openBoard();
    await failed.show({ stickers: null, failed: true });
    await failed.flush();
    expect(failed.settled()).toBe(true);
  });

  it("settles once per page load", async () => {
    const board = await openBoard();
    await board.show({ stickers: "" });
    await board.flush();
    await board.show({ stickers: null });
    await board.show({ stickers: "" });
    await board.flush();
    expect(performance.getEntriesByName("board-settled")).toHaveLength(1);
  });
});
