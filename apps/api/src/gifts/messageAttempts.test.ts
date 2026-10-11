import { gifts } from "@drawing-app/db";
import { bytes32, insertUser } from "@drawing-app/db/testing";
import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { packagedGiftSchema } from "./packaging.ts";
import { createGiftsTestApp } from "./testGifts.ts";

const first = bytes32("first attempt");
const second = bytes32("second attempt");

describe("durable Gift Message attempts", () => {
  it("serializes competing begins and preserves the original recipient and token commitment", async () => {
    const t = await createGiftsTestApp();
    const giver = insertUser(t.db);
    const receiver = insertUser(t.db);
    const stickerId = t.sealSticker(giver);
    const packed = packagedGiftSchema.parse(
      await (await t.post(giver, "", { stickerId, forUserId: receiver })).json(),
    );
    const id = packed.gift.id;
    const before = t.giftRow(id);
    const begin = (attemptId: string) => t.post(giver, `/${id}/message-attempt`, { attemptId });
    expect((await begin(first)).status).toBe(200);
    expect((await begin(first)).status).toBe(200);
    t.clock.advance(30 * 24 * 60 * 60_000);
    const other = await begin(second);
    expect(other.status).toBe(409);
    expect(await other.json()).toMatchObject({ error: "gift_message_unresolved" });
    expect(t.giftRow(id)).toMatchObject({
      messageAttemptId: first,
      messageAttemptState: "pending",
      forUserId: receiver,
      claimCommitment: before.claimCommitment,
    });
    const recovered = await (
      await t.post(giver, "", { stickerId, forUserId: insertUser(t.db) })
    ).json();
    expect(recovered).toMatchObject({
      forUserId: receiver,
      giftClaimToken: null,
      messageAttempt: { id: first, state: "pending" },
    });
  });

  it("acknowledges only one of two concurrent begin IDs", async () => {
    const t = await createGiftsTestApp();
    const p = await t.packagedGift();
    const responses = await Promise.all(
      [first, second].map((attemptId) =>
        t.post(p.giverId, `/${p.gift.id}/message-attempt`, { attemptId }),
      ),
    );
    expect(responses.map((response) => response.status).sort((a, b) => a - b)).toEqual([200, 409]);
    const winner = responses.findIndex((response) => response.status === 200);
    expect(t.giftRow(p.gift.id)).toMatchObject({
      messageAttemptState: "pending",
      messageAttemptId: [first, second][winner],
    });
  });

  it("requires the giver, deposited escrow, and an open gift", async () => {
    const t = await createGiftsTestApp({ onSui: true });
    const p = await t.packagedGift();
    const path = `/${p.gift.id}/message-attempt`;
    expect((await t.post(insertUser(t.db), path, { attemptId: first })).status).toBe(403);
    expect(await (await t.post(p.giverId, path, { attemptId: first })).json()).toMatchObject({
      error: "not_deposited",
    });
    await t.takeOut(p.giverId, p.gift.id);
    expect(await (await t.post(p.giverId, path, { attemptId: first })).json()).toMatchObject({
      error: "gift_closed",
    });
  });

  it("rejects stale cancellation and makes matching reports idempotent without downgrading sent", async () => {
    const t = await createGiftsTestApp();
    const p = await t.packagedGift();
    const id = p.gift.id;
    const begin = (attemptId: string) => t.post(p.giverId, `/${id}/message-attempt`, { attemptId });
    const report = (attemptId: string, outcome: "sent" | "cancelled") =>
      t.post(p.giverId, `/${id}/shared`, { attemptId, outcome });
    expect(await (await report(first, "sent")).json()).toMatchObject({
      error: "gift_message_attempt_changed",
    });
    await begin(first);
    expect((await report(first, "cancelled")).status).toBe(200);
    expect((await report(first, "cancelled")).status).toBe(200);
    expect((await begin(second)).status).toBe(200);
    expect(await (await report(first, "cancelled")).json()).toMatchObject({
      error: "gift_message_attempt_changed",
    });
    expect((await report(second, "sent")).status).toBe(200);
    const sentAt = t.giftRow(id).sentAt;
    expect((await report(second, "sent")).status).toBe(200);
    expect((await report(second, "cancelled")).status).toBe(200);
    expect(t.giftRow(id)).toMatchObject({ status: "sent", sentAt, messageAttemptState: "sent" });
    expect(await (await begin(first)).json()).toMatchObject({ error: "gift_closed" });
    expect(
      await (await t.post(p.giverId, "", { stickerId: p.gift.stickerId })).json(),
    ).toMatchObject({
      gift: { status: "sent" },
      messageAttempt: { id: second, state: "sent" },
      giftClaimToken: null,
      deposit: null,
    });
  });

  it.each(["received", "taken_out", "returned"] as const)(
    "refuses attempts and reports on %s gifts",
    async (status) => {
      const t = await createGiftsTestApp();
      const p = await t.packagedGift();
      const id = p.gift.id;
      await t.post(p.giverId, `/${id}/message-attempt`, { attemptId: first });
      t.db
        .update(gifts)
        .set(
          status === "received"
            ? {
                status,
                receiverId: insertUser(t.db),
                receivedAt: new Date(),
                escrowStatus: "claimed",
              }
            : status === "taken_out"
              ? { status, takenOutAt: new Date(), escrowStatus: "taken_out" }
              : { status, returnedAt: new Date(), escrowStatus: "expired_returned" },
        )
        .where(eq(gifts.id, id))
        .run();
      for (const [route, body] of [
        ["message-attempt", { attemptId: first }],
        ["shared", { attemptId: first, outcome: "sent" }],
      ] as const) {
        expect(await (await t.post(p.giverId, `/${id}/${route}`, body)).json()).toMatchObject({
          error: "gift_closed",
        });
      }
    },
  );
});
