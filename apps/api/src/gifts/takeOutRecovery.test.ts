import { bytes32 } from "@drawing-app/db/testing";
import { describe, expect, it, vi } from "vitest";
import { takeOutStartSchema } from "./packaging.ts";
import { createGiftsTestApp } from "./testGifts.ts";

const first = bytes32("first recovery attempt");
const second = bytes32("second recovery attempt");

describe("automatic recovery of a known-unsent gift", () => {
  it("closes a never-started gift only when its message still has not started", async () => {
    const t = await createGiftsTestApp();
    const p = await t.packagedGift();
    const response = await t.post(p.giverId, `/${p.gift.id}/take-out/start`, {
      unsentMessageAttempt: null,
    });
    expect(response.status).toBe(200);
    expect(t.giftRow(p.gift.id).status).toBe("taken_out");
  });

  it.each(["pending", "sent"] as const)(
    "keeps a gift whose message became %s after the preparation snapshot",
    async (state) => {
      const t = await createGiftsTestApp();
      const p = await t.packagedGift();
      await t.post(p.giverId, `/${p.gift.id}/message-attempt`, { attemptId: first });
      if (state === "sent")
        await t.post(p.giverId, `/${p.gift.id}/shared`, {
          attemptId: first,
          outcome: "sent",
        });
      const response = await t.post(p.giverId, `/${p.gift.id}/take-out/start`, {
        unsentMessageAttempt: null,
      });
      expect(response.status).toBe(409);
      expect(await response.json()).toMatchObject({ error: "gift_message_unresolved" });
      expect(t.giftRow(p.gift.id)).toMatchObject({
        status: state === "sent" ? "sent" : "packed",
        messageAttemptId: first,
        messageAttemptState: state,
      });
    },
  );

  it("requires the same cancelled attempt before closing a lost-link gift", async () => {
    const t = await createGiftsTestApp();
    const p = await t.packagedGift();
    await t.post(p.giverId, `/${p.gift.id}/message-attempt`, { attemptId: first });
    await t.post(p.giverId, `/${p.gift.id}/shared`, { attemptId: first, outcome: "cancelled" });
    await t.post(p.giverId, `/${p.gift.id}/message-attempt`, { attemptId: second });
    await t.post(p.giverId, `/${p.gift.id}/shared`, { attemptId: second, outcome: "cancelled" });
    const response = await t.post(p.giverId, `/${p.gift.id}/take-out/start`, {
      unsentMessageAttempt: { id: first, state: "cancelled" },
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "gift_message_attempt_changed" });
    expect(t.giftRow(p.gift.id).status).toBe("packed");
  });

  it("checks the send again after the giver signs a sponsored take-out", async () => {
    const t = await createGiftsTestApp({ onSui: true });
    const p = await t.depositedGift();
    const started = takeOutStartSchema.parse(
      await (
        await t.post(p.giverId, `/${p.gift.id}/take-out/start`, { unsentMessageAttempt: null })
      ).json(),
    );
    if (!started.takeOut) throw new Error("Expected a sponsored take-out");
    await t.post(p.giverId, `/${p.gift.id}/message-attempt`, { attemptId: first });
    const before = t.chain.submissions.length;
    const response = await t.post(p.giverId, `/${p.gift.id}/take-out`, {
      ...(await t.signed(p.giverId, started.takeOut)),
      unsentMessageAttempt: null,
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ error: "gift_message_unresolved" });
    expect(t.chain.submissions).toHaveLength(before);
    expect(t.giftRow(p.gift.id)).toMatchObject({
      status: "packed",
      escrowStatus: "pending",
      messageAttemptState: "pending",
    });
  });

  it("serializes a new message attempt with a guarded take-out already being submitted", async () => {
    const t = await createGiftsTestApp({ onSui: true });
    const p = await t.depositedGift();
    const started = takeOutStartSchema.parse(
      await (
        await t.post(p.giverId, `/${p.gift.id}/take-out/start`, { unsentMessageAttempt: null })
      ).json(),
    );
    if (!started.takeOut) throw new Error("Expected a sponsored take-out");
    let release = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    const submit = t.chain.sui.submit.bind(t.chain.sui);
    const submitting = vi
      .spyOn(t.chain.sui, "submit")
      .mockImplementation(async (tx, signatures) => {
        await held;
        return submit(tx, signatures);
      });
    const takenOut = t.post(p.giverId, `/${p.gift.id}/take-out`, {
      ...(await t.signed(p.giverId, started.takeOut)),
      unsentMessageAttempt: null,
    });
    await vi.waitFor(() => expect(submitting).toHaveBeenCalledOnce());
    const began = t.post(p.giverId, `/${p.gift.id}/message-attempt`, { attemptId: first });
    release();
    expect((await takenOut).status).toBe(200);
    expect((await began).status).toBe(409);
    expect(await (await began).json()).toMatchObject({ error: "gift_closed" });
    expect(t.giftRow(p.gift.id)).toMatchObject({
      status: "taken_out",
      messageAttemptState: "not_started",
      messageAttemptId: null,
    });
    submitting.mockRestore();
  });

  it("refuses a new send until a submitted take-out with no chain answer settles", async () => {
    const t = await createGiftsTestApp({ onSui: true });
    const p = await t.depositedGift();
    const started = takeOutStartSchema.parse(
      await (
        await t.post(p.giverId, `/${p.gift.id}/take-out/start`, { unsentMessageAttempt: null })
      ).json(),
    );
    if (!started.takeOut) throw new Error("Expected a sponsored take-out");
    const signed = await t.signed(p.giverId, started.takeOut);
    t.chain.answerNext("lost");
    const submitted = await t.post(p.giverId, `/${p.gift.id}/take-out`, {
      ...signed,
      unsentMessageAttempt: null,
    });
    expect(submitted.status).toBe(503);
    const began = await t.post(p.giverId, `/${p.gift.id}/message-attempt`, { attemptId: first });
    expect(began.status).toBe(503);
    expect(await began.json()).toMatchObject({ error: "take_out_not_landed" });
    expect(t.giftRow(p.gift.id).messageAttemptId).toBeNull();
    t.chain.show(signed.digest, { ok: true, events: [] });
    expect(
      (
        await t.post(p.giverId, `/${p.gift.id}/take-out`, {
          ...signed,
          unsentMessageAttempt: null,
        })
      ).status,
    ).toBe(200);
    expect(t.giftRow(p.gift.id).status).toBe("taken_out");
    expect(
      (await t.post(p.giverId, `/${p.gift.id}/message-attempt`, { attemptId: first })).status,
    ).toBe(409);
  });
});
