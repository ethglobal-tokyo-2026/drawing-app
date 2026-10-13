import { bytes32, insertUser } from "@drawing-app/db/testing";
import { fromBase64 } from "@mysten/sui/utils";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { expect, it } from "vitest";
import { z } from "zod";
import { BIGWHEEL_ID, HANA_ID } from "../session/personSwitch.ts";
import { createTestApp, createChainTestApp } from "../testing/createTestApp.ts";
import { createFakeLine, lineMessagingThrough, TEST_CHAT_MENU_IDS } from "../testing/fakeLine.ts";
import { createGiverNotice } from "./giverNotice.ts";
import { createLineChatMenu } from "../chatMenu/lineChatMenu.ts";
import { packagedGiftSchema } from "./packaging.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import { gifts, stickers } from "@drawing-app/db";
import { eq } from "drizzle-orm";

async function setup() {
  const line = createFakeLine();
  const config = { mode: "live", operatorUserId: BIGWHEEL_ID, hanaUserId: HANA_ID } as const;
  const { test, chain, wallets } = await createChainTestApp({
    overrides: ({ db, clock }) => ({
      personSwitch: { ...config },
      giverNotice: createGiverNotice({
        db,
        clock,
        line: lineMessagingThrough(line),
        personSwitch: config,
      }),
      lineChatMenu: createLineChatMenu({
        db,
        clock,
        line: lineMessagingThrough(line),
        ids: TEST_CHAT_MENU_IDS,
        personSwitch: config,
      }),
    }),
  });
  test.clock.set(new Date());
  insertUser(test.db, { id: BIGWHEEL_ID, lineUserId: "line-bigwheel" });
  insertUser(test.db, { id: HANA_ID, lineUserId: "dev-video-hana" });
  let headers = await test.signInAs(BIGWHEEL_ID);
  const send = (method: string, path: string, body?: unknown) =>
    test.send(method, path, { headers, body });
  const select = async (id: string) => {
    const response = await send("POST", "/api/session/person", { userId: id });
    expect(response.status).toBe(200);
    const selected = z.object({ selectionVersion: z.string() }).parse(await response.json());
    headers = {
      ...headers,
      "x-croquis-user-id": id,
      "x-croquis-selection-version": selected.selectionVersion,
    };
  };
  const pack = async (giver: string, recipient: string | null) => {
    const stickerId = insertSealedSticker(test.db, giver);
    test.db
      .update(stickers)
      .set({ objectId: chain.stickerObjectIdOf(stickerId) })
      .where(eq(stickers.id, stickerId))
      .run();
    const response = await send("POST", "/api/gifts", { stickerId, forUserId: recipient });
    expect(response.status).toBe(201);
    return packagedGiftSchema.parse(await response.json());
  };
  const deposit = async (giver: string, packed: Awaited<ReturnType<typeof pack>>) => {
    if (!packed.deposit) throw new Error("Missing deposit");
    const signature = await wallets
      .keyOf(giver)
      .signTransaction(fromBase64(packed.deposit.txBytes));
    return send("POST", `/api/gifts/${packed.gift.id}/deposit`, {
      digest: packed.deposit.digest,
      signature: signature.signature,
    });
  };
  return {
    ...test,
    testRequestAsHana: (method: string, path: string, body?: unknown) =>
      test.send(method, path, { as: HANA_ID, body }),
    chain,
    wallets,
    line,
    send,
    select,
    pack,
    deposit,
  };
}

it("uses actual giver signatures and records one protected delivery in either direction", async () => {
  const t = await setup();
  for (const [giver, recipient] of [
    [BIGWHEEL_ID, HANA_ID],
    [HANA_ID, BIGWHEEL_ID],
  ]) {
    const packed = await t.pack(giver, recipient);
    expect(packed.delivery).toBe("person");
    expect((await t.deposit(giver, packed)).status).toBe(200);
    const attemptId = bytes32(`attempt-${giver}`);
    expect(
      (await t.send("POST", `/api/gifts/${packed.gift.id}/message-attempt`, { attemptId })).status,
    ).toBe(200);
    const deliver = () =>
      t.send("POST", `/api/gifts/${packed.gift.id}/deliver-person`, { attemptId });
    const first = await deliver();
    expect(first.status).toBe(200);
    expect(await (await deliver()).json()).toEqual(await first.json());
    await t.select(recipient);
    const received =
      giver === HANA_ID
        ? await t.send("POST", "/api/gifts/receive", {
            giftClaimToken: packed.giftClaimToken,
            liffContextType: "utou",
          })
        : await t.send("POST", `/api/gifts/${packed.gift.id}/receive`);
    expect(received.status).toBe(200);
    expect(t.chain.escrow.get(packed.gift.id)).toMatchObject({
      status: "claimed",
      recipient: t.wallets.keyOf(recipient).toSuiAddress(),
    });
    const submissions = t.chain.submissions.length;
    expect((await t.send("POST", `/api/gifts/${packed.gift.id}/receive`)).status).toBe(200);
    expect(t.chain.submissions).toHaveLength(submissions);
    expect(
      t.db.select().from(stickers).where(eq(stickers.id, packed.gift.stickerId)).get()?.ownerId,
    ).toBe(recipient);
    await t.deps.giverNotice.idle();
    expect(t.line.pushes).toEqual([]);
  }
  t.sqlite.close();
});

it("rejects premature targeted and token receiving and a fake ordinary sent report", async () => {
  const t = await setup();
  const packed = await t.pack(BIGWHEEL_ID, HANA_ID);
  expect((await t.deposit(BIGWHEEL_ID, packed)).status).toBe(200);
  const attemptId = bytes32("pending");
  await t.send("POST", `/api/gifts/${packed.gift.id}/message-attempt`, { attemptId });
  for (const [method, path, body] of [
    ["GET", `/api/gifts/${packed.gift.id}/preview`, undefined],
    ["POST", `/api/gifts/${packed.gift.id}/receive`, undefined],
    [
      "POST",
      "/api/gifts/preview",
      { giftClaimToken: packed.giftClaimToken, liffContextType: "utou" },
    ],
    [
      "POST",
      "/api/gifts/receive",
      { giftClaimToken: packed.giftClaimToken, liffContextType: "utou" },
    ],
  ] as const) {
    const response = await t.testRequestAsHana(method, path, body);
    expect(response.status).not.toBe(200);
  }
  expect(
    (await t.send("POST", `/api/gifts/${packed.gift.id}/shared`, { attemptId, outcome: "sent" }))
      .status,
  ).toBe(403);
  t.sqlite.close();
});

it("keeps Hana chat-menu exclusions when switching is off", async () => {
  const t = await setup();
  t.deps.personSwitch.mode = "off";
  expect(await t.deps.lineChatMenu.link(HANA_ID)).toEqual({
    status: "off",
    reason: "person_unavailable",
  });
  await t.deps.lineChatMenu.relink(HANA_ID);
  await t.deps.lineChatMenu.unlink(HANA_ID, "dev-video-hana");
  expect(t.line.calls).toEqual([]);
  expect(await t.deps.lineChatMenu.link(BIGWHEEL_ID)).toMatchObject({
    status: "linked",
    menu: "3",
  });
  t.sqlite.close();
});

it("refuses missing deposits, wrong signatures, mismatched attempts, nonoperators and verification", async () => {
  const t = await setup();
  const packed = await t.pack(BIGWHEEL_ID, HANA_ID);
  const attemptId = bytes32("valid-attempt");
  const path = `/api/gifts/${packed.gift.id}/deliver-person`;
  expect((await t.send("POST", path, { attemptId })).status).toBe(409);
  if (!packed.deposit) throw new Error("Missing deposit");
  const signature = await Ed25519Keypair.generate().signTransaction(
    fromBase64(packed.deposit.txBytes),
  );
  expect(
    (
      await t.send("POST", `/api/gifts/${packed.gift.id}/deposit`, {
        digest: packed.deposit.digest,
        signature: signature.signature,
      })
    ).status,
  ).toBe(400);
  expect(t.chain.submissions).toEqual([]);
  expect((await t.deposit(BIGWHEEL_ID, packed)).status).toBe(200);
  await t.send("POST", `/api/gifts/${packed.gift.id}/message-attempt`, { attemptId });
  expect((await t.send("POST", path, { attemptId: bytes32("wrong") })).status).toBe(409);
  expect((await t.send("POST", path, { attemptId: "invalid" })).status).toBe(400);
  const stranger = insertUser(t.db);
  expect((await t.testRequestAsHana("POST", path, { attemptId })).status).toBe(403);
  expect((await t.send("GET", `/api/gifts/${packed.gift.id}/delivery`)).status).toBe(200);
  expect((await t.send("POST", path, { attemptId })).status).toBe(200);
  expect(
    (
      await t.send("POST", "/api/gifts/receive", {
        giftClaimToken: packed.giftClaimToken,
        liffContextType: "utou",
      })
    ).status,
  ).toBe(403);
  expect(
    (
      await t.app.request(`/api/gifts/${packed.gift.id}/delivery`, {
        headers: await t.signInAs(stranger),
      })
    ).status,
  ).toBe(403);
  t.deps.personSwitch.mode = "verify";
  expect((await t.send("POST", path, { attemptId })).status).toBe(403);
  t.sqlite.close();
});

it("requires BIGWHEEL for every new Hana Packaging", async () => {
  const t = await setup();
  await t.select(HANA_ID);
  const stickerId = insertSealedSticker(t.db, HANA_ID);
  for (const recipient of [null, insertUser(t.db)]) {
    expect((await t.send("POST", "/api/gifts", { stickerId, forUserId: recipient })).status).toBe(
      403,
    );
  }
  t.sqlite.close();
});

it("does not acknowledge historical or missing escrow objects", async () => {
  const t = await setup();
  const packed = await t.pack(BIGWHEEL_ID, HANA_ID);
  await t.deposit(BIGWHEEL_ID, packed);
  const attemptId = bytes32("missing-object");
  await t.send("POST", `/api/gifts/${packed.gift.id}/message-attempt`, { attemptId });
  t.chain.escrow.delete(packed.gift.id);
  expect(
    (await t.send("POST", `/api/gifts/${packed.gift.id}/deliver-person`, { attemptId })).status,
  ).toBe(409);
  t.sqlite.close();
});

it("completes pair receipt notices without LINE when selection is off", async () => {
  const t = await setup();
  const packed = await t.pack(BIGWHEEL_ID, HANA_ID);
  await t.deposit(BIGWHEEL_ID, packed);
  const attemptId = bytes32("off-notice");
  await t.send("POST", `/api/gifts/${packed.gift.id}/message-attempt`, { attemptId });
  await t.send("POST", `/api/gifts/${packed.gift.id}/deliver-person`, { attemptId });
  t.deps.personSwitch.mode = "off";
  expect((await t.testRequestAsHana("POST", `/api/gifts/${packed.gift.id}/receive`)).status).toBe(
    200,
  );
  await t.deps.giverNotice.idle();
  expect(t.line.pushes).toEqual([]);
  expect(
    t.db.select().from(gifts).where(eq(gifts.id, packed.gift.id)).get()?.pushedToGiverAt,
  ).not.toBeNull();
  t.sqlite.close();
});

it("preserves ordinary lost LINE-report token recovery when Hana first opens the link", async () => {
  const t = await setup();
  const packed = await t.pack(BIGWHEEL_ID, null);
  await t.deposit(BIGWHEEL_ID, packed);
  const attemptId = bytes32("ordinary-token-first");
  await t.send("POST", `/api/gifts/${packed.gift.id}/message-attempt`, { attemptId });
  const body = { giftClaimToken: packed.giftClaimToken, liffContextType: "utou" };
  expect((await t.testRequestAsHana("POST", "/api/gifts/preview", body)).status).toBe(200);
  expect(await (await t.send("GET", `/api/gifts/${packed.gift.id}/delivery`)).json()).toEqual({
    delivery: "line",
  });
  expect(t.db.select().from(gifts).where(eq(gifts.id, packed.gift.id)).get()?.delivery).toBe(
    "line",
  );
  expect((await t.testRequestAsHana("POST", "/api/gifts/receive", body)).status).toBe(200);
  expect(t.chain.escrow.get(packed.gift.id)).toMatchObject({
    status: "claimed",
    recipient: t.wallets.keyOf(HANA_ID).toSuiAddress(),
  });
  t.sqlite.close();
});

it("rejects protected delivery without the original configured recipient", async () => {
  const t = await setup();
  for (const recipient of [null, insertUser(t.db)]) {
    const packed = await t.pack(BIGWHEEL_ID, recipient);
    expect(packed.delivery).toBe("line");
    await t.deposit(BIGWHEEL_ID, packed);
    const attemptId = bytes32(`wrong-recipient-${recipient}`);
    await t.send("POST", `/api/gifts/${packed.gift.id}/message-attempt`, { attemptId });
    expect(
      (await t.send("POST", `/api/gifts/${packed.gift.id}/deliver-person`, { attemptId })).status,
    ).toBe(403);
  }
  t.sqlite.close();
});

it("does not resume a historical pair gift without an escrow object", async () => {
  const t = await setup();
  const packed = await t.pack(BIGWHEEL_ID, HANA_ID);
  await t.deposit(BIGWHEEL_ID, packed);
  t.db.update(gifts).set({ delivery: "line" }).where(eq(gifts.id, packed.gift.id)).run();
  t.chain.escrow.delete(packed.gift.id);
  expect(
    (await t.send("POST", "/api/gifts", { stickerId: packed.gift.stickerId, forUserId: HANA_ID }))
      .status,
  ).toBe(409);
  t.sqlite.close();
});

it("acknowledges isolated mock-chain private gifts once and receives them in both directions", async () => {
  const t = await createTestApp({
    personSwitch: { mode: "live", operatorUserId: BIGWHEEL_ID, hanaUserId: HANA_ID },
  });
  t.clock.set(new Date());
  insertUser(t.db, { id: BIGWHEEL_ID, lineUserId: "line-bigwheel" });
  insertUser(t.db, { id: HANA_ID, lineUserId: "dev-video-hana" });
  let headers = await t.signInAs(BIGWHEEL_ID);
  const send = (method: string, path: string, body?: unknown) =>
    t.send(method, path, { headers, body });
  const stickerId = insertSealedSticker(t.db, BIGWHEEL_ID);
  try {
    for (const [giver, recipient] of [
      [BIGWHEEL_ID, HANA_ID],
      [HANA_ID, BIGWHEEL_ID],
    ]) {
      const packaged = await send("POST", "/api/gifts", { stickerId, forUserId: recipient });
      expect(packaged.status).toBe(201);
      const packed = packagedGiftSchema.parse(await packaged.json());
      expect(packed.deposit).toBeNull();
      const attemptId = bytes32(`mock-attempt-${giver}`);
      expect(
        (await send("POST", `/api/gifts/${packed.gift.id}/message-attempt`, { attemptId })).status,
      ).toBe(200);
      t.db.update(gifts).set({ escrowStatus: "missing" }).where(eq(gifts.id, packed.gift.id)).run();
      expect(
        (await send("POST", `/api/gifts/${packed.gift.id}/deliver-person`, { attemptId })).status,
      ).toBe(409);
      t.db.update(gifts).set({ escrowStatus: "pending" }).where(eq(gifts.id, packed.gift.id)).run();
      const delivered = await send("POST", `/api/gifts/${packed.gift.id}/deliver-person`, {
        attemptId,
      });
      expect(delivered.status).toBe(200);
      expect(
        await (
          await send("POST", `/api/gifts/${packed.gift.id}/deliver-person`, { attemptId })
        ).json(),
      ).toEqual(await delivered.json());
      const selection = await send("POST", "/api/session/person", { userId: recipient });
      expect(selection.status).toBe(200);
      const { selectionVersion } = z
        .object({ selectionVersion: z.string() })
        .parse(await selection.json());
      headers = {
        ...headers,
        "x-croquis-user-id": recipient,
        "x-croquis-selection-version": selectionVersion,
      };
      expect((await send("POST", `/api/gifts/${packed.gift.id}/receive`)).status).toBe(200);
      expect((await send("POST", `/api/gifts/${packed.gift.id}/receive`)).status).toBe(200);
      expect(t.db.select().from(stickers).where(eq(stickers.id, stickerId)).get()?.ownerId).toBe(
        recipient,
      );
    }
    expect(t.db.select().from(gifts).all()).toHaveLength(2);
    expect(t.db.select().from(stickers).where(eq(stickers.id, stickerId)).get()?.ownerId).toBe(
      BIGWHEEL_ID,
    );
  } finally {
    t.sqlite.close();
  }
});
