import { describe, expect, it } from "vitest";
import type { BoardStickerView } from "./boardSticker";
import { focusStep, inGiftsLast, readingOrder } from "./stickerOrder";

// A board of three rows, each a little uneven, the way stickers get stuck on.
const board = [
  { id: "onigiri", x: 260, y: 221 },
  { id: "cat", x: 113, y: 228 },
  { id: "moon", x: 250, y: 430 },
  { id: "whale", x: 116, y: 457 },
  { id: "sunset", x: 263, y: 625 },
  { id: "star", x: 173, y: 639 },
];

describe("readingOrder", () => {
  it("reads rows from the top and each row from the left, however uneven the row", () => {
    expect(readingOrder(board)).toEqual(["cat", "onigiri", "whale", "moon", "star", "sunset"]);
  });
});

describe("inGiftsLast", () => {
  type GiftStatus = NonNullable<BoardStickerView["openGift"]>["status"];
  const yours = (id: string, gift?: GiftStatus) => ({
    id,
    openGift: gift ? { id: `gift-${id}`, status: gift } : null,
  });

  it("puts the stickers in a gift after the rest, each part in the order it came", () => {
    // In the order they arrived, the one on its way ahead of the one in the bag.
    const arrived = [
      yours("onigiri"),
      yours("cat", "sent"),
      yours("moon"),
      yours("whale", "packed"),
      yours("star"),
    ];
    expect(inGiftsLast(arrived).map((s) => s.id)).toEqual([
      "onigiri",
      "moon",
      "star",
      "cat",
      "whale",
    ]);
  });
});

describe("focusStep", () => {
  const step = (from: string, key: string) => focusStep(board, from, key);

  it("steps through reading order with Left and Right, stopping at the ends", () => {
    expect(step("onigiri", "ArrowRight")).toBe("whale");
    expect(step("whale", "ArrowLeft")).toBe("onigiri");
    expect(step("cat", "ArrowLeft")).toBe("cat");
    expect(step("sunset", "ArrowRight")).toBe("sunset");
  });

  it("goes to the nearest sticker above or below with Up and Down", () => {
    expect(step("cat", "ArrowDown")).toBe("whale");
    expect(step("onigiri", "ArrowDown")).toBe("moon");
    expect(step("sunset", "ArrowUp")).toBe("moon");
    expect(step("cat", "ArrowUp")).toBe("cat");
  });

  it("goes to the first and the last with Home and End, and ignores other keys", () => {
    expect(step("moon", "Home")).toBe("cat");
    expect(step("moon", "End")).toBe("sunset");
    expect(step("moon", "a")).toBeUndefined();
  });
});
