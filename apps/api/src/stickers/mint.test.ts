import { stickers, ticketUses } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { afterEach, assert, beforeEach, describe, expect, it, vi } from "vitest";
import type { Mint } from "../deps.ts";
import { AFTER_MIDNIGHT_MS } from "../midnightJob.ts";
import { mockChain } from "../services/mockChain.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { fakeGiftChain, fakeMint, fakeSmartWallets } from "../testing/fakes.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { bodyOf } from "../testing/responses.ts";
import { giveSticker, insertSealedSticker } from "../testing/rows.ts";
import { nextTokyoTicketDayStart, tokyoTicketDay } from "../ticketDays.ts";
import { ticketKindAt } from "../tickets/tickets.ts";
import { mintUnminted, startMintCatchUp } from "./mint.ts";
import { sealResponseSchema } from "./seal.ts";
import { sealFormData, sealParts } from "./testPngs.ts";

let logs: LogLines;

beforeEach(() => {
  logs = captureLogLines();
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** StickerNFT without a chain: each sticker gets one token. `asked` lists the stickers it was asked to mint. */
function recordingMint() {
  const chain = fakeMint();
  const mint = vi.fn<Mint>(chain);
  const asked = () => mint.mock.calls.map(([request]) => request.stickerId);
  return { mint, chain, asked };
}

/** The app in chain mode, minting through `mint`: everyone has a smart wallet. */
const chainApp = (mint: Mint) =>
  createTestApp(({ db, clock }) => ({
    mint,
    giftChain: fakeGiftChain(clock),
    smartWallets: fakeSmartWallets(db),
  }));

const stickerRow = (test: TestApp, stickerId: string) =>
  test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get();

const UNMINTED = { tokenId: null, mintTxHash: null };

/** The catch-up's tally: `counts`, and none of any other outcome. */
const caughtUp = (counts: Partial<Awaited<ReturnType<typeof mintUnminted>>>) => ({
  minted: 0,
  skipped: 0,
  failed: 0,
  ...counts,
});

describe("the mint catch-up", () => {
  it("mints an unminted sticker at boot, records its token, then runs again just after midnight", async () => {
    const { mint, chain } = recordingMint();
    const test = await chainApp(mint);
    const stickerId = insertSealedSticker(test.db, insertUser(test.db));
    const schedule = vi.fn(() => () => {});
    const job = startMintCatchUp({ ...test.deps, schedule });
    assert(job, "Chain mode runs the mint catch-up");
    await job.idle();

    const token = chain.minted.get(stickerId);
    const row = stickerRow(test, stickerId);
    assert(token && row, "The boot run minted the sticker");
    expect(row).toMatchObject({ tokenId: token.tokenId, mintTxHash: token.txHash });
    logs.expectLogged("sticker.mint.catch_up.swept", { count: 1, ...caughtUp({ minted: 1 }) });
    const now = test.clock.now();
    expect(schedule).toHaveBeenCalledWith(
      expect.any(Function),
      nextTokyoTicketDayStart(now).getTime() + AFTER_MIDNIGHT_MS - now.getTime(),
    );
    job.stop();
  });

  it("leaves a minted sticker alone: no wallet lookup, no mint, not counted", async () => {
    const { mint, asked } = recordingMint();
    const test = await chainApp(mint);
    const stickerId = insertSealedSticker(test.db, insertUser(test.db), {
      tokenId: "7",
      mintTxHash: bytes32("mint 7"),
    });
    const before = stickerRow(test, stickerId);
    const lookup = vi.spyOn(test.deps.smartWallets, "addressFor");

    expect(await mintUnminted(test.deps)).toEqual(caughtUp({}));
    expect(lookup).not.toHaveBeenCalled();
    expect(asked()).toEqual([]);
    expect(stickerRow(test, stickerId)).toEqual(before);
  });

  it.each([
    {
      why: "has no smart wallet",
      status: "no_smart_account",
      unminted: (test: TestApp) => {
        vi.spyOn(test.deps.smartWallets, "addressFor").mockResolvedValue(null);
        return insertSealedSticker(test.db, insertUser(test.db));
      },
    },
    {
      why: "deleted their account",
      status: "no_live_person",
      unminted: (test: TestApp) =>
        insertSealedSticker(
          test.db,
          insertUser(test.db, {
            deletedAt: test.clock.now(),
            lineUserId: null,
            lineDisplayName: null,
          }),
        ),
    },
    {
      why: "gave it away before it was minted, in mock chain mode",
      status: "not_held_by_artist",
      unminted: (test: TestApp) => {
        const artistId = insertUser(test.db);
        const stickerId = insertSealedSticker(test.db, artistId);
        giveSticker(test.db, stickerId, artistId, insertUser(test.db));
        return stickerId;
      },
    },
  ])("skips a sticker whose Original Artist $why, and logs why", async ({ status, unminted }) => {
    const { mint, asked } = recordingMint();
    const test = await chainApp(mint);
    const stickerId = unminted(test);

    expect(await mintUnminted(test.deps)).toEqual(caughtUp({ skipped: 1 }));
    expect(asked()).toEqual([]);
    expect(stickerRow(test, stickerId)).toMatchObject(UNMINTED);
    logs.expectLogged("sticker.mint.catch_up.skipped", { stickerId, status });
  });

  it("logs a sticker whose mint fails with its sticker ID, and goes on to mint the next", async () => {
    const { mint, chain } = recordingMint();
    const cause = new Error("The relayer's transaction reverted");
    mint.mockRejectedValueOnce(cause);
    const test = await chainApp(mint);
    const artistId = insertUser(test.db);
    const failing = insertSealedSticker(test.db, artistId);
    const next = insertSealedSticker(test.db, artistId);

    expect(await mintUnminted(test.deps)).toEqual(caughtUp({ minted: 1, failed: 1 }));
    expect(stickerRow(test, failing)).toMatchObject(UNMINTED);
    const token = chain.minted.get(next);
    assert(token, "The catch-up minted the next sticker");
    expect(stickerRow(test, next)).toMatchObject({
      tokenId: token.tokenId,
      mintTxHash: token.txHash,
    });
    expect(logs.entries).toContainEqual(
      expect.objectContaining({
        event: "sticker.mint.catch_up.failed",
        stickerId: failing,
        causes: [expect.objectContaining({ message: cause.message })],
      }),
    );
  });

  it("doesn't run in mock chain mode", async () => {
    const mint = vi.fn<Mint>(mockChain.mint);
    const test = await createTestApp(({ db }) => ({ mint, smartWallets: fakeSmartWallets(db) }));
    const stickerId = insertSealedSticker(test.db, insertUser(test.db));

    const job = startMintCatchUp({ ...test.deps, schedule: vi.fn(() => () => {}) });
    await job?.idle();
    expect(job).toBeNull();
    expect(mint).not.toHaveBeenCalled();
    expect(stickerRow(test, stickerId)).toMatchObject(UNMINTED);
  });

  it("keeps the token a seal's retry records while the catch-up mints the same sticker", async () => {
    const { mint, chain, asked } = recordingMint();
    let land = () => {};
    const block = new Promise<void>((resolve) => {
      land = resolve;
    });
    // The catch-up's mint waits for the test, as a transaction waits for its block.
    mint.mockImplementationOnce(async (request) => {
      await block;
      return chain(request);
    });
    const test = await chainApp(mint);
    const artistId = insertUser(test.db);
    const stickerId = insertSealedSticker(test.db, artistId);
    // The ticket use Sealing's transaction left pointing at the sticker it saved.
    const { id: ticketUseId } = test.db
      .insert(ticketUses)
      .values({
        userId: artistId,
        ticketDay: tokyoTicketDay(test.clock.now()),
        dayIndex: 0,
        kind: ticketKindAt(0),
        stickerId,
      })
      .returning({ id: ticketUses.id })
      .get();
    const job = startMintCatchUp({ ...test.deps, schedule: () => () => {} });
    assert(job, "Chain mode runs the mint catch-up");
    await vi.waitFor(() => expect(asked()).toEqual([stickerId]));

    const retry = await test.app.request("/api/stickers", {
      method: "POST",
      body: sealFormData(sealParts(ticketUseId)),
      headers: await test.signInAs(artistId),
    });
    const { sticker } = await bodyOf(retry, sealResponseSchema);
    const token = chain.minted.get(stickerId);
    assert(token, "The retry minted the sticker");
    const recorded = { tokenId: token.tokenId, mintTxHash: token.txHash };
    expect(sticker).toMatchObject(recorded);

    land();
    await job.idle();
    expect(stickerRow(test, stickerId)).toMatchObject(recorded);
    expect(logs.entries.filter(({ event }) => event === "sticker.mint.recorded")).toHaveLength(1);
    logs.expectLogged("sticker.mint.already_recorded", { stickerId, tokenId: token.tokenId });
    job.stop();
  });
});
