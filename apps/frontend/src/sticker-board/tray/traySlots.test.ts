import { describe, expect, it } from "vitest";
import type { StickerGiftStatus } from "../../giving/giftStore";
import { newSlots, traySlots } from "./traySlots";

const sticker = (id: string, createdAt: number, on?: boolean) => ({
  id,
  no: createdAt,
  createdAt,
  placement: on === undefined ? undefined : { on, x: 0.5, y: 0.5, s: 0.3, r: 0, z: 1 },
});
const sent: StickerGiftStatus = { giftId: "x", state: "sent", packedAt: 1, sentAt: 2 };
const packed: StickerGiftStatus = { giftId: "y", state: "packed", packedAt: 1 };

describe("traySlots", () => {
  it("keeps each sticker's slot for good, in arrival order", () => {
    const slots = traySlots([sticker("b", 2), sticker("a", 1), sticker("c", 3)], new Map());
    expect(slots.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(slots.map((s) => [s.sheet, s.slot])).toEqual([
      [0, 0],
      [0, 1],
      [0, 2],
    ]);
  });

  it("marks stickers out on the board, given away, or here", () => {
    const gifts = new Map<string, StickerGiftStatus>([
      ["g", sent],
      ["bagged", packed],
    ]);
    const slots = traySlots(
      [
        sticker("on", 1, true),
        sticker("g", 2, true),
        sticker("here", 3, false),
        sticker("bagged", 4, false),
      ],
      gifts,
    );
    expect(slots.map((s) => s.state)).toEqual(["used", "given", "here", "here"]);
  });
});

describe("newSlots", () => {
  it("marks as new what's in the tray, arrived today and hasn't been seen", () => {
    const slots = traySlots(
      [
        sticker("old", 1, false),
        sticker("seen", 2, false),
        sticker("given", 2, false),
        sticker("on the board", 2, true),
        sticker("new", 2, false),
      ],
      new Map([["given", sent]]),
    );
    const isNew = newSlots(slots, {
      today: "2026-09-26",
      dayOf: (t) => (t === 2 ? "2026-09-26" : "2026-09-25"),
      seen: new Set(["seen"]),
    });
    expect([...isNew]).toEqual(["new"]);
  });
});
