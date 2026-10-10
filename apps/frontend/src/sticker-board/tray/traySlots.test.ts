import { describe, expect, it } from "vitest";
import type { BoardStickerView } from "../boardSticker";
import { PER_SHEET, newSlots, traySlots } from "./traySlots";

const sticker = (
  id: string,
  arrivedAt: number,
  on = false,
  gift: Partial<Pick<BoardStickerView, "held" | "openGift">> = {},
) => ({
  id,
  no: arrivedAt,
  arrivedAt,
  placement: { on, x: 0.5, y: 0.5, s: 0.3, r: 0, z: 1 },
  held: true,
  openGift: null,
  ...gift,
});
const sent = { openGift: { id: "x", status: "sent" as const } };
const packed = { openGift: { id: "y", status: "packed" as const } };

describe("traySlots", () => {
  it("keeps each sticker's slot for good, in arrival order, a given one's too", () => {
    const given = { held: false };
    const later = Array.from({ length: PER_SHEET }, (_, i) => sticker(`later-${i}`, 3 + i));
    const slots = traySlots([sticker("b", 2, false, given), sticker("a", 1), ...later]);
    expect(slots.map((s) => s.id).slice(0, 3)).toEqual(["a", "b", "later-0"]);
    // Nothing after a given sticker moves up into its slot: the next sheet starts where it would.
    const before = traySlots([sticker("a", 1), sticker("b", 2), ...later]);
    expect(slots.map((s) => [s.sheet, s.slot])).toEqual(before.map((s) => [s.sheet, s.slot]));
    expect(slots.at(-1)?.sheet).toBe(1);
  });

  it("marks stickers out on the board, in the bag, on their way or received, or here", () => {
    const slots = traySlots([
      sticker("on", 1, true),
      sticker("sent", 2, true, sent),
      sticker("received", 3, true, { held: false }),
      sticker("here", 4),
      sticker("bagged", 5, true, packed),
    ]);
    expect(slots.map((s) => s.state)).toEqual(["used", "onItsWay", "given", "here", "inTheBag"]);
  });
});

describe("newSlots", () => {
  it("marks as new what arrived today and the open tray hasn't shown, on its sheet or as its hole", () => {
    const slots = traySlots([
      sticker("old", 1),
      sticker("seen", 2),
      sticker("sent", 2, false, sent),
      sticker("bagged", 2, true, packed),
      sticker("on the board", 2, true),
      sticker("new", 2),
    ]);
    const isNew = newSlots(slots, {
      today: "2026-09-26",
      dayOf: (t) => (t === 2 ? "2026-09-26" : "2026-09-25"),
      seen: new Set(["seen"]),
    });
    // A sticker sealed or received lands on the board, so its hole is NEW until the tray shows it.
    expect([...isNew]).toEqual(["on the board", "new"]);
  });
});
