// @vitest-environment happy-dom
import type { Hash } from "viem";
import { act, createElement, useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/apiClient";
import { emptyApi, renderWithApi } from "../api/testing";
import { gift } from "../api/testFixtures";
import { useMyStickerBoard } from "../sticker-board/useMyStickerBoard";
import { createApiGiftBackend, GiftPackagingError, type PackWait } from "./giftBackend";
import {
  GiftTransactionRevertedError,
  GiftTransactionUnconfirmedError,
  type GiftTransactions,
} from "./giftTransactions";

const hash: Hash = `0x${"ab".repeat(32)}`;
const takeOutHash: Hash = `0x${"ef".repeat(32)}`;
const token = `0x${"cd".repeat(32)}`;
const transfer = { to: `0x${"12".repeat(20)}`, data: "0x1234" };
const userId = "user-giver";
/** No answer from the server. */
const noAnswer = () => new ApiError(0, { error: "network", detail: "POST got no answer" });

function setup() {
  const packed = gift({ status: "packed", escrowStatus: "missing" });
  const packageGift = vi
    .fn()
    .mockResolvedValueOnce({ gift: packed, giftClaimToken: token, escrowTransfer: transfer })
    .mockResolvedValue({ gift: packed, giftClaimToken: null, escrowTransfer: transfer });
  const reportDeposit = vi.fn(async () => packed);
  const reportShared = vi.fn(async () => ({ ...packed, status: "sent" as const }));
  const takeOutGift = vi.fn(async () => ({ ...packed, status: "taken_out" as const }));
  const transactions: GiftTransactions = {
    deposit: vi.fn<GiftTransactions["deposit"]>(async (_id, _transfer, _sent, record) => {
      record.sending(Date.now());
      record.submitted(hash);
      return hash;
    }),
    takeOut: vi.fn<GiftTransactions["takeOut"]>(async (_id, _sent, record) => {
      record.sending(Date.now());
      record.submitted(takeOutHash);
      return "takenOut";
    }),
  };
  const api = emptyApi({ packageGift, reportDeposit, reportShared, takeOutGift });
  const options = { api, transactions, userId, fromHandle: "alice", liffId: "123-abc" };
  const backend = createApiGiftBackend(options);
  const sticker = { id: packed.stickerId, no: 147, timeUsed: 12 };
  return {
    packed,
    backend,
    options,
    sticker,
    transactions,
    reportDeposit,
    reportShared,
    takeOutGift,
    packageGift,
    api,
  };
}

/** The page loads again: Giving's module starts over, and only this device's storage is left. */
async function reload() {
  vi.resetModules();
  return import("./giftBackend");
}

/** What `work` fails with once every timer has run, or null when it doesn't fail. */
async function failureOf(work: Promise<unknown>) {
  const failure = work.then(
    () => null,
    (error: unknown) => error,
  );
  await vi.runAllTimersAsync();
  return failure;
}

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("Giving through the smart account", () => {
  it("forgets your board's kept answer once the sticker is in a gift, so the give sheet can't offer it", async () => {
    const t = setup();
    const seen: string[] = [];
    function Reader() {
      const board = useMyStickerBoard();
      useLayoutEffect(() => void seen.push(board.state));
      return null;
    }
    const view = renderWithApi(createElement(Reader), t.api);
    await act(async () => {});
    const mountsShowing = async () => {
      view.rerender(null);
      seen.length = 0;
      view.rerender(createElement(Reader));
      const first = seen[0];
      await act(async () => {});
      return first;
    };
    expect(await mountsShowing()).toBe("ready");
    await t.backend.pack(t.sticker);
    expect(await mountsShowing()).toBe("loading");
    view.unmount();
  });

  it("says what packing waits on as it goes: the server, the sticker going in, the bag confirming, the server again", async () => {
    const t = setup();
    const heard: PackWait[] = [];
    await t.backend.pack(t.sticker, (wait) => heard.push(wait));
    expect(heard).toEqual(["asking", "moving", "confirming", "asking"]);
  });

  it("confirms the escrow deposit before returning a Gift Message", async () => {
    const t = setup();
    const packed = await t.backend.pack(t.sticker);
    expect(t.transactions.deposit).toHaveBeenCalledWith(
      t.packed.id,
      transfer,
      { hash: undefined, sentAt: undefined },
      expect.anything(),
    );
    expect(t.reportDeposit).toHaveBeenCalledWith(t.packed.id, hash);
    expect(packed.giftId).toBe(t.packed.id);
    await t.backend.takeOut(packed.giftId);
    expect(t.transactions.takeOut).toHaveBeenCalledWith(
      packed.giftId,
      { hash: undefined, sentAt: undefined },
      expect.anything(),
      expect.objectContaining({ hash }),
    );
    expect(t.takeOutGift).toHaveBeenCalledWith(packed.giftId);
  });

  it("retains the claim token and submitted hash when deposit reporting fails", async () => {
    const t = setup();
    t.reportDeposit.mockRejectedValueOnce(new Error("Server unavailable"));
    await expect(t.backend.pack(t.sticker)).rejects.toThrow("Server unavailable");
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: t.packed.id });
    expect(t.transactions.deposit).toHaveBeenLastCalledWith(
      t.packed.id,
      transfer,
      expect.objectContaining({ hash }),
      expect.anything(),
    );
    expect(t.takeOutGift).not.toHaveBeenCalled();
  });

  it("keeps the allocated gift identifiable for Taking out after deposit reporting fails", async () => {
    const t = setup();
    const failure = new ApiError(502, { error: "internal_error", detail: "Server unavailable" });
    t.reportDeposit.mockRejectedValueOnce(failure);
    await expect(t.backend.pack(t.sticker)).rejects.toMatchObject({
      giftId: t.packed.id,
      cause: failure,
    });
    await t.backend.takeOut(t.packed.id);
    expect(t.transactions.takeOut).toHaveBeenCalledWith(
      t.packed.id,
      { hash: undefined, sentAt: undefined },
      expect.anything(),
      expect.objectContaining({ hash }),
    );
    expect(t.packageGift).toHaveBeenCalledTimes(1);
    expect(t.transactions.deposit).toHaveBeenCalledTimes(1);
  });

  it("clears a failed deposit hash so a retry can submit a new transaction", async () => {
    const t = setup();
    vi.mocked(t.transactions.deposit).mockImplementationOnce(
      async (_id, _transfer, _sent, record) => {
        record.sending(Date.now());
        record.submitted(hash);
        throw new GiftTransactionRevertedError("deposit");
      },
    );
    await expect(t.backend.pack(t.sticker)).rejects.toMatchObject({
      cause: { problem: "deposit_reverted" },
    });
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: t.packed.id });
    expect(t.transactions.deposit).toHaveBeenLastCalledWith(
      t.packed.id,
      transfer,
      { hash: undefined, sentAt: undefined },
      expect.anything(),
    );
    expect(t.transactions.takeOut).not.toHaveBeenCalled();
  });

  it("reuses the gift and token after closing and reopening Giving on the same page", async () => {
    const t = setup();
    const firstGift = await t.backend.pack(t.sticker);
    t.packageGift.mockResolvedValue({ gift: t.packed, giftClaimToken: null, escrowTransfer: null });
    const reopened = createApiGiftBackend(t.options);
    await expect(reopened.pack(t.sticker)).resolves.toEqual(firstGift);
    expect(t.transactions.deposit).toHaveBeenCalledTimes(1);
    expect(t.transactions.takeOut).not.toHaveBeenCalled();
  });

  it("does not record a taken-out Sticker when the chain fails", async () => {
    const t = setup();
    await t.backend.pack(t.sticker);
    vi.mocked(t.transactions.takeOut).mockRejectedValueOnce(new Error("Paymaster refused"));
    await expect(t.backend.takeOut(t.packed.id)).rejects.toThrow("Paymaster refused");
    expect(t.takeOutGift).not.toHaveBeenCalled();
  });

  it("settles and takes out a previous deposit before replacing a lost Gift Claim Token", async () => {
    const t = setup();
    const replacement = gift({ status: "packed", escrowStatus: "missing" });
    t.packageGift
      .mockReset()
      .mockResolvedValueOnce({ gift: t.packed, giftClaimToken: null, escrowTransfer: transfer })
      .mockResolvedValueOnce({
        gift: replacement,
        giftClaimToken: token,
        escrowTransfer: transfer,
      });
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: replacement.id });
    expect(t.transactions.deposit).toHaveBeenCalledTimes(2);
    expect(t.transactions.takeOut).toHaveBeenCalledWith(
      t.packed.id,
      { hash: undefined, sentAt: undefined },
      expect.anything(),
      expect.objectContaining({ hash }),
    );
    expect(t.takeOutGift).toHaveBeenCalledWith(t.packed.id);
    expect(t.transactions.deposit).toHaveBeenLastCalledWith(
      replacement.id,
      transfer,
      { hash: undefined, sentAt: undefined },
      expect.anything(),
    );
  });

  it("shares an in-progress pack across Giving instances instead of replacing its token", async () => {
    const t = setup();
    const second = createApiGiftBackend(t.options);
    const [firstGift, secondGift] = await Promise.all([
      t.backend.pack(t.sticker),
      second.pack(t.sticker),
    ]);
    expect(firstGift).toEqual(secondGift);
    expect(t.packageGift).toHaveBeenCalledTimes(1);
    expect(t.transactions.deposit).toHaveBeenCalledTimes(1);
    expect(t.transactions.takeOut).not.toHaveBeenCalled();
  });

  it("resumes an uncertain take-out without depositing again during token recovery", async () => {
    const t = setup();
    const replacement = gift({ status: "packed", escrowStatus: "missing" });
    t.packageGift
      .mockReset()
      .mockResolvedValueOnce({ gift: t.packed, giftClaimToken: null, escrowTransfer: transfer })
      .mockResolvedValueOnce({ gift: t.packed, giftClaimToken: null, escrowTransfer: transfer })
      .mockResolvedValueOnce({
        gift: replacement,
        giftClaimToken: token,
        escrowTransfer: transfer,
      });
    vi.mocked(t.transactions.takeOut).mockImplementationOnce(async (_id, _sent, record) => {
      record.sending(Date.now());
      record.submitted(takeOutHash);
      throw new GiftTransactionUnconfirmedError("takeOut");
    });
    await expect(t.backend.pack(t.sticker)).rejects.toBeInstanceOf(GiftPackagingError);
    expect(t.takeOutGift).not.toHaveBeenCalled();
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: replacement.id });
    expect(t.transactions.takeOut).toHaveBeenLastCalledWith(
      t.packed.id,
      expect.objectContaining({ hash: takeOutHash }),
      expect.anything(),
      expect.objectContaining({ hash }),
    );
    expect(t.transactions.deposit).toHaveBeenCalledTimes(2);
    expect(t.takeOutGift).toHaveBeenCalledTimes(1);
  });

  it("retries API confirmation without requesting another take-out approval", async () => {
    vi.useFakeTimers();
    const t = setup();
    await t.backend.pack(t.sticker);
    t.takeOutGift.mockRejectedValueOnce(
      new ApiError(409, { error: "take_out_not_landed", detail: "Still pending" }),
    );
    const first = t.backend.takeOut(t.packed.id);
    const second = t.backend.takeOut(t.packed.id);
    await vi.runAllTimersAsync();
    await Promise.all([first, second]);
    expect(t.transactions.takeOut).toHaveBeenCalledTimes(1);
    expect(t.takeOutGift).toHaveBeenCalledTimes(2);
  });

  it("takes out a gift whose deposit never reached the wallet, and sends it as it is after", async () => {
    const t = setup();
    vi.mocked(t.transactions.deposit).mockRejectedValueOnce(
      new ApiError(0, { error: "smart_account_not_ready" }),
    );
    // The escrow has nothing of this gift, so a take-out on chain can't be confirmed.
    vi.mocked(t.transactions.takeOut).mockRejectedValue(
      new GiftTransactionUnconfirmedError("takeOut"),
    );
    await expect(t.backend.pack(t.sticker)).rejects.toBeInstanceOf(GiftPackagingError);
    await t.backend.takeOut(t.packed.id);
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: t.packed.id });
    expect(t.transactions.takeOut).not.toHaveBeenCalled();
    expect(t.takeOutGift).not.toHaveBeenCalled();
  });

  it("takes a gift whose escrow record isn't this sticker's out without the chain", async () => {
    const t = setup();
    t.reportDeposit.mockRejectedValueOnce(
      new ApiError(409, { error: "deposit_mismatch", detail: "Another sticker's record" }),
    );
    await expect(t.backend.pack(t.sticker)).rejects.toBeInstanceOf(GiftPackagingError);
    await t.backend.takeOut(t.packed.id);
    expect(t.transactions.takeOut).not.toHaveBeenCalled();
    expect(t.takeOutGift).toHaveBeenCalledWith(t.packed.id);
  });

  it("stops before LINE when the deposit came back before it was reported", async () => {
    const t = setup();
    t.reportDeposit.mockResolvedValueOnce({ ...t.packed, status: "taken_out" });
    await expect(t.backend.pack(t.sticker)).rejects.toBeInstanceOf(GiftPackagingError);
  });

  it("takes out the earlier gift that holds the sticker, then packs it again", async () => {
    const t = setup();
    const held = gift({ status: "taken_out", escrowStatus: "pending" });
    t.packageGift
      .mockReset()
      .mockRejectedValueOnce(
        new ApiError(409, { error: "gift_held", detail: "Held in the escrow", giftId: held.id }),
      );
    t.packageGift.mockResolvedValue({
      gift: t.packed,
      giftClaimToken: token,
      escrowTransfer: transfer,
    });
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: t.packed.id });
    expect(t.transactions.takeOut).toHaveBeenCalledWith(
      held.id,
      expect.anything(),
      expect.anything(),
      expect.anything(),
    );
    expect(t.takeOutGift).toHaveBeenCalledWith(held.id);
  });

  it("tries the sent report again when it gets no answer", async () => {
    vi.useFakeTimers();
    const t = setup();
    await t.backend.pack(t.sticker);
    t.reportShared.mockRejectedValueOnce(noAnswer());
    expect(await failureOf(t.backend.markSent(t.packed.id))).toBeNull();
    expect(t.reportShared).toHaveBeenCalledTimes(2);
  });

  it.each([
    [
      "went out, its report unanswered",
      "sent",
      async (t: ReturnType<typeof setup>) => {
        t.reportShared.mockRejectedValue(noAnswer());
        expect(await failureOf(t.backend.markSent(t.packed.id))).toBeInstanceOf(ApiError);
        t.reportShared.mockResolvedValue({ ...t.packed, status: "sent" });
      },
    ],
    [
      "went out, its report refused while signed out",
      "sent",
      async (t: ReturnType<typeof setup>) => {
        t.reportShared.mockRejectedValueOnce(new ApiError(401, { error: "signed_out" }));
        expect(await failureOf(t.backend.markSent(t.packed.id))).toBeInstanceOf(ApiError);
      },
    ],
    [
      "may have gone out",
      "maybeSent",
      async (t: ReturnType<typeof setup>) => t.backend.markMaybeSent(t.packed.id),
    ],
  ] as const)(
    "never takes out a gift whose message %s when its sticker is given after a reload",
    async (_, outcome, mark) => {
      vi.useFakeTimers();
      const t = setup();
      await t.backend.pack(t.sticker);
      await mark(t);
      const { createApiGiftBackend: afterReload } = await reload();
      t.packageGift.mockResolvedValue({
        gift: t.packed,
        giftClaimToken: null,
        escrowTransfer: null,
      });
      expect(await failureOf(afterReload(t.options).pack(t.sticker))).toMatchObject({
        giftId: t.packed.id,
        outcome,
      });
      expect(t.transactions.takeOut).not.toHaveBeenCalled();
      expect(t.takeOutGift).not.toHaveBeenCalled();
      if (outcome === "sent") expect(t.reportShared).toHaveBeenLastCalledWith(t.packed.id, "sent");
    },
  );

  it("waits on a deposit sent before a reload instead of sending another", async () => {
    const t = setup();
    const sentAt = Date.now();
    // The page closes while the wallet waits on the deposit.
    vi.mocked(t.transactions.deposit).mockImplementationOnce((_id, _transfer, _sent, record) => {
      record.sending(sentAt);
      return new Promise(() => {});
    });
    void t.backend.pack(t.sticker);
    await vi.waitFor(() => expect(t.transactions.deposit).toHaveBeenCalledOnce());
    const { createApiGiftBackend: afterReload } = await reload();
    const replacement = gift({ status: "packed", escrowStatus: "missing" });
    t.packageGift
      .mockResolvedValueOnce({ gift: t.packed, giftClaimToken: null, escrowTransfer: transfer })
      .mockResolvedValueOnce({
        gift: replacement,
        giftClaimToken: token,
        escrowTransfer: transfer,
      });
    await afterReload(t.options).pack(t.sticker);
    expect(t.transactions.deposit).toHaveBeenNthCalledWith(
      2,
      t.packed.id,
      transfer,
      { hash: undefined, sentAt },
      expect.anything(),
    );
  });
});
