import { stickers, suiTransactions } from "@drawing-app/db";
import { insertTicketUse, insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";
import { AFTER_MIDNIGHT_MS } from "../midnightJob.ts";
import { SponsorshipError } from "../sui/types.ts";
import { createChainTestApp, createTestApp, type TestApp } from "../testing/createTestApp.ts";
import type { FakeSui } from "../testing/fakeSui.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { bodyOf } from "../testing/responses.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import { nextTokyoTicketDayStart, tokyoTicketDay } from "../ticketDays.ts";
import { mintSticker, mintUnminted, startMintCatchUp } from "./mint.ts";
import { sealResponseSchema } from "./seal.ts";
import { sealFormData, sealParts } from "./testPngs.ts";

let logs: LogLines;

beforeEach(() => {
  logs = captureLogLines();
});

afterEach(() => {
  vi.restoreAllMocks();
});

const objectOf = (test: TestApp, stickerId: string) =>
  test.db
    .select({ objectId: stickers.objectId })
    .from(stickers)
    .where(eq(stickers.id, stickerId))
    .get()?.objectId;
const mintsOf = (chain: FakeSui) => chain.built.filter(({ kind }) => kind === "mint");

/** The catch-up's tally: `counts`, and none of any other outcome. */
const caughtUp = (counts: Partial<Awaited<ReturnType<typeof mintUnminted>>>) => ({
  minted: 0,
  skipped: 0,
  failed: 0,
  ...counts,
});

describe("minting a sealed sticker on Sui", () => {
  it("mints it to its Original Artist with its public image, and records its object", async () => {
    const { test, chain, wallets } = await createChainTestApp();
    const artistId = insertUser(test.db);
    const stickerId = insertSealedSticker(test.db, artistId, { nsfw: true });
    await mintSticker(test.deps, stickerId);
    const [built] = mintsOf(chain);
    assert(built?.kind === "mint", "a mint was built");
    const sticker = test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get();
    expect(built.mint).toMatchObject({
      stickerId,
      artist: wallets.keyOf(artistId).toSuiAddress(),
      contentHash: sticker?.contentHash,
      nsfw: true,
      // An NSFW sticker shows its veiled image to anyone.
      image: `${sticker?.veiledHash}.png`,
    });
    expect(objectOf(test, stickerId)).toBe(chain.stickerObjectIdOf(stickerId));
  });

  it("follows a mint whose answer was lost instead of minting again", async () => {
    const { test, chain } = await createChainTestApp();
    const stickerId = insertSealedSticker(test.db, insertUser(test.db));
    chain.answerNext("lost");
    await expect(mintSticker(test.deps, stickerId)).rejects.toThrow(/answer .* was lost/);
    const [lost] = chain.submissions;
    assert(lost, "the mint was submitted");
    chain.show(lost.digest, { ok: true, events: chain.eventsFor(lost.digest) });
    await mintSticker(test.deps, stickerId);
    expect(mintsOf(chain)).toHaveLength(1);
    expect(objectOf(test, stickerId)).toBe(chain.stickerObjectIdOf(stickerId));
  });

  it("records a sticker whose earlier mint failed when its object is already on Sui", async () => {
    const { test, chain } = await createChainTestApp();
    const stickerId = insertSealedSticker(test.db, insertUser(test.db));
    chain.answerNext({ ok: false, failure: "MoveAbort(…, 1) in command 0" });
    await expect(mintSticker(test.deps, stickerId)).rejects.toThrow(/failed/);
    chain.minted.add(stickerId);
    await mintSticker(test.deps, stickerId);
    expect(mintsOf(chain)).toHaveLength(1);
    expect(objectOf(test, stickerId)).toBe(chain.stickerObjectIdOf(stickerId));
  });

  it("records a sticker whose mint Shinami refuses because Sui already minted it", async () => {
    const { test, chain } = await createChainTestApp();
    const stickerId = insertSealedSticker(test.db, insertUser(test.db));
    chain.minted.add(stickerId);
    chain.refuseNext(new SponsorshipError("refused", "MoveAbort(…, 1): EAlreadyMinted"));
    await mintSticker(test.deps, stickerId);
    expect(objectOf(test, stickerId)).toBe(chain.stickerObjectIdOf(stickerId));
  });

  it("keeps a mint open, unrecorded, when its success names another object", async () => {
    const { test, chain } = await createChainTestApp();
    const stickerId = insertSealedSticker(test.db, insertUser(test.db));
    chain.answerNext({ ok: true, events: [] });
    await expect(mintSticker(test.deps, stickerId)).rejects.toThrow(/no StickerSealed/);
    expect(objectOf(test, stickerId)).toBeNull();
    const [row] = test.db.select().from(suiTransactions).all();
    expect(row?.outcome).toBeNull();
  });
});

describe("the mint catch-up", () => {
  it("mints an unminted sticker at boot, then runs again just after midnight", async () => {
    const { test, chain } = await createChainTestApp();
    const stickerId = insertSealedSticker(test.db, insertUser(test.db));
    const schedule = vi.fn(() => () => {});
    const job = startMintCatchUp({ ...test.deps, schedule });
    assert(job, "Sui runs the mint catch-up");
    await job.idle();
    expect(objectOf(test, stickerId)).toBe(chain.stickerObjectIdOf(stickerId));
    logs.expectLogged("sticker.mint.catch_up.swept", { count: 1, ...caughtUp({ minted: 1 }) });
    const now = test.clock.now();
    expect(schedule).toHaveBeenCalledWith(
      expect.any(Function),
      nextTokyoTicketDayStart(now).getTime() + AFTER_MIDNIGHT_MS - now.getTime(),
    );
    job.stop();
  });

  it("leaves a minted sticker alone: no wallet lookup, no mint, not counted", async () => {
    const { test, chain } = await createChainTestApp();
    const stickerId = insertSealedSticker(test.db, insertUser(test.db), {
      objectId: `0x${"7".repeat(64)}`,
    });
    const lookup = vi.spyOn(test.deps.suiWallets, "addressFor");
    expect(await mintUnminted(test.deps)).toEqual(caughtUp({}));
    expect(lookup).not.toHaveBeenCalled();
    expect(mintsOf(chain)).toEqual([]);
    expect(objectOf(test, stickerId)).toBe(`0x${"7".repeat(64)}`);
  });

  it.each([
    {
      why: "has no Sui wallet",
      status: "no_sui_wallet",
      artist: (test: TestApp, without: Set<string>) => {
        const artistId = insertUser(test.db);
        without.add(artistId);
        return artistId;
      },
    },
    {
      why: "deleted their account",
      status: "no_live_person",
      artist: (test: TestApp) =>
        insertUser(test.db, {
          deletedAt: test.clock.now(),
          lineUserId: null,
          lineDisplayName: null,
        }),
    },
  ])("skips a sticker whose Original Artist $why, and logs why", async ({ status, artist }) => {
    const { test, chain, wallets } = await createChainTestApp();
    const stickerId = insertSealedSticker(test.db, artist(test, wallets.without));
    expect(await mintUnminted(test.deps)).toEqual(caughtUp({ skipped: 1 }));
    expect(mintsOf(chain)).toEqual([]);
    expect(objectOf(test, stickerId)).toBeNull();
    logs.expectLogged("sticker.mint.catch_up.skipped", { stickerId, status });
  });

  it("logs a sticker whose mint fails with its sticker ID, and goes on to mint the next", async () => {
    const { test, chain } = await createChainTestApp();
    const artistId = insertUser(test.db);
    const failing = insertSealedSticker(test.db, artistId);
    const next = insertSealedSticker(test.db, artistId);
    chain.answerNext({ ok: false, failure: "MoveAbort(…, 0) in command 0" });
    expect(await mintUnminted(test.deps)).toEqual(caughtUp({ minted: 1, failed: 1 }));
    expect(objectOf(test, failing)).toBeNull();
    expect(objectOf(test, next)).toBe(chain.stickerObjectIdOf(next));
    logs.expectLogged("sticker.mint.catch_up.failed", { stickerId: failing });
  });

  it("doesn't run in mock chain mode", async () => {
    const test = await createTestApp();
    expect(startMintCatchUp({ ...test.deps, schedule: vi.fn(() => () => {}) })).toBeNull();
  });

  it("mints a sticker once when Sealing's retry and the catch-up mint it together", async () => {
    const { test, chain } = await createChainTestApp();
    const artistId = insertUser(test.db);
    const stickerId = insertSealedSticker(test.db, artistId);
    // The ticket use Sealing's transaction left pointing at the sticker it saved.
    const ticketUseId = insertTicketUse(test.db, artistId, {
      ticketDay: tokyoTicketDay(test.clock.now()),
      stickerId,
    });
    const job = startMintCatchUp({ ...test.deps, schedule: () => () => {} });
    assert(job, "Sui runs the mint catch-up");
    const retry = await test.app.request("/api/stickers", {
      method: "POST",
      body: sealFormData(sealParts(ticketUseId)),
      headers: await test.signInAs(artistId),
    });
    const { sticker } = await bodyOf(retry, sealResponseSchema);
    await job.idle();
    expect(sticker.objectId).toBe(chain.stickerObjectIdOf(stickerId));
    expect(mintsOf(chain)).toHaveLength(1);
    job.stop();
  });
});
