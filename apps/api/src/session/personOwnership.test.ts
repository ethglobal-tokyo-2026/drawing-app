import {
  GIFT_EXPIRY_MS,
  gifts,
  openDb,
  personSwitchSessions,
  stickers,
  suiTransactions,
} from "@drawing-app/db";
import { insertTicketUse, insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, expect, it } from "vitest";
import { createApp } from "../app.ts";
import { createGiftsTestApp, type GiftsTestApp } from "../gifts/testGifts.ts";
import { takeOutStartSchema } from "../gifts/packaging.ts";
import { giftPreviewSchema } from "../gifts/receiving.ts";
import { returnExpiredGifts } from "../gifts/expiry.ts";
import { mintUnminted } from "../stickers/mint.ts";
import { sealFormData, sealParts } from "../stickers/testPngs.ts";
import { tokyoTicketDay } from "../ticketDays.ts";
import { PAID_PACK } from "../tickets/testPurchases.ts";
import { withPersonBackgroundOwnership } from "./personOwnership.ts";
import { follow, suiDepsOf } from "../sui/transactions.ts";
import { BIGWHEEL_ID, HANA_ID } from "./personSwitch.ts";

let test: GiftsTestApp;
let headers: Record<string, string>;
function deferred() {
  let resolve = () => {};
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}
beforeEach(async () => {
  test = await createGiftsTestApp({ onSui: true });
  insertUser(test.db, { id: BIGWHEEL_ID, lineUserId: "line-bigwheel" });
  insertUser(test.db, { id: HANA_ID, lineUserId: "dev-video-hana" });
  test.deps.personSwitch = { mode: "live", operatorUserId: BIGWHEEL_ID, hanaUserId: HANA_ID };
  headers = await test.signInAs(BIGWHEEL_ID);
});
afterEach(() => test.sqlite.close());
const select = () =>
  test.send("POST", "/api/session/person", { headers, body: { userId: HANA_ID } });

it("waits for an ownership start before the sponsorship row exists", async () => {
  const stickerId = test.sealSticker(BIGWHEEL_ID);
  const sponsor = test.chain.gasStation.sponsor;
  const started = deferred();
  const release = deferred();
  test.chain.gasStation.sponsor = async (...args) => {
    started.resolve();
    await release.promise;
    return sponsor(...args);
  };
  const packaging = test.send("POST", "/api/gifts", { headers, body: { stickerId } });
  await started.promise;
  expect(test.db.select().from(suiTransactions).all()).toEqual([]);
  let selectionSettled = false;
  const selection = select().then((r) => {
    selectionSettled = true;
    return r;
  });
  await new Promise((resolve) => setTimeout(resolve, 20));
  expect(selectionSettled).toBe(false);
  release.resolve();
  expect((await packaging).status).toBe(201);
  expect((await selection).status).toBe(409);
});

it("blocks packed unresolved delivery while allowing a settled sent gift", async () => {
  const packed = await test.depositedGift(BIGWHEEL_ID);
  const blocked = await select();
  expect(blocked.status).toBe(409);
  const sticker = test.db
    .select()
    .from(stickers)
    .where(eq(stickers.id, packed.gift.stickerId))
    .get();
  expect(await blocked.json()).toEqual({
    error: "person_switch_busy",
    pendingOwnership: {
      kind: "delivery",
      giftId: packed.gift.id,
      stickerId: packed.gift.stickerId,
      stickerNo: sticker?.number,
    },
  });
  const attemptId = `0x${"a".repeat(64)}`;
  expect(
    (await test.post(BIGWHEEL_ID, `/${packed.gift.id}/message-attempt`, { attemptId })).status,
  ).toBe(200);
  expect((await select()).status).toBe(409);
  expect(
    (await test.post(BIGWHEEL_ID, `/${packed.gift.id}/shared`, { attemptId, outcome: "sent" }))
      .status,
  ).toBe(200);
  expect((await select()).status).toBe(200);
});

it("blocks selection after reopening an ordinary token claim with no gift recipient", async () => {
  const packed = await test.depositedGift();
  test.chain.answerNext("lost");
  const received = await test.send("POST", "/api/gifts/receive", {
    headers,
    body: { giftClaimToken: packed.giftClaimToken, liffContextType: "utou" },
  });
  expect(received.status).toBe(503);
  const openClaim = test.db
    .select()
    .from(suiTransactions)
    .where(eq(suiTransactions.kind, "claim"))
    .get();
  expect(openClaim?.userId).toBeNull();
  expect(openClaim?.requestedByUserId).toBe(BIGWHEEL_ID);
  expect(test.giftRow(packed.gift.id).forUserId).toBeNull();
  const dir = await mkdtemp(join(tmpdir(), "croquis-person-claim-"));
  const path = join(dir, "test.db");
  await test.sqlite.backup(path);
  const reopened = openDb(path);
  try {
    const app = createApp({ ...test.deps, db: reopened });
    const choose = () =>
      app.request("/api/session/person", {
        method: "POST",
        headers: { ...headers, "content-type": "application/json" },
        body: JSON.stringify({ userId: HANA_ID }),
      });
    expect((await choose()).status).toBe(409);
    if (!openClaim) throw new Error("Claim was not sponsored");
    test.chain.show(openClaim.digest, { ok: true, events: [] });
    const retry = await app.request("/api/gifts/receive", {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ giftClaimToken: packed.giftClaimToken, liffContextType: "utou" }),
    });
    expect(retry.status).toBe(200);
    expect((await choose()).status).toBe(200);
  } finally {
    reopened.$client.close();
    await rm(dir, { recursive: true });
  }
});

it("blocks a pending claim for an outsider when BIGWHEEL is its Original Artist", async () => {
  const giverId = insertUser(test.db);
  const packed = await test.depositedGift(giverId);
  test.db
    .update(stickers)
    .set({ artistId: BIGWHEEL_ID })
    .where(eq(stickers.id, packed.gift.stickerId))
    .run();
  test.chain.answerNext("lost");
  expect(
    (
      await test.post(insertUser(test.db), "/receive", {
        giftClaimToken: packed.giftClaimToken,
        liffContextType: "utou",
      })
    ).status,
  ).toBe(503);
  expect((await select()).status).toBe(409);
  expect(test.db.select().from(personSwitchSessions).all()).toEqual([]);
});

it("preserves take-out recovery for a packed pending message", async () => {
  const packed = await test.depositedGift(BIGWHEEL_ID);
  expect((await test.share(BIGWHEEL_ID, packed.gift.id, "cancelled")).status).toBe(200);
  const started = await test.takeOut(BIGWHEEL_ID, packed.gift.id);
  expect(started.status).toBe(200);
  expect((await select()).status).toBe(409);
  const body = takeOutStartSchema.parse(await started.json());
  if (!body.takeOut) throw new Error("Take-out was not sponsored");
  expect(
    (
      await test.submitTakeOut(
        BIGWHEEL_ID,
        packed.gift.id,
        await test.signed(BIGWHEEL_ID, body.takeOut),
      )
    ).status,
  ).toBe(200);
  expect(test.db.select().from(gifts).where(eq(gifts.id, packed.gift.id)).get()?.status).toBe(
    "taken_out",
  );
  expect((await select()).status).toBe(200);
});

it.each(["mint", "return"] as const)(
  "waits for background %s sponsorship and blocks until it settles",
  async (kind) => {
    if (kind === "mint") test.sealSticker(BIGWHEEL_ID, { minted: false });
    else {
      const packed = await test.depositedGift(BIGWHEEL_ID);
      await test.share(BIGWHEEL_ID, packed.gift.id, "sent");
      test.clock.advance(GIFT_EXPIRY_MS + 1000);
      headers = await test.signInAs(BIGWHEEL_ID);
    }
    const sponsor = test.chain.gasStation.sponsor;
    const started = deferred();
    const release = deferred();
    test.chain.gasStation.sponsor = async (...args) => {
      started.resolve();
      await release.promise;
      return sponsor(...args);
    };
    test.chain.answerNext("lost");
    const work = kind === "mint" ? mintUnminted(test.deps) : returnExpiredGifts(test.deps);
    await started.promise;
    let selectionSettled = false;
    const selection = select().then((r) => {
      selectionSettled = true;
      return r;
    });
    await new Promise((resolve) => setTimeout(resolve, 20));
    const settledBeforeRelease = selectionSettled;
    release.resolve();
    await work;
    expect(settledBeforeRelease).toBe(false);
    expect((await selection).status).toBe(409);
    const row = test.db.select().from(suiTransactions).where(eq(suiTransactions.kind, kind)).get();
    if (!row) throw new Error("Background transaction missing");
    test.chain.show(row.digest, { ok: true, events: test.chain.eventsFor(row.digest) });
    if (kind === "mint") await mintUnminted(test.deps);
    else await returnExpiredGifts(test.deps);
    expect((await select()).status).toBe(200);
  },
);

it("blocks a pending reserve payment", async () => {
  const purchase = await test.send("POST", "/api/ticket-purchases/start", {
    headers,
    body: PAID_PACK,
  });
  expect(purchase.status).toBe(201);
  expect((await select()).status).toBe(409);
});

it("rechecks a queued mutation after another tab selects a person", async () => {
  const entered = deferred();
  const release = deferred();
  const locked = withPersonBackgroundOwnership(test.deps, [BIGWHEEL_ID], async () => {
    entered.resolve();
    await release.promise;
  });
  await entered.promise;
  const selection = select();
  await new Promise((resolve) => setTimeout(resolve, 10));
  const mutation = test.send("POST", "/api/me/handle", { headers, body: { handle: "stale" } });
  await new Promise((resolve) => setTimeout(resolve, 10));
  release.resolve();
  await locked;
  expect((await selection).status).toBe(200);
  expect((await mutation).status).toBe(409);
});

it("refuses an ordinary user's transfer involving the pair in verification mode", async () => {
  const packed = await test.depositedGift(BIGWHEEL_ID);
  await test.share(BIGWHEEL_ID, packed.gift.id, "sent");
  test.deps.personSwitch.mode = "verify";
  expect(
    (
      await test.post(insertUser(test.db), "/receive", {
        giftClaimToken: packed.giftClaimToken,
        liffContextType: "utou",
      })
    ).status,
  ).toBe(403);
  expect(test.giftRow(packed.gift.id).status).toBe("sent");
});

it("keeps a successful claim blocked until its recipient is reconciled", async () => {
  const packed = await test.depositedGift();
  test.chain.answerNext("lost");
  expect(
    (
      await test.send("POST", "/api/gifts/receive", {
        headers,
        body: { giftClaimToken: packed.giftClaimToken, liffContextType: "utou" },
      })
    ).status,
  ).toBe(503);
  const claim = test.db
    .select()
    .from(suiTransactions)
    .where(eq(suiTransactions.kind, "claim"))
    .get();
  const sui = suiDepsOf(test.deps);
  if (!claim || !sui) throw new Error("Claim was not sponsored");
  test.chain.show(claim.digest, { ok: true, events: [] });
  await follow(sui, claim);
  expect((await select()).status).toBe(409);
  expect(
    (
      await test.send("POST", "/api/gifts/receive", {
        headers,
        body: { giftClaimToken: packed.giftClaimToken, liffContextType: "utou" },
      })
    ).status,
  ).toBe(200);
  expect((await select()).status).toBe(200);
});

it("rechecks verification mode inside the lock before a queued Hana mutation", async () => {
  const response = await select();
  expect(response.status).toBe(200);
  const row = test.db.select().from(personSwitchSessions).get();
  if (!row) throw new Error("Selection missing");
  const hanaHeaders = {
    ...headers,
    "x-croquis-user-id": HANA_ID,
    "x-croquis-selection-version": row.selectionVersion,
  };
  const entered = deferred();
  const release = deferred();
  const locked = withPersonBackgroundOwnership(test.deps, [BIGWHEEL_ID], async () => {
    entered.resolve();
    await release.promise;
  });
  await entered.promise;
  const mutation = test.send("POST", "/api/me/handle", {
    headers: hanaHeaders,
    body: { handle: "queued" },
  });
  await new Promise((resolve) => setTimeout(resolve, 10));
  test.deps.personSwitch.mode = "verify";
  release.resolve();
  await locked;
  expect((await mutation).status).toBe(403);
});

it("does not start background pair transfers during verification", async () => {
  test.sealSticker(HANA_ID, { minted: false });
  test.deps.personSwitch.mode = "verify";
  expect(await mintUnminted(test.deps)).toMatchObject({ minted: 0 });
  expect(test.db.select().from(suiTransactions).all()).toEqual([]);
});

it.each([BIGWHEEL_ID, HANA_ID])(
  "allows verification gift previews for %s while refusing receiving",
  async (userId) => {
    const packed = await test.depositedGift();
    test.deps.personSwitch.mode = "verify";
    if (userId === HANA_ID) {
      expect((await select()).status).toBe(200);
      const row = test.db.select().from(personSwitchSessions).get();
      if (!row) throw new Error("Selection missing");
      headers = {
        ...headers,
        "x-croquis-user-id": HANA_ID,
        "x-croquis-selection-version": row.selectionVersion,
      };
    }
    const body = { giftClaimToken: packed.giftClaimToken, liffContextType: "utou" };
    const preview = await test.send("POST", "/api/gifts/preview", { headers, body });
    expect(preview.status).toBe(200);
    expect(giftPreviewSchema.parse(await preview.json())).toMatchObject({
      receivable: true,
      sticker: { id: packed.gift.stickerId },
    });
    expect(
      (await test.send("GET", `/api/gifts/${packed.gift.id}/preview`, { headers })).status,
    ).toBe(200);
    expect(
      (
        await test.send("POST", "/api/gifts/preview", {
          headers: { ...headers, "x-croquis-selection-version": "stale" },
          body,
        })
      ).status,
    ).toBe(409);
    for (const path of ["/api/gifts/receive", `/api/gifts/${packed.gift.id}/receive`]) {
      expect((await test.send("POST", path, { headers, body })).status).toBe(403);
    }
    expect(test.ownerOf(packed.gift.stickerId)).toBe(packed.giverId);
    expect(
      test.db.select().from(suiTransactions).where(eq(suiTransactions.kind, "claim")).all(),
    ).toEqual([]);
  },
);

it("seals and catches up the same operator sticker without reacquiring the outer lock", async () => {
  const stickerId = test.sealSticker(BIGWHEEL_ID, { minted: false });
  const ticketUseId = insertTicketUse(test.db, BIGWHEEL_ID, {
    ticketDay: tokyoTicketDay(test.clock.now()),
    stickerId,
  });
  const [response] = await Promise.all([
    test.app.request("/api/stickers", {
      method: "POST",
      headers,
      body: sealFormData(sealParts(ticketUseId)),
    }),
    mintUnminted(test.deps),
  ]);
  expect(response.status).toBe(200);
  expect(test.db.select().from(stickers).where(eq(stickers.id, stickerId)).get()?.objectId).toBe(
    test.chain.stickerObjectIdOf(stickerId),
  );
  expect(
    test.db.select().from(suiTransactions).where(eq(suiTransactions.kind, "mint")).all(),
  ).toHaveLength(1);
  expect((await select()).status).toBe(200);
});
