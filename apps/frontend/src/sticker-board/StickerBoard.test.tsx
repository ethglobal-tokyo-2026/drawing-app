// @vitest-environment happy-dom
import type {
  BoardSticker as ApiBoardSticker,
  StickerBoard as LoadedBoard,
} from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { boardSticker } from "../api/testFixtures";
import { emptyApi, renderWithApi, TEST_ME, TEST_OWNER } from "../api/testing";
import { toPerson } from "../api/views";
import { forgetBoardComplete } from "./boardComplete";
import { placeUnplaced, toBoardSticker } from "./boardSticker";
import { keepBoard, keptBoardFor, readKeptBoardAgain } from "./lastBoard";
import { StickerBoard } from "./StickerBoard";

// The board's chat menu and Privy reach LINE's SDK; nothing here needs it to answer.
vi.mock("@line/liff", () => ({ default: { isApiAvailable: () => false } }));
vi.mock("../line/liff", () => ({
  liffMockActive: true,
  useLine: () => ({
    status: "ready",
    profile: { userId: "U1", displayName: "You" },
    inClient: true,
  }),
}));

let unmount = () => {};
afterEach(async () => {
  // The board loads its sheets, detail and stat board in the background; they land before it goes.
  await act(() => vi.dynamicImportSettled());
  unmount();
});

beforeEach(() => {
  localStorage.clear();
  readKeptBoardAgain();
  forgetBoardComplete();
});

const at = (x: number) => ({ onBoard: true, x, y: 0.5, scale: 0.3, rotation: 0, z: 1 });
const shownIds = (host: HTMLElement) =>
  [...host.querySelectorAll<HTMLElement>(".placed-sticker")].map((el) => el.dataset.stickerId);
const keep = (userId: string, ...stickers: ApiBoardSticker[]) =>
  keepBoard(userId, {
    owner: toPerson(TEST_OWNER),
    stickers: placeUnplaced(stickers.map(toBoardSticker)).stickers,
  });

describe("StickerBoard with the board kept on this phone", () => {
  it("draws the last board at once, with no loading shapes, then swaps in the fresh board", async () => {
    const a = boardSticker({ placement: at(0.3) });
    const b = boardSticker({ placement: at(0.7) });
    keep(TEST_ME.id, a);
    let answer: (board: LoadedBoard) => void = () => {};
    const api = emptyApi({ stickerBoard: () => new Promise((resolve) => (answer = resolve)) });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    expect(view.host.querySelectorAll(".board-loading-sticker")).toHaveLength(0);
    expect(shownIds(view.host)).toEqual([a.stickerId]);

    await act(async () => answer({ owner: TEST_OWNER, boardStickers: [a, b] }));
    expect(new Set(shownIds(view.host))).toEqual(new Set([a.stickerId, b.stickerId]));
    // The fresh board is kept for the next open.
    expect(keptBoardFor(TEST_ME.id)?.stickers.map((s) => s.id)).toEqual([a.stickerId, b.stickerId]);
  });

  it("takes the fresh board's spots over the kept ones", async () => {
    const a = boardSticker({ placement: at(0.3) });
    keep(TEST_ME.id, a);
    const moved = { ...a, placement: at(0.6) };
    const api = emptyApi({
      stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers: [moved] }),
    });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    await act(async () => {});
    expect(keptBoardFor(TEST_ME.id)?.stickers[0].placement.x).toBe(0.6);
  });

  it("never draws a board kept for someone else, and forgets it", () => {
    keep("someone-else", boardSticker({ placement: at(0.3) }));
    const api = emptyApi({ stickerBoard: () => new Promise(() => {}) });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    expect(shownIds(view.host)).toEqual([]);
    expect(view.host.querySelectorAll(".board-loading-sticker").length).toBeGreaterThan(0);
    expect(localStorage.getItem("draw.lastBoard")).toBeNull();
  });
});

describe("StickerBoard while it loads", () => {
  it("shows faint sticker shapes until the board's stickers arrive", async () => {
    let answer: (board: LoadedBoard) => void = () => {};
    const api = emptyApi({ stickerBoard: () => new Promise((resolve) => (answer = resolve)) });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    const shapes = () => view.host.querySelectorAll(".board-loading-sticker").length;
    expect(shapes()).toBeGreaterThan(0);
    expect(view.host.querySelector('[role="status"]')?.textContent).toBe("Loading your stickers");

    await act(async () => answer({ owner: TEST_OWNER, boardStickers: [] }));
    expect(shapes()).toBe(0);
  });
});
