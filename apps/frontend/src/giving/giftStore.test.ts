import { describe, expect, it, vi } from "vitest";
import { createGiftStore, giftStatusBySticker, memoryStorage, type GiftRecord } from "./giftStore";

const packed = (id: string, stickerId: string, packedAt = 1): GiftRecord => ({
  id,
  stickerId,
  state: "packed",
  packedAt,
});

describe("gift store", () => {
  it("keeps gifts across reloads", () => {
    const storage = memoryStorage();
    createGiftStore(storage).put(packed("g1", "s1"));
    expect(createGiftStore(storage).list()).toEqual([packed("g1", "s1")]);
  });

  it("keeps the recipient of a gift given to an artist in the app, for the board to name", () => {
    const storage = memoryStorage();
    const given: GiftRecord = { ...packed("g1", "s1"), state: "sent", sentAt: 2, to: "mika" };
    createGiftStore(storage).put(given);
    const reloaded = createGiftStore(storage).list();
    expect(reloaded).toEqual([given]);
    expect(giftStatusBySticker(reloaded).get("s1")).toMatchObject({ state: "sent", to: "mika" });
  });

  it("skips unreadable gifts, says which, and leaves them in storage for review", () => {
    const storage = memoryStorage({
      "draw.gift.broken": "{not json",
      "draw.gift.odd": JSON.stringify({ id: "odd", stickerId: "s9", state: "lost" }),
      "draw.tickets": "{}",
    });
    const report = vi.fn();
    const store = createGiftStore(storage, report);
    store.put(packed("g1", "s1"));

    expect(store.list()).toEqual([packed("g1", "s1")]);
    const reported = report.mock.calls.map((call) => String(call[0])).join("\n");
    expect(reported).toContain("draw.gift.broken");
    expect(reported).toContain("draw.gift.odd");
    expect(reported).not.toContain("draw.tickets");
    expect(storage.entries.get("draw.gift.broken")).toBe("{not json");
  });

  it("hands React the same snapshot until a gift changes", () => {
    const store = createGiftStore(memoryStorage());
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.snapshot();
    expect(store.snapshot()).toBe(before);

    store.put(packed("g1", "s1"));
    expect(listener).toHaveBeenCalled();
    expect(store.snapshot()).not.toBe(before);
    expect(store.snapshot()).toEqual([packed("g1", "s1")]);
  });
});

describe("giftStatusBySticker", () => {
  it("tells which stickers are packed or sent, and when", () => {
    const status = giftStatusBySticker([
      packed("g1", "in-bag", 10),
      { ...packed("g2", "gone", 20), state: "sent", sentAt: 25 },
      { ...packed("g3", "gone", 5), state: "not_sent", closedAt: 6, reason: "picker_cancelled" },
      { ...packed("g4", "back", 30), state: "not_sent", closedAt: 31, reason: "taken_out" },
    ]);
    expect(status.get("in-bag")).toEqual({ giftId: "g1", state: "packed", packedAt: 10 });
    expect(status.get("gone")).toEqual({ giftId: "g2", state: "sent", packedAt: 20, sentAt: 25 });
    expect(status.has("back")).toBe(false);
  });
});
