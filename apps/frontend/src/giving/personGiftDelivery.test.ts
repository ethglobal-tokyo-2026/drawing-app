// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { gift } from "../api/testFixtures";
import { emptyApi } from "../api/testing";
import { keepGift, keptReports, forgetKeptGift } from "./keptGifts";
import { reportKeptSends } from "./sentReports";
import { createApiGiftBackend } from "./giftBackend";
import { createGiveFlow } from "./giveFlow";
import { buildGiftMessage } from "./giftMessage";
import { liffGiftSender } from "./giftSender";

const userId = "private-giver";
const giftId = "private-gift";
const attemptId = `0x${"ab".repeat(32)}`;
const message = buildGiftMessage({
  liffId: "liff",
  giftClaimToken: "token",
  fromHandle: "giver",
  no: 1,
  timeUsed: 1,
  language: "en",
});
afterEach(() => {
  forgetKeptGift(userId, giftId);
  vi.useRealTimers();
  vi.restoreAllMocks();
});

it("recovers a lost protected acknowledgment through kept sends", async () => {
  const deliverPersonGift = vi.fn(async () => gift({ id: giftId, status: "sent" }));
  const reportShared = vi.fn(async () => gift());
  const giftDelivery = vi.fn(async () => ({ delivery: "person" as const }));
  const api = { ...emptyApi({ reportShared }), deliverPersonGift, giftDelivery };
  keepGift(userId, giftId, { message: "sent", attemptId });
  await reportKeptSends(api, userId);
  expect(giftDelivery).toHaveBeenCalledWith(giftId);
  expect(deliverPersonGift).toHaveBeenCalledWith(giftId, attemptId);
  expect(reportShared).not.toHaveBeenCalled();
  expect(keptReports(userId)).toEqual([]);
});

it("passes the server-confirmed delivery to the one GiftSender", async () => {
  vi.useFakeTimers();
  const send = vi.fn(async () => "sent" as const);
  const markSent = vi.fn(async () => {});
  const flow = createGiveFlow({
    sticker: { id: "s1", no: 1, timeUsed: 1 },
    sender: { send },
    backend: {
      pack: async () => ({ giftId, forUserId: "recipient", delivery: "person", message }),
      markSent,
      markCancelled: async () => {},
      beginMessageAttempt: async () => {},
      takeOut: async () => {},
    },
    takeOutMs: 0,
  });
  flow.give();
  await vi.advanceTimersByTimeAsync(0);
  expect(send).toHaveBeenCalledWith(message, "person");
  expect(markSent).toHaveBeenCalledOnce();
  expect(flow.getState()).toMatchObject({
    step: "sent",
    giftId,
    delivery: "person",
    packedForUserId: "recipient",
  });
  flow.dispose();
});

it("uses private delivery without opening the ordinary LINE picker", async () => {
  const picker = {
    isInClient: () => false,
    getLineVersion: () => null,
    isApiAvailable: () => true,
    shareTargetPicker: vi.fn(async () => ({ status: "success" as const })),
  };
  const sender = liffGiftSender(picker);
  if (!sender) throw new Error("Sender unavailable");
  expect(await sender.send(message, "person")).toBe("sent");
  expect(picker.shareTargetPicker).not.toHaveBeenCalled();
  await sender.send(message, "line");
  expect(picker.shareTargetPicker).toHaveBeenCalledOnce();
});

it("keeps a failed protected report for the next recovery and reports the failure", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const deliverPersonGift = vi.fn(async () => {
    throw new Error("Acknowledgment unavailable");
  });
  const api = {
    ...emptyApi(),
    giftDelivery: async () => ({ delivery: "person" as const }),
    deliverPersonGift,
  };
  keepGift(userId, giftId, { message: "sent", attemptId });
  await reportKeptSends(api, userId);
  expect(keptReports(userId)).toEqual([[giftId, { message: "sent", attemptId }]]);
  expect(log).toHaveBeenCalledWith(expect.stringContaining(giftId), expect.any(Error));
});

it("reports an ordinary lost LINE send and private cancellation through the ordinary route", async () => {
  const reportShared = vi.fn(async () => gift());
  const giftDelivery = vi.fn(async () => ({ delivery: "line" as const }));
  const deliverPersonGift = vi.fn(async () => gift());
  const api = { ...emptyApi({ reportShared }), giftDelivery, deliverPersonGift };
  keepGift(userId, giftId, { message: "sent", attemptId });
  await reportKeptSends(api, userId);
  expect(reportShared).toHaveBeenCalledWith(giftId, attemptId, "sent");
  expect(deliverPersonGift).not.toHaveBeenCalled();
  giftDelivery.mockClear();
  keepGift(userId, giftId, { message: "cancelled", attemptId });
  await reportKeptSends(api, userId);
  expect(reportShared).toHaveBeenCalledWith(giftId, attemptId, "cancelled");
  expect(giftDelivery).not.toHaveBeenCalled();
  expect(keptReports(userId)).toEqual([]);
});

it("waits for the private message attempt acknowledgment before its local send", async () => {
  vi.useFakeTimers();
  let acknowledge = () => {};
  const acknowledged = new Promise<void>((resolve) => {
    acknowledge = resolve;
  });
  const send = vi.fn(async () => "sent" as const);
  const markSent = vi.fn(async () => {});
  const flow = createGiveFlow({
    sticker: { id: "s1", no: 1, timeUsed: 1 },
    sender: { send },
    backend: {
      pack: async () => ({ giftId, forUserId: "recipient", delivery: "person", message }),
      markSent,
      markCancelled: async () => {},
      beginMessageAttempt: () => acknowledged,
      takeOut: async () => {},
    },
    takeOutMs: 0,
  });
  flow.give();
  await vi.advanceTimersByTimeAsync(0);
  expect(flow.getState().step).toBe("preparing");
  expect(send).not.toHaveBeenCalled();
  acknowledge();
  await vi.advanceTimersByTimeAsync(0);
  expect(send).toHaveBeenCalledWith(message, "person");
  expect(markSent).toHaveBeenCalledOnce();
  expect(flow.getState().step).toBe("sent");
  flow.dispose();
});

it("replaces a cancelled private gift without losing its recipient or protected delivery metadata", async () => {
  vi.useFakeTimers();
  const recipient = "private-recipient";
  const packed = gift({
    id: giftId,
    stickerId: "private-sticker",
    status: "packed",
    escrowStatus: "pending",
  });
  const replacement = { ...packed, id: "private-replacement" };
  const packageGift = vi
    .fn()
    .mockResolvedValueOnce({
      gift: packed,
      delivery: "person",
      forUserId: recipient,
      giftClaimToken: null,
      deposit: null,
      messageAttempt: { id: attemptId, state: "cancelled" },
    })
    .mockResolvedValueOnce({
      gift: replacement,
      delivery: "person",
      forUserId: recipient,
      giftClaimToken: `0x${"ef".repeat(32)}`,
      deposit: null,
      messageAttempt: null,
    });
  const startTakeOut = vi.fn(async () => ({ gift: { ...packed, status: "taken_out" as const } }));
  const deliverPersonGift = vi.fn(async () => ({ ...replacement, status: "sent" as const }));
  const reportShared = vi.fn(async () => packed);
  const api = emptyApi({
    packageGift,
    startTakeOut,
    deliverPersonGift,
    reportShared,
    giftDelivery: async () => ({ delivery: "person" }),
    beginMessageAttempt: async () => replacement,
  });
  const send = vi.fn(async () => "sent" as const);
  const flow = createGiveFlow({
    sticker: { id: packed.stickerId, no: 1, timeUsed: 1 },
    sender: { send },
    backend: createApiGiftBackend({
      api,
      userId,
      fromHandle: "giver",
      liffId: "liff",
      forUserId: "stale-recipient",
    }),
    takeOutMs: 0,
  });
  flow.give();
  await vi.advanceTimersByTimeAsync(0);
  expect(startTakeOut).toHaveBeenCalledExactlyOnceWith(packed.id, {
    id: attemptId,
    state: "cancelled",
  });
  expect(packageGift).toHaveBeenLastCalledWith(packed.stickerId, recipient);
  expect(send).toHaveBeenCalledWith(expect.anything(), "person");
  expect(deliverPersonGift).toHaveBeenCalledWith(replacement.id, expect.any(String));
  expect(reportShared).not.toHaveBeenCalled();
  expect(flow.getState()).toMatchObject({
    step: "sent",
    giftId: replacement.id,
    delivery: "person",
    packedForUserId: recipient,
  });
  expect(flow.getState()).not.toHaveProperty("recordError", expect.anything());
  flow.dispose();
});
