// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { TEST_OWNER } from "../api/testing";
import { toPerson } from "../api/views";
import { testStickerUrls } from "../stickers/testStickerUrls";
import type { PlacedBoardSticker } from "./boardSticker";
import {
  forgetBoardUnlessFor,
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
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("the board kept on this phone", () => {
  it("gives back the last board shown to the person signed in, without outlines", () => {
    keepBoard("me", board);
    readKeptBoardAgain();
    const kept = keptBoardFor("me");
    expect(kept?.stickers.map((s) => s.id)).toEqual(["s1", "s2"]);
    expect(kept?.stickers[0]).not.toHaveProperty("outline");
    expect(kept?.stickers[0].placements).toEqual(board.stickers[0].placements);
    expect(kept?.owner).toEqual(board.owner);
  });

  it("forgets it when someone else signs in", () => {
    keepBoard("me", board);
    expect(keptBoardFor("someone-else")).toBeNull();
    expect(localStorage.getItem(KEY)).toBeNull();
    expect(keptBoardFor("me")).toBeNull();
  });

  it("forgets it at sign-in unless it's the same person's", () => {
    keepBoard("me", board);
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
    keepBoard("me", board);
    expect(keptBoardFor("me")?.stickers).toHaveLength(2);
    expect(error).toHaveBeenCalledWith(
      "The board couldn't be kept on this phone for its next open",
      expect.any(DOMException),
    );
  });
});
