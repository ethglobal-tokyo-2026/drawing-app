// @vitest-environment happy-dom
import type { SponsoredTransaction } from "@drawing-app/api/client";
import { act, createElement, useLayoutEffect } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { emptyApi, renderWithApi } from "../api/testing";
import { gift } from "../api/testFixtures";
import { onMyStickerBoardChanged, useMyStickerBoard } from "../sticker-board/useMyStickerBoard";
import {
  createApiGiftBackend,
  GiftPackagingError,
  type PackWait,
  type SignSponsored,
} from "./giftBackend";
import type { GiftSendOutcome } from "./giftSender";
import { createGiveFlow } from "./giveFlow";
import { reportKeptSends } from "./sentReports";

const token = `0x${"cd".repeat(32)}`;
const userId = "user-giver";
/** A transaction the server built for the giver's wallet to sign. */
const sponsored = (digest: string): SponsoredTransaction => ({
  txBytes: "AAAA",
  digest,
  expiresAt: "2026-10-07T01:00:00.000Z",
});
const firstDeposit = sponsored("deposit-1");
const takeOutTx = sponsored("take-out-1");
/** No answer from the server. */
const noAnswer = () => new ApiError(0, { error: "network", detail: "POST got no answer" });

function setup() {
  const packed = gift({ status: "packed", escrowStatus: "missing" });
  const packageGift = vi
    .fn()
    .mockResolvedValueOnce({ gift: packed, giftClaimToken: token, deposit: firstDeposit })
    .mockResolvedValue({ gift: packed, giftClaimToken: null, deposit: null });
  const reportDeposit = vi.fn<ApiClient["reportDeposit"]>(async () => ({
    ...packed,
    escrowStatus: "pending",
  }));
  const reportShared = vi.fn(async () => ({ ...packed, status: "sent" as const }));
  const startTakeOut = vi.fn<ApiClient["startTakeOut"]>(async () => ({
    gift: packed,
    takeOut: takeOutTx,
  }));
  const takeOutGift = vi.fn(async () => ({ ...packed, status: "taken_out" as const }));
  const sign = vi.fn<SignSponsored>(async (tx) => ({
    digest: tx.digest,
    signature: `signed-${tx.digest}`,
  }));
  const api = emptyApi({ packageGift, reportDeposit, reportShared, startTakeOut, takeOutGift });
  const options = { api, sign, userId, fromHandle: "alice", liffId: "123-abc" };
  const backend = createApiGiftBackend(options);
  const sticker = { id: packed.stickerId, no: 147, timeUsed: 12 };
  return {
    packed,
    backend,
    options,
    sticker,
    sign,
    reportDeposit,
    reportShared,
    startTakeOut,
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

/** Gives the sticker in a LINE chat on this page, with fake timers, until LINE's picker has `answer`ed. */
async function giveInLine(t: ReturnType<typeof setup>, answer: Promise<GiftSendOutcome>) {
  const flow = createGiveFlow({
    sticker: t.sticker,
    backend: t.backend,
    sender: { send: () => answer },
    pickerDelayMs: 0,
    takeOutMs: 0,
    report: () => {},
  });
  flow.give();
  await vi.advanceTimersByTimeAsync(0);
  return flow;
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

describe("Giving through the Sui wallet", () => {
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

  it("says what packing waits on as it goes: the server, the sticker going in, the server again", async () => {
    const t = setup();
    const heard: PackWait[] = [];
    await t.backend.pack(t.sticker, (wait) => heard.push(wait));
    expect(heard).toEqual(["asking", "moving", "asking"]);
  });

  it("signs the deposit the server built and reports it once before returning a Gift Message", async () => {
    const t = setup();
    const packed = await t.backend.pack(t.sticker);
    expect(t.sign).toHaveBeenCalledExactlyOnceWith(firstDeposit);
    expect(t.reportDeposit).toHaveBeenCalledExactlyOnceWith(t.packed.id, {
      digest: firstDeposit.digest,
      signature: `signed-${firstDeposit.digest}`,
    });
    expect(packed.giftId).toBe(t.packed.id);
    expect(packed.message).toBeDefined();
  });

  it("gives a gift with nothing to sign when the server answers no deposit", async () => {
    const t = setup();
    t.packageGift
      .mockReset()
      .mockResolvedValue({ gift: t.packed, giftClaimToken: token, deposit: null });
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: t.packed.id });
    expect(t.sign).not.toHaveBeenCalled();
    expect(t.reportDeposit).not.toHaveBeenCalled();
  });

  it("takes a gift out by signing the take-out the server builds", async () => {
    const t = setup();
    await t.backend.pack(t.sticker);
    await t.backend.takeOut(t.packed.id);
    expect(t.startTakeOut).toHaveBeenCalledExactlyOnceWith(t.packed.id);
    expect(t.sign).toHaveBeenLastCalledWith(takeOutTx);
    expect(t.takeOutGift).toHaveBeenCalledExactlyOnceWith(t.packed.id, {
      digest: takeOutTx.digest,
      signature: `signed-${takeOutTx.digest}`,
    });
  });

  it("takes out a gift whose sticker never went in without signing anything", async () => {
    const t = setup();
    t.startTakeOut.mockResolvedValueOnce({ gift: { ...t.packed, status: "taken_out" } });
    await t.backend.takeOut(t.packed.id);
    expect(t.sign).not.toHaveBeenCalled();
    expect(t.takeOutGift).not.toHaveBeenCalled();
  });

  it("shares a take-out under way rather than starting a second", async () => {
    const t = setup();
    await t.backend.pack(t.sticker);
    await Promise.all([t.backend.takeOut(t.packed.id), t.backend.takeOut(t.packed.id)]);
    expect(t.startTakeOut).toHaveBeenCalledOnce();
    expect(t.takeOutGift).toHaveBeenCalledOnce();
  });

  it("keeps the gift and its Gift Claim Token when the deposit's answer is lost, and signs the same deposit again", async () => {
    const t = setup();
    const lost = new ApiError(503, {
      error: "deposit_not_landed",
      detail: "Sui's answer was lost",
    });
    t.reportDeposit.mockRejectedValueOnce(lost);
    await expect(t.backend.pack(t.sticker)).rejects.toMatchObject({
      giftId: t.packed.id,
      cause: lost,
    });
    t.packageGift.mockResolvedValue({
      gift: t.packed,
      giftClaimToken: null,
      deposit: firstDeposit,
    });
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: t.packed.id });
    expect(t.sign.mock.calls).toEqual([[firstDeposit], [firstDeposit]]);
    expect(t.startTakeOut).not.toHaveBeenCalled();
  });

  it("packages again for a fresh deposit when its sponsorship lapsed before Sui took it", async () => {
    const t = setup();
    const fresh = sponsored("deposit-2");
    t.reportDeposit.mockRejectedValueOnce(
      new ApiError(409, { error: "sponsorship_expired", detail: "The sponsorship lapsed" }),
    );
    t.packageGift.mockResolvedValue({ gift: t.packed, giftClaimToken: null, deposit: fresh });
    await expect(t.backend.pack(t.sticker)).resolves.toMatchObject({ giftId: t.packed.id });
    expect(t.reportDeposit).toHaveBeenLastCalledWith(t.packed.id, {
      digest: fresh.digest,
      signature: `signed-${fresh.digest}`,
    });
    expect(t.startTakeOut).not.toHaveBeenCalled();
  });

  it("gives up after a second lapsed sponsorship, keeping the gift identifiable for Taking out", async () => {
    const t = setup();
    const lapsed = new ApiError(409, {
      error: "sponsorship_expired",
      detail: "The sponsorship lapsed",
    });
    t.reportDeposit.mockRejectedValue(lapsed);
    t.packageGift.mockResolvedValue({
      gift: t.packed,
      giftClaimToken: null,
      deposit: sponsored("deposit-2"),
    });
    await expect(t.backend.pack(t.sticker)).rejects.toMatchObject({
      giftId: t.packed.id,
      cause: lapsed,
    });
    expect(t.reportDeposit).toHaveBeenCalledTimes(2);
  });

  it("reuses the gift and token after closing and reopening Giving on the same page", async () => {
    const t = setup();
    const firstGift = await t.backend.pack(t.sticker);
    const reopened = createApiGiftBackend(t.options);
    await expect(reopened.pack(t.sticker)).resolves.toEqual(firstGift);
    expect(t.sign).toHaveBeenCalledOnce();
    expect(t.startTakeOut).not.toHaveBeenCalled();
  });

  it("replaces a Gift Claim Token an earlier page took with it: takes the gift out, then packs it again", async () => {
    const t = setup();
    const replacement = gift({ status: "packed", escrowStatus: "missing" });
    const replacementDeposit = sponsored("deposit-2");
    t.packageGift
      .mockReset()
      .mockResolvedValueOnce({ gift: t.packed, giftClaimToken: null, deposit: null })
      .mockResolvedValueOnce({
        gift: replacement,
        giftClaimToken: token,
        deposit: replacementDeposit,
      });
    const heard: PackWait[] = [];
    await expect(t.backend.pack(t.sticker, (wait) => heard.push(wait))).resolves.toMatchObject({
      giftId: replacement.id,
    });
    expect(t.startTakeOut).toHaveBeenCalledExactlyOnceWith(t.packed.id);
    expect(t.takeOutGift).toHaveBeenCalledWith(t.packed.id, expect.anything());
    expect(t.reportDeposit).toHaveBeenCalledExactlyOnceWith(replacement.id, expect.anything());
    expect(heard).toEqual(["asking", "earlier", "asking", "moving", "asking"]);
  });

  it("shares an in-progress pack across Giving instances instead of replacing its token", async () => {
    const t = setup();
    const second = createApiGiftBackend(t.options);
    const [firstGift, secondGift] = await Promise.all([
      t.backend.pack(t.sticker),
      second.pack(t.sticker),
    ]);
    expect(firstGift).toEqual(secondGift);
    expect(t.packageGift).toHaveBeenCalledOnce();
    expect(t.sign).toHaveBeenCalledOnce();
  });

  it("stops before LINE when the gift was taken out before its deposit landed", async () => {
    const t = setup();
    t.reportDeposit.mockResolvedValueOnce({ ...t.packed, status: "taken_out" });
    await expect(t.backend.pack(t.sticker)).rejects.toBeInstanceOf(GiftPackagingError);
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
    [
      "was in LINE's picker when the page went",
      "maybeSent",
      async (t: ReturnType<typeof setup>) => {
        const flow = await giveInLine(t, new Promise(() => {}));
        expect(flow.getState().step).toBe("picking");
        // The page goes before LINE answers, and its timers with it.
        vi.clearAllTimers();
      },
    ],
  ] as const)(
    "never takes out a gift whose message %s when its sticker is given after a reload",
    async (_, outcome, mark) => {
      vi.useFakeTimers();
      const t = setup();
      await t.backend.pack(t.sticker);
      await mark(t);
      const { createApiGiftBackend: afterReload } = await reload();
      t.packageGift.mockResolvedValue({ gift: t.packed, giftClaimToken: null, deposit: null });
      expect(await failureOf(afterReload(t.options).pack(t.sticker))).toMatchObject({
        giftId: t.packed.id,
        outcome,
      });
      expect(t.startTakeOut).not.toHaveBeenCalled();
      if (outcome === "sent") expect(t.reportShared).toHaveBeenLastCalledWith(t.packed.id, "sent");
    },
  );

  it("reports a send the server missed each time the app starts, until the server hears it", async () => {
    vi.useFakeTimers();
    const t = setup();
    await t.backend.pack(t.sticker);
    t.reportShared.mockRejectedValue(new ApiError(401, { error: "signed_out" }));
    expect(await failureOf(t.backend.markSent(t.packed.id))).toBeInstanceOf(ApiError);
    const reports = () => t.reportShared.mock.calls.length;
    // The board on screen loads again only once the server has heard.
    const boardChanged = vi.fn();
    const stopListening = onMyStickerBoardChanged(boardChanged);

    t.reportShared.mockRejectedValue(noAnswer());
    await reportKeptSends(t.api, userId);
    const unheard = reports();
    expect(boardChanged).not.toHaveBeenCalled();
    t.reportShared.mockResolvedValue({ ...t.packed, status: "sent" });
    await reportKeptSends(t.api, userId);
    expect(reports()).toBe(unheard + 1);
    expect(t.reportShared).toHaveBeenLastCalledWith(t.packed.id, "sent");
    expect(boardChanged).toHaveBeenCalledOnce();
    await reportKeptSends(t.api, userId);
    expect(reports()).toBe(unheard + 1);
    expect(boardChanged).toHaveBeenCalledOnce();
    stopListening();
  });

  it("sends a gift whose picker was cancelled as it is when Giving opens again", async () => {
    vi.useFakeTimers();
    const t = setup();
    const flow = await giveInLine(t, Promise.resolve("cancelled"));
    expect(flow.getState().step).toBe("notSent");
    await expect(createApiGiftBackend(t.options).pack(t.sticker)).resolves.toMatchObject({
      giftId: t.packed.id,
    });
    expect(t.startTakeOut).not.toHaveBeenCalled();
  });
});
