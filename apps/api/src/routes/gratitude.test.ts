import {
  gratitude,
  GRATITUDE_PER_HIT,
  MAX_HITS,
  MAX_PEAK_MULT,
  MAX_PEAK_TIER,
  METHOD_WEIGHT,
} from "@drawing-app/db";
import { bytes32, insertUser, ONE_TAP, packGift } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  gratitudeResponseSchema,
  MAX_GRATITUDE_BODY_BYTES,
  MAX_GRATITUDE_PER_HIT,
  ORIGINAL_ARTIST_GRATITUDE_SHARE,
  type RecordGratitude,
} from "../gratitude/record.ts";
import { gunzipReplay, MAX_COMBO_MS, STAGE_UNITS, type ReplayV1 } from "../gratitude/replay.ts";
import {
  recordBody,
  STAGE_CENTRE,
  TAP_GAP_MS,
  tapReplay,
  touch,
} from "../gratitude/testReplays.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
import { giveSticker, insertSealedSticker } from "../testing/rows.ts";

/** A tap combo of more than one hit. */
const COMBO_HITS = 2;
/** A total whose Original Artist Gratitude Share isn't whole, so rounding shows. */
const UNEVEN_TOTAL = 58;
const NO_SHARE = 0;
const UNKNOWN_REPLAY_VERSION = 2;

const post = (test: TestApp, userId: string, body: unknown) =>
  test.send("POST", "/api/gratitude", { as: userId, body });

/** The gratitude a 201 or 200 answers with. */
const recorded = async (response: Response, status: 200 | 201) =>
  (await bodyOf(response, gratitudeResponseSchema, status)).gratitude;

/** A combo's fields, as Gratitude answers them. */
const comboOf = ({
  giftId,
  method,
  hits,
  total,
  peakMult,
  peakTier,
  gameConfigVersion,
}: RecordGratitude) => ({ giftId, method, hits, total, peakMult, peakTier, gameConfigVersion });

/** An app with one received gift of a sticker its giver drew. */
async function receivedGift() {
  const test = await createTestApp();
  const giverId = insertUser(test.db);
  const receiverId = insertUser(test.db);
  const stickerId = insertSealedSticker(test.db, giverId);
  const giftId = giveSticker(test.db, stickerId, giverId, receiverId).id;
  return { test, giverId, receiverId, giftId };
}

function storedReplay(test: TestApp, giftId: string) {
  const row = test.db.select().from(gratitude).where(eq(gratitude.giftId, giftId)).get();
  if (!row) throw new Error(`Gift ${giftId} has no gratitude`);
  return gunzipReplay(row.replay);
}

/** One tap, then a stroke pass from the centre to the stage's right edge. */
const switchedToStroke = (): ReplayV1 => ({
  ...tapReplay(ONE_TAP.hits),
  switchedAtHit: ONE_TAP.hits,
  strokes: [[0, STAGE_CENTRE, STAGE_CENTRE, TAP_GAP_MS, STAGE_UNITS - STAGE_CENTRE, 0]],
  strokePasses: [[1]],
});

/** A tap combo of COMBO_HITS whose second touch is `second`. */
const withSecondTouch = (second: number[]) => ({
  ...tapReplay(COMBO_HITS),
  hits: [...touch(0, STAGE_CENTRE, STAGE_CENTRE), ...second],
});

interface FieldBreak {
  breaks: string;
  /** The field the refusal names. */
  field: string;
  /** Fields over a valid ONE_TAP body. */
  body: Record<string, unknown>;
}

/** Each breaks exactly one rule, so each would be recorded if its rule were gone. */
const REPLAY_BREAKS: FieldBreak[] = [
  {
    breaks: "another replay version",
    field: "replay.v",
    body: { replay: { ...tapReplay(ONE_TAP.hits), v: UNKNOWN_REPLAY_VERSION } },
  },
  {
    breaks: "a touch that runs past STAGE_UNITS",
    field: "replay.hits",
    body: {
      hits: COMBO_HITS,
      replay: withSecondTouch(touch(TAP_GAP_MS, STAGE_UNITS - STAGE_CENTRE + 1, 0)),
    },
  },
  {
    breaks: "a negative ms step",
    field: "replay.hits",
    body: { hits: COMBO_HITS, replay: withSecondTouch(touch(-TAP_GAP_MS, 0, 0)) },
  },
  {
    breaks: "hits that aren't whole touches",
    field: "replay.hits",
    body: {
      replay: { ...tapReplay(ONE_TAP.hits), hits: [...tapReplay(ONE_TAP.hits).hits, TAP_GAP_MS] },
    },
  },
  {
    breaks: "a durationMs past MAX_COMBO_MS",
    field: "replay.durationMs",
    body: { replay: { ...tapReplay(ONE_TAP.hits), durationMs: MAX_COMBO_MS + 1 } },
  },
  {
    breaks: "a tap combo with fewer counted touches than hits",
    field: "replay.hits",
    body: { hits: COMBO_HITS + 1, replay: tapReplay(COMBO_HITS) },
  },
  {
    breaks: "a tap combo with switchedAtHit set",
    field: "replay.switchedAtHit",
    body: { replay: { ...tapReplay(ONE_TAP.hits), switchedAtHit: ONE_TAP.hits } },
  },
  {
    breaks: "a stroke combo without switchedAtHit",
    field: "replay.switchedAtHit",
    body: {
      method: "stroke",
      hits: COMBO_HITS,
      replay: { ...switchedToStroke(), switchedAtHit: null },
    },
  },
  {
    breaks: "a stroke combo that switched past its hits",
    field: "replay.switchedAtHit",
    body: {
      method: "stroke",
      hits: COMBO_HITS,
      replay: { ...switchedToStroke(), switchedAtHit: COMBO_HITS + 1 },
    },
  },
  {
    breaks: "a stroke combo with more counted touches than hits",
    field: "replay.hits",
    body: {
      method: "stroke",
      hits: COMBO_HITS,
      replay: {
        ...switchedToStroke(),
        hits: tapReplay(COMBO_HITS + 1).hits,
        durationMs: tapReplay(COMBO_HITS + 1).durationMs,
      },
    },
  },
];

const INVALID_REQUESTS: FieldBreak[] = [
  {
    breaks: "hits past MAX_HITS",
    field: "hits",
    body: { hits: MAX_HITS + 1, replay: tapReplay(MAX_HITS + 1) },
  },
  {
    breaks: "an idempotencyKey that isn't a UUID",
    field: "idempotencyKey",
    body: { idempotencyKey: "combo-1" },
  },
  {
    breaks: "a giftId that isn't 0x and 64 lowercase hex digits",
    field: "giftId",
    body: { giftId: bytes32("gift").toUpperCase() },
  },
  {
    breaks: "a total one gratitude over the most its hits can score",
    field: "total",
    body: { total: ONE_TAP.hits * MAX_GRATITUDE_PER_HIT + 1 },
  },
];

/** A valid body with the break's fields over it is refused 400 with `error`, naming the field. */
async function expectFieldRefused(error: string, { field, body }: FieldBreak) {
  const { test, receiverId, giftId } = await receivedGift();
  const refused = await refusalOf(await post(test, receiverId, { ...recordBody(giftId), ...body }));
  expect(refused).toMatchObject({ status: 400, error });
  expect(refused.detail).toContain(field);
}

describe("POST /api/gratitude", () => {
  it("records the combo and its replay, with the Original Artist's share when they neither gave nor received it", async () => {
    const test = await createTestApp();
    const [artistId, giverId, receiverId] = [
      insertUser(test.db),
      insertUser(test.db),
      insertUser(test.db),
    ];
    const stickerId = insertSealedSticker(test.db, artistId);
    giveSticker(test.db, stickerId, artistId, giverId);
    const giftId = giveSticker(test.db, stickerId, giverId, receiverId).id;
    const body = recordBody(giftId, {
      hits: COMBO_HITS,
      total: UNEVEN_TOTAL,
      replay: tapReplay(COMBO_HITS),
    });
    expect(await recorded(await post(test, receiverId, body), 201)).toMatchObject({
      ...comboOf(body),
      originalArtistGratitudeShare: Math.floor(UNEVEN_TOTAL * ORIGINAL_ARTIST_GRATITUDE_SHARE),
      seenByGiverAt: null,
    });
    expect(storedReplay(test, giftId)).toEqual(body.replay);
  });

  it("gives the Original Artist no share of gratitude to or from them", async () => {
    const test = await createTestApp();
    const artistId = insertUser(test.db);
    const friendId = insertUser(test.db);
    const stickerId = insertSealedSticker(test.db, artistId);
    const fromArtist = giveSticker(test.db, stickerId, artistId, friendId).id;
    const backToArtist = giveSticker(test.db, stickerId, friendId, artistId).id;
    for (const [giftId, receiverId] of [
      [fromArtist, friendId],
      [backToArtist, artistId],
    ] as const) {
      const body = recordBody(giftId, { total: UNEVEN_TOTAL });
      const combo = await recorded(await post(test, receiverId, body), 201);
      expect(combo.originalArtistGratitudeShare).toBe(NO_SHARE);
    }
  });

  it("records a stroke combo that switched from tapping", async () => {
    const { test, receiverId, giftId } = await receivedGift();
    const body = recordBody(giftId, {
      method: "stroke",
      hits: COMBO_HITS,
      replay: switchedToStroke(),
    });
    expect(await recorded(await post(test, receiverId, body), 201)).toMatchObject(comboOf(body));
    expect(storedReplay(test, giftId)).toEqual(body.replay);
  });

  it("records the largest combo the Mini-game can score: MAX_HITS hits, each at the multiplier's ceiling and a stroke pass's weight", async () => {
    const { test, receiverId, giftId } = await receivedGift();
    // The Mini-game's gratitude for one hit, rounded as it rounds it, weighed as a stroke pass.
    const mostPerHit = Math.round(GRATITUDE_PER_HIT * MAX_PEAK_MULT * METHOD_WEIGHT);
    const body = recordBody(giftId, {
      method: "stroke",
      hits: MAX_HITS,
      total: MAX_HITS * mostPerHit,
      peakMult: MAX_PEAK_MULT,
      peakTier: MAX_PEAK_TIER,
      replay: switchedToStroke(),
    });
    expect(await recorded(await post(test, receiverId, body), 201)).toMatchObject(comboOf(body));
  });

  it("answers the same idempotencyKey again with the stored record, whatever the body says", async () => {
    const { test, receiverId, giftId } = await receivedGift();
    const body = recordBody(giftId);
    const first = await recorded(await post(test, receiverId, body), 201);
    const again = await post(test, receiverId, { ...body, total: UNEVEN_TOTAL });
    expect(await recorded(again, 200)).toEqual(first);
    expect(test.db.select().from(gratitude).all()).toEqual([
      expect.objectContaining({ idempotencyKey: body.idempotencyKey, total: body.total }),
    ]);
  });

  it("refuses a second combo for a gift, and anyone else's use of its key", async () => {
    const { test, giverId, receiverId, giftId } = await receivedGift();
    const body = recordBody(giftId);
    await recorded(await post(test, receiverId, body), 201);
    const alreadyRecorded = { status: 409, error: "gratitude_already_recorded" };
    expect(await refusalOf(await post(test, receiverId, recordBody(giftId)))).toMatchObject(
      alreadyRecorded,
    );
    const otherId = insertUser(test.db);
    const theirSticker = insertSealedSticker(test.db, giverId);
    const theirGift = giveSticker(test.db, theirSticker, giverId, otherId).id;
    const withYourKey = recordBody(theirGift, { idempotencyKey: body.idempotencyKey });
    expect(await refusalOf(await post(test, otherId, withYourKey))).toMatchObject(alreadyRecorded);
  });

  it("refuses anyone but the receiver, a gift not yet received, and an unknown gift", async () => {
    const { test, giverId, giftId } = await receivedGift();
    for (const userId of [giverId, insertUser(test.db)]) {
      expect(await refusalOf(await post(test, userId, recordBody(giftId)))).toMatchObject({
        status: 403,
        error: "not_receiver",
      });
    }
    const packed = packGift(test.db, insertSealedSticker(test.db, giverId), giverId);
    expect(
      await refusalOf(await post(test, insertUser(test.db), recordBody(packed))),
    ).toMatchObject({ status: 409, error: "gift_not_received" });
    const unknown = recordBody(bytes32("no such gift"));
    expect(await refusalOf(await post(test, giverId, unknown))).toMatchObject({
      status: 404,
      error: "gift_not_found",
    });
  });

  it.each(REPLAY_BREAKS)("refuses $breaks with replay_invalid", (fieldBreak) =>
    expectFieldRefused("replay_invalid", fieldBreak),
  );

  it.each(INVALID_REQUESTS)("refuses $breaks with invalid_request", (fieldBreak) =>
    expectFieldRefused("invalid_request", fieldBreak),
  );

  it("refuses a body over MAX_GRATITUDE_BODY_BYTES with invalid_request, though it's otherwise valid", async () => {
    const { test, receiverId, giftId } = await receivedGift();
    const padded = { ...recordBody(giftId), padding: "x".repeat(MAX_GRATITUDE_BODY_BYTES) };
    expect(await refusalOf(await post(test, receiverId, padded))).toMatchObject({
      status: 400,
      error: "invalid_request",
    });
  });
});
