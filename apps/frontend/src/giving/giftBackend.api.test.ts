import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createGiftsTestApp } from "../../../api/src/gifts/testGifts";
import { insertUser } from "../../../../packages/db/src/testDb";
import { createHttpApi, createServerClient } from "../api/httpApi";
import { createApiGiftBackend } from "./giftBackend";
import { createGiveFlow } from "./giveFlow";

const attemptId = `0x${"12".repeat(32)}`;
class DeviceStorage {
  private values = new Map<string, string>();
  getItem(key: string) {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.values.set(key, value);
  }
  removeItem(key: string) {
    this.values.delete(key);
  }
}
beforeEach(() => {
  vi.stubGlobal("localStorage", new DeviceStorage());
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function reload() {
  vi.resetModules();
  return import("./giftBackend");
}

/** Real HTTP client and API/database; only LINE and its acknowledgement transport are simulated. */
async function actualApi() {
  const t = await createGiftsTestApp();
  const giver = insertUser(t.db);
  const recipient = insertUser(t.db);
  const other = insertUser(t.db);
  const stickerId = t.sealSticker(giver);
  const headers = await t.signInAs(giver);
  let loseBegin = false;
  let failReports = false;
  const api = createHttpApi(
    createServerClient(async (input, init) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (failReports && url.endsWith("/shared")) throw new Error("Report transport unavailable");
      const response = await t.app.request(url, {
        ...init,
        headers: { ...Object.fromEntries(new Headers(init?.headers)), ...headers },
      });
      if (loseBegin && url.endsWith("/message-attempt"))
        throw new Error("Begin acknowledgement lost");
      return response;
    }, giver),
  );
  const options = {
    api,
    userId: giver,
    forUserId: recipient,
    fromHandle: "alice",
    liffId: "123-abc",
  };
  return {
    ...t,
    api,
    options,
    giver,
    recipient,
    other,
    sticker: { id: stickerId, no: 147, timeUsed: 12 },
    loseBegin: () => {
      loseBegin = true;
    },
    failReports: (fail: boolean) => {
      failReports = fail;
    },
  };
}

describe("Giving against the actual API", () => {
  it("recovers a lost begin acknowledgement after reload without opening LINE or replacing the original gift", async () => {
    const t = await actualApi();
    t.loseBegin();
    const send = vi.fn(async () => "sent" as const);
    const backend = createApiGiftBackend(t.options);
    const flow = createGiveFlow({
      sticker: t.sticker,
      backend,
      sender: { send },
      takeOutMs: 0,
      report: () => {},
    });
    flow.give();
    await vi.waitFor(() => expect(flow.getState().step).toBe("failed"));
    expect(send).not.toHaveBeenCalled();
    const original = await t.api.packageGift(t.sticker.id, t.other);
    expect(original).toMatchObject({
      forUserId: t.recipient,
      giftClaimToken: null,
      messageAttempt: { state: "pending" },
    });
    const before = t.giftRow(original.gift.id);
    const fresh = await reload();
    const recovery = fresh.createApiGiftBackend({ ...t.options, forUserId: t.other });
    await expect(recovery.pack(t.sticker)).rejects.toMatchObject({
      outcome: "maybeSent",
      attemptId: original.messageAttempt?.id,
    });
    expect(t.giftRow(original.gift.id)).toMatchObject({
      forUserId: t.recipient,
      claimCommitment: before.claimCommitment,
      status: "packed",
    });
    flow.dispose();
  });

  it("allows only one of two tabs to open LINE, keeping the original token and recipient after cancellation", async () => {
    const t = await actualApi();
    const backend = createApiGiftBackend(t.options);
    const packed = await backend.pack(t.sticker);
    const commitment = t.giftRow(packed.giftId).claimCommitment;
    await backend.beginMessageAttempt(packed.giftId, attemptId);
    const fresh = await reload();
    const otherTab = fresh.createApiGiftBackend({ ...t.options, forUserId: t.other });
    await expect(otherTab.pack(t.sticker)).rejects.toMatchObject({
      outcome: "maybeSent",
      attemptId,
    });
    await expect(
      t.api.beginMessageAttempt(packed.giftId, `0x${"56".repeat(32)}`),
    ).rejects.toMatchObject({ code: "gift_message_unresolved" });
    await backend.markCancelled(packed.giftId, attemptId);
    expect(await backend.pack(t.sticker)).toEqual(packed);
    expect(t.giftRow(packed.giftId)).toMatchObject({
      forUserId: t.recipient,
      claimCommitment: commitment,
      messageAttemptState: "cancelled",
    });
    // A tab with no token presents explicit recovery, even after confirmed cancellation.
    await expect(otherTab.pack(t.sticker)).rejects.toMatchObject({ cause: { problem: "no_link" } });
    expect(t.giftRow(packed.giftId).status).toBe("packed");
  });

  it("keeps a failed cancellation report in memory with blocked storage and recovers server pending after reload", async () => {
    const t = await actualApi();
    const backend = createApiGiftBackend(t.options);
    const packed = await backend.pack(t.sticker);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    const blocked = vi.spyOn(DeviceStorage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    await backend.beginMessageAttempt(packed.giftId, attemptId);
    expect(backend.storageError?.()).toMatchObject({ problem: "storage_failed" });
    t.failReports(true);
    await expect(backend.markCancelled(packed.giftId, attemptId)).rejects.toMatchObject({
      status: 0,
    });
    const fresh = await reload();
    const otherTab = fresh.createApiGiftBackend(t.options);
    await expect(otherTab.pack(t.sticker)).rejects.toMatchObject({
      outcome: "maybeSent",
      attemptId,
    });
    expect(t.giftRow(packed.giftId)).toMatchObject({
      status: "packed",
      messageAttemptState: "pending",
      forUserId: t.recipient,
    });
    // On the original page, the failed report remains available for retry.
    t.failReports(false);
    blocked.mockRestore();
    await expect(backend.pack(t.sticker)).resolves.toEqual(packed);
    expect(t.giftRow(packed.giftId).messageAttemptState).toBe("cancelled");
    errors.mockRestore();
  });
});
