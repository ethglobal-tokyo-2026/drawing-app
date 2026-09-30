// @vitest-environment happy-dom
import type {
  BoardSticker as ApiBoardSticker,
  StickerBoard as LoadedBoard,
  Person,
} from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { boardSticker, people } from "../api/testFixtures";
import { emptyApi, renderWithApi, TEST_ME, TEST_OWNER } from "../api/testing";
import { toPerson } from "../api/views";
import { forgetNoticedHere, markNoticed, noticeReceivesFromNow } from "../giving/noticedGifts";
import { forgetBoardComplete } from "./boardComplete";
import { placeUnplaced, toBoardSticker } from "./boardSticker";
import { keepBoard, keptBoardFor, readKeptBoardAgain } from "./lastBoard";
import { StickerBoard } from "./StickerBoard";

// The board's chat menu and Privy reach LINE's SDK; nothing here needs it to answer.
vi.mock("@line/liff", () => ({ default: { isApiAvailable: () => false } }));
// The stat board mounts once the board is idle; its developer slip's LINE details read LIFF's context.
vi.mock("../line/LineDetails", () => ({ LineDetails: () => null }));
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
  forgetNoticedHere();
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

describe("StickerBoard after a gift", () => {
  const given = () =>
    boardSticker({
      placement: at(0.3),
      held: false,
      givenTo: { receiver: people.bob, receivedAt: "2026-09-23T11:52:00.000Z" },
    });
  const show = async (...boardStickers: ApiBoardSticker[]) => {
    const api = emptyApi({
      stickerBoard: () => Promise.resolve({ owner: TEST_OWNER, boardStickers }),
    });
    const view = renderWithApi(<StickerBoard onDraw={() => {}} onOpenGift={() => {}} />, api);
    unmount = view.unmount;
    await act(async () => {});
    const stage = view.host.querySelector<HTMLElement>(".board-stage");
    if (!stage) throw new Error("The board has no stage");
    return stage;
  };

  it("leaves a given sticker off the board, and out of the count", async () => {
    const gone = given();
    const kept = boardSticker({ placement: at(0.7) });
    const stage = await show(gone, kept);
    expect(shownIds(stage)).toEqual([kept.stickerId]);
    expect(stage.querySelector(`[data-sticker-id="${gone.stickerId}"]`)).toBeNull();
    expect(stage.querySelector(".placed-sticker")?.getAttribute("aria-label")).toMatch(/1 of 1$/);
    expect(stage.querySelector(".board-blank")).toBeNull();
  });

  it("shows the empty board when every sticker was given", async () => {
    const stage = await show(given());
    expect(shownIds(stage)).toEqual([]);
    expect(stage.querySelector(".board-blank")).not.toBeNull();
  });

  it("opens a given sticker among the stickers you gave from its blank spot in the tray", async () => {
    const gone = given();
    // Noticed already, so no notice covers the board.
    markNoticed([
      { stickerId: gone.stickerId, receivedAt: Date.parse("2026-09-23T11:52:00.000Z") },
    ]);
    const stage = await show(gone, boardSticker({ placement: at(0.7) }));
    // The sticker tray loads with the board.
    await act(() => vi.dynamicImportSettled());
    const spot = stage
      .closest(".board")
      ?.querySelector<HTMLElement>(`.tray__slot[data-id="${gone.stickerId}"]`);
    expect(spot?.getAttribute("aria-label")).toMatch(/^No\.\d{4}, given to @bob\. Open it$/);

    act(() => spot?.click());
    await act(() => vi.dynamicImportSettled());
    const detail = document.querySelector(".sticker-detail");
    expect(detail?.querySelector("nav")?.getAttribute("aria-label")).toBe("Stickers you gave");
    // Only the stickers you gave page past, and it says who has this one.
    expect(detail?.querySelectorAll(".sticker-detail__thumb")).toHaveLength(1);
    expect(detail?.textContent).toContain("You gave it to @bob");
  });

  const gave = (receiver: Person, receivedAt: string) =>
    boardSticker({ held: false, givenTo: { receiver, receivedAt } });
  const noticeTitle = () => document.querySelector(".gift-received-notice h1")?.textContent?.trim();

  it("draws no notice for gifts received before this device's first board", async () => {
    await show(
      gave(people.mika, "2026-09-22T11:52:00.000Z"),
      gave(people.bob, "2026-09-23T11:52:00.000Z"),
    );
    expect(noticeTitle()).toBeUndefined();
  });

  it("gives each gift received since the last visit its own notice, newest first", async () => {
    // This device has shown a notice before.
    noticeReceivesFromNow([]);
    await show(
      gave(people.mika, "2026-09-22T11:52:00.000Z"),
      gave(people.bob, "2026-09-23T11:52:00.000Z"),
    );
    const title = noticeTitle;
    const close = () =>
      act(() => document.querySelector<HTMLElement>(".gift-received-notice .label-btn")?.click());
    expect(title()).toBe("@bob received your sticker");
    close();
    expect(title()).toBe("@mika received your sticker");
    close();
    expect(document.querySelector(".gift-received-notice")).toBeNull();
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
