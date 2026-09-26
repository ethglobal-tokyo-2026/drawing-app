import { describe, expect, it } from "vitest";
import { boardSticker, people, sticker } from "../api/mock/fixtures";
import { placeUnplaced, toBoardSticker } from "./boardSticker";

const spot = { onBoard: true, x: 0.3, y: 0.4, scale: 0.25, rotation: -6, z: 4 };

describe("board stickers", () => {
  it("maps the API's board sticker to what the board draws", () => {
    const b = toBoardSticker(
      boardSticker({
        sticker: sticker({ id: "s1", number: 147, sealedAt: "2026-09-20T03:00:00.000Z" }),
        placement: spot,
        held: false,
        givenTo: { receiver: people.bob, receivedAt: "2026-09-23T03:00:00.000Z" },
      }),
    );
    expect(b).toMatchObject({
      id: "s1",
      no: 147,
      createdAt: Date.UTC(2026, 8, 20, 3),
      placement: { on: true, x: 0.3, y: 0.4, s: 0.25, r: -6, z: 4 },
      held: false,
      givenTo: { receiver: { handle: "bob" }, receivedAt: Date.UTC(2026, 8, 23, 3) },
    });
  });

  it("gives unplaced stickers a spot on top, once, and keeps the placed ones where they are", () => {
    const placed = toBoardSticker(boardSticker({ placement: spot }));
    const loose = toBoardSticker(boardSticker());
    const kept: string[] = [];
    const [a, b] = placeUnplaced([placed, loose], (s) => kept.push(s.id));
    expect(a?.placement).toEqual(placed.placement);
    expect(b?.placement.on).toBe(true);
    expect(b?.placement.z).toBeGreaterThan(spot.z);
    expect(kept).toEqual([loose.id]);
  });
});
