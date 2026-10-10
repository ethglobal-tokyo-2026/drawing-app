import { describe, expect, it } from "vitest";
import { boardSticker, people, sticker, TEST_KYOTO_SEIKA_SUBJECTS } from "../api/testFixtures";
import { toApiPlacement, toPerson, toRecordPlacement } from "../api/views";
import {
  movedIn,
  movedSince,
  onTheBoard,
  placeUnplaced,
  shownIn,
  spotsById,
  toBoardSticker,
} from "./boardSticker";
import { FIRST_SPOT, LAID_OUT_SPOTS, LARGE_LANDING_GROWTH, type Placement } from "./placement";
import { placedAt } from "./testBoardSticker";

describe("toBoardSticker", () => {
  it("draws the API's board sticker with the app's names and milliseconds", () => {
    const placement = { onBoard: false, x: 0.3, y: 0.6, scale: 0.25, rotation: -8, z: 4 };
    const drawn = sticker({
      number: 147,
      artist: people.ken,
      kyotoSeikaSubjects: TEST_KYOTO_SEIKA_SUBJECTS,
    });
    const view = toBoardSticker(
      boardSticker({
        sticker: drawn,
        placement,
        held: false,
        givenTo: { receiver: people.bob, receivedAt: "2026-09-23T11:52:00.000Z" },
        seenAt: "2026-09-23T12:00:00.000Z",
        arrivedAt: "2026-09-22T09:00:00.000Z",
      }),
    );
    expect(view.no).toBe(147);
    expect(view.placements.phone).toEqual({ on: false, x: 0.3, y: 0.6, s: 0.25, r: -8, z: 4 });
    expect(view.placements.phone && toApiPlacement(view.placements.phone)).toEqual(placement);
    expect(view.placements.large).toBeNull();
    expect(view.artist).toEqual(toPerson(people.ken));
    expect(view.givenTo).toEqual({
      receiver: toPerson(people.bob),
      receivedAt: Date.UTC(2026, 8, 23, 11, 52),
    });
    expect([view.seenAt, view.arrivedAt]).toEqual([
      Date.UTC(2026, 8, 23, 12),
      Date.UTC(2026, 8, 22, 9),
    ]);
    expect(view.outline).toBe(drawn.outline);
    expect(view.kyotoSeikaSubjects).toEqual(TEST_KYOTO_SEIKA_SUBJECTS);
  });
});

describe("placeUnplaced", () => {
  it("gives each unplaced sticker its own free spot on top, once, and lists it for saving", () => {
    const at = { onBoard: true, x: 0.5, y: 0.5, scale: 0.3, rotation: 0, z: 3 };
    const list = [boardSticker({ placement: at }), boardSticker(), boardSticker()].map(
      toBoardSticker,
    );
    const { stickers, placed } = placeUnplaced(list);
    expect(stickers[0].placements.phone).toEqual(toRecordPlacement(at));
    expect(placed.map((p) => p.sticker.id)).toEqual([list[1].id, list[2].id]);
    const [a, b] = placed.map(({ spots }) => {
      if (!spots.phone) throw new Error("no phone spot given");
      return spots.phone;
    });
    expect([a.x, a.y]).not.toEqual([b.x, b.y]);
    expect(a.on && b.on).toBe(true);
    expect(Math.min(a.z, b.z)).toBeGreaterThan(at.z);
    expect(placeUnplaced(stickers).placed).toEqual([]);
  });

  it("spreads stickers that arrive together over spots of their own once the laid-out ones are taken", () => {
    const some = () => Array.from({ length: LAID_OUT_SPOTS }, () => toBoardSticker(boardSticker()));
    const onBoard = placeUnplaced(some()).stickers;
    const arrived = some();
    const { stickers, placed } = placeUnplaced([...onBoard, ...arrived]);
    expect(placed.map((p) => p.sticker.id)).toEqual(arrived.map((s) => s.id));
    for (const { sticker: s } of placed)
      for (const other of stickers.filter((o) => o.id !== s.id)) {
        const [a, b] = [s.placements.phone, other.placements.phone];
        expect([a.x, a.y]).not.toEqual([b.x, b.y]);
      }
    // A reload that finds them unplaced again puts them in the same spots.
    expect(placeUnplaced([...onBoard, ...arrived]).stickers).toEqual(stickers);
  });

  it("keeps the spots the board already gave its stickers over a reload's", () => {
    const [moved] = placeUnplaced([toBoardSticker(boardSticker())]).stickers;
    const nudged = {
      ...moved,
      placements: { ...moved.placements, phone: { ...moved.placements.phone, x: 0.2, r: 12 } },
    };
    const { stickers, placed } = placeUnplaced(
      [{ ...moved, placements: { phone: null, large: null } }],
      movedSince([nudged], spotsById([moved])),
    );
    expect(stickers[0].placements).toEqual(nudged.placements);
    expect(placed).toEqual([]);
  });

  it("takes a load's spot in each layout the board didn't move a sticker in", () => {
    const onServer = toBoardSticker(
      boardSticker({ placement: placedAt(0.3), largePlacement: placedAt(0.4) }),
    );
    // Drawn before another device saved the large layout, then dragged on the phone.
    const [drawn] = placeUnplaced([
      { ...onServer, placements: { ...onServer.placements, large: null } },
    ]).stickers;
    const phone = drawn.placements.phone;
    const dragged = {
      ...drawn,
      placements: movedIn(drawn.placements, "phone", { ...phone, x: 0.6 }),
    };
    const raised = { ...drawn, placements: movedIn(drawn.placements, "phone", { ...phone, z: 9 }) };
    const from = spotsById([drawn]);
    expect(movedSince([raised], from).size).toBe(0);
    const { stickers, placed } = placeUnplaced([onServer], movedSince([dragged], from));
    expect(stickers[0].placements).toEqual({
      phone: dragged.placements.phone,
      large: onServer.placements.large,
    });
    expect(placed).toEqual([]);
  });

  it("lands a new sticker as on a board without the stickers given away or in a gift", () => {
    const fresh = toBoardSticker(boardSticker());
    const where = (p: Placement) => ({ x: p.x, y: p.y });
    const alone = where(placeUnplaced([fresh]).stickers[0].placements.phone);
    const atFirstSpot = { ...placedAt(FIRST_SPOT.x), y: FIRST_SPOT.y };
    const gone = [{ held: false }, { openGift: { id: "g", status: "packed" as const, for: null } }];
    for (const left of gone) {
      const leftAt = toBoardSticker(boardSticker({ placement: atFirstSpot, ...left }));
      const [, landed] = placeUnplaced([leftAt, fresh]).stickers;
      expect(where(landed.placements.phone)).toEqual(alone);
    }
  });

  it("lands a new sticker in the large layout too once the board has one, and in the tray there as on the phone", () => {
    const both = boardSticker({ placement: placedAt(0.5), largePlacement: placedAt(0.4) });
    const fresh = boardSticker();
    // Received back: in the tray on the phone, never in the large layout.
    const back = boardSticker({ placement: { ...placedAt(0.6), onBoard: false } });
    const given = boardSticker({ placement: placedAt(0.7), held: false });
    const { placed } = placeUnplaced([both, fresh, back, given].map(toBoardSticker));
    const newSpots = new Map(placed.map((p) => [p.sticker.id, p.spots]));
    expect([...newSpots.keys()]).toEqual([fresh.stickerId, back.stickerId]);
    expect(newSpots.get(fresh.stickerId)).toMatchObject({
      phone: { on: true },
      large: { on: true },
    });
    const backSpots = newSpots.get(back.stickerId) ?? {};
    expect(Object.keys(backSpots)).toEqual(["large"]);
    expect(backSpots.large?.on).toBe(false);
  });

  it("lands a new sticker larger in the large layout than at the same spot on the phone", () => {
    const placed = boardSticker({ placement: placedAt(0.5), largePlacement: placedAt(0.5) });
    const [{ spots }] = placeUnplaced([placed, boardSticker()].map(toBoardSticker)).placed;
    expect(spots.large?.s).toBeGreaterThan(spots.phone?.s ?? Infinity);
    expect(spots.large?.s).toBeCloseTo((spots.phone?.s ?? 0) * LARGE_LANDING_GROWTH);
  });

  it("leaves the large layout to be derived while the board has none", () => {
    const { stickers, placed } = placeUnplaced(
      [boardSticker({ placement: placedAt(0.5) }), boardSticker()].map(toBoardSticker),
    );
    expect(placed.map((p) => Object.keys(p.spots))).toEqual([["phone"]]);
    expect(stickers.map((s) => s.placements.large)).toEqual([null, null]);
  });
});

describe("onTheBoard", () => {
  it("takes a sticker you hold stuck on, and none in a gift, packed or on its way, nor one given away", () => {
    const inAGift = (status: "packed" | "sent") => ({ id: `gift-${status}`, status, for: null });
    const stuckOn = [
      {},
      { openGift: inAGift("packed") },
      { openGift: inAGift("sent") },
      { held: false },
    ].map((rest) => toBoardSticker(boardSticker({ placement: placedAt(0.5), ...rest })));
    const shown = shownIn("phone", placeUnplaced(stuckOn).stickers);
    expect(shown.map((s) => onTheBoard(s))).toEqual([true, false, false, false]);
  });
});

describe("shownIn", () => {
  it("shows the layout asked for, a sticker that layout hasn't placed at its phone spot, and keeps a view while it hasn't moved", () => {
    const [s] = placeUnplaced([
      toBoardSticker(boardSticker({ placement: placedAt(0.2), largePlacement: placedAt(0.8) })),
    ]).stickers;
    const [given] = placeUnplaced([
      toBoardSticker(boardSticker({ placement: placedAt(0.3), held: false })),
    ]).stickers;
    expect(shownIn("phone", [s])[0].placement.x).toBe(0.2);
    expect(shownIn("large", [s, given]).map((v) => v.placement.x)).toEqual([0.8, 0.3]);
    expect(shownIn("large", [s])[0]).toBe(shownIn("large", [s])[0]);
  });
});
