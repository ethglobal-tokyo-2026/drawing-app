// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_OWNER } from "../api/testing";
import { toPerson } from "../api/views";
import { testStickerUrls } from "../stickers/testStickerUrls";
import type { PlacedBoardSticker } from "./boardSticker";
import {
  forgetBoardUnlessFor,
  forgetsSoFar,
  KEEP_WRITE_WITHIN_MS,
  keepBoard,
  keptBoardFor,
  readKeptBoardAgain,
  type KeptBoard,
} from "./lastBoard";

const KEY = "draw.lastBoard";

const sticker = (id: string): PlacedBoardSticker => ({
  id,
  no: 1,
  createdAt: 0,
  timeUsed: 60,
  drawnWidth: 480,
  drawnHeight: 480,
  width: 600,
  height: 600,
  nsfw: false,
  kyotoSeikaSubjects: null,
  outline: "M0 0L600 0L600 600Z",
  urls: testStickerUrls(`/api/images/${id}`),
  placements: { phone: { on: true, x: 0.5, y: 0.5, s: 1, r: 0, z: 1 }, large: null },
  artist: toPerson(TEST_OWNER),
  held: true,
  hasTimelapse: false,
  trail: { timesGiven: 0, newestHasGratitude: false },
  givenTo: null,
  openGift: null,
  seenAt: null,
  arrivedAt: 0,
});
const board: KeptBoard = { owner: toPerson(TEST_OWNER), stickers: [sticker("s1"), sticker("s2")] };

beforeEach(() => {
  localStorage.clear();
  readKeptBoardAgain();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

/** The board the next open of the app starts from, as it reads storage. */
const nextOpen = () => {
  readKeptBoardAgain();
  return keptBoardFor("me");
};

describe("the board kept on this phone", () => {
  it("gives back the last board shown to the person signed in, without outlines, once the page is idle or as it hides", () => {
    // Without requestIdleCallback, as in Safari, the write waits on a timer.
    vi.stubGlobal("requestIdleCallback", undefined);
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    keepBoard("me", board, forgetsSoFar());
    vi.advanceTimersByTime(KEEP_WRITE_WITHIN_MS);
    const kept = nextOpen();
    expect(kept?.stickers.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(kept?.stickers[0]).not.toHaveProperty("outline");
    expect(kept?.stickers[0].placements).toEqual(board.stickers[0].placements);
    expect(kept?.owner).toEqual(board.owner);

    keepBoard("me", { ...board, stickers: [sticker("s2")] }, forgetsSoFar());
    dispatchEvent(new Event("pagehide"));
    expect(nextOpen()?.stickers.map((s) => s.id)).toEqual(["s2"]);
  });

  it("forgets it when someone else signs in", () => {
    keepBoard("me", board, forgetsSoFar());
    expect(keptBoardFor("someone-else")).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(keptBoardFor("me")).toBeNull();
  });

  it("forgets it at sign-in unless it's the same person's", () => {
    keepBoard("me", board, forgetsSoFar());
    forgetBoardUnlessFor("me");
    expect(keptBoardFor("me")).not.toBeNull();
    forgetBoardUnlessFor("someone-else");
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("forgets one another build kept, or one that isn't JSON", () => {
    localStorage.setItem(KEY, JSON.stringify({ build: "an older build", userId: "me", board }));
    readKeptBoardAgain();
    expect(keptBoardFor("me")).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();

    vi.spyOn(console, "error").mockImplementation(() => {});
    localStorage.setItem(KEY, "{not json");
    readKeptBoardAgain();
    expect(keptBoardFor("me")).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("forgets one another build kept as the app's code starts", async () => {
    localStorage.setItem(KEY, JSON.stringify({ build: "an older build", userId: "me", board }));
    vi.resetModules();
    const started = await import("./lastBoard");
    expect(started.keptBoardFor("me")).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("still gives the board back in memory when storage refuses to keep it", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    // A stand-in storage: spying on happy-dom's own doesn't reach it.
    vi.stubGlobal("localStorage", {
      getItem: () => null,
      removeItem: () => {},
      setItem: () => {
        throw new DOMException("Full", "QuotaExceededError");
      },
    });
    keepBoard("me", board, forgetsSoFar());
    dispatchEvent(new Event("pagehide"));
    expect(keptBoardFor("me")?.stickers).toHaveLength(2);
    expect(error).toHaveBeenCalledWith(
      "The board couldn't be kept on this phone for its next open",
      expect.any(DOMException),
    );
  });
});
