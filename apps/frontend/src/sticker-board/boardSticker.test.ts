import { describe, expect, it } from "vitest";
import { boardSticker, people, sticker } from "../api/mock/fixtures";
import { toPerson } from "../api/views";
import { fromApiPlacement, placeUnplaced, toApiPlacement, toBoardSticker } from "./boardSticker";

describe("toBoardSticker", () => {
  it("draws the API's board sticker with the app's names and milliseconds", () => {
    const placement = { onBoard: false, x: 0.3, y: 0.6, scale: 0.25, rotation: -8, z: 4 };
    const view = toBoardSticker(
      boardSticker({
        sticker: sticker({ number: 147, artist: people.ken, outline: "" }),
        placement,
        held: false,
        givenTo: { receiver: people.bob, receivedAt: "2026-09-23T11:52:00.000Z" },
        seenAt: "2026-09-23T12:00:00.000Z",
        arrivedAt: "2026-09-22T09:00:00.000Z",
      }),
    );
    expect(view.no).toBe(147);
    expect(view.placement).toEqual({ on: false, x: 0.3, y: 0.6, s: 0.25, r: -8, z: 4 });
    expect(view.placement && toApiPlacement(view.placement)).toEqual(placement);
    expect(view.artist).toEqual(toPerson(people.ken));
    expect(view.givenTo).toEqual({
      receiver: toPerson(people.bob),
      receivedAt: Date.UTC(2026, 8, 23, 11, 52),
    });
    expect([view.seenAt, view.arrivedAt]).toEqual([
      Date.UTC(2026, 8, 23, 12),
      Date.UTC(2026, 8, 22, 9),
    ]);
    expect(view).not.toHaveProperty("outline");
  });
});

describe("placeUnplaced", () => {
  it("gives each unplaced sticker its own free spot on top, once, and lists it for saving", () => {
    const at = { onBoard: true, x: 0.5, y: 0.5, scale: 0.3, rotation: 0, z: 3 };
    const list = [boardSticker({ placement: at }), boardSticker(), boardSticker()].map(
      toBoardSticker,
    );
    const { stickers, placed } = placeUnplaced(list);
    expect(stickers[0].placement).toEqual(fromApiPlacement(at));
    expect(placed.map((s) => s.id)).toEqual([list[1].id, list[2].id]);
    const [a, b] = placed.map((s) => s.placement);
    expect([a.x, a.y]).not.toEqual([b.x, b.y]);
    expect(a.on && b.on).toBe(true);
    expect(Math.min(a.z, b.z)).toBeGreaterThan(at.z);
    expect(placeUnplaced(stickers).placed).toEqual([]);
  });

  it("keeps the spots the board already gave its stickers over a reload's", () => {
    const [moved] = placeUnplaced([toBoardSticker(boardSticker())]).stickers;
    const nudged = { ...moved, placement: { ...moved.placement, x: 0.2, r: 12 } };
    const { stickers, placed } = placeUnplaced([{ ...moved, placement: null }], [nudged]);
    expect(stickers[0].placement).toEqual(nudged.placement);
    expect(placed).toEqual([]);
  });
});
