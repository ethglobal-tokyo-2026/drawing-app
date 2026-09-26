import { describe, expect, it } from "vitest";
import { ApiError } from "../api/apiClient";
import type { GiftPreview, ReceivedGift } from "@drawing-app/api/client";
import { people, sticker } from "../api/testFixtures";
import { toMs, toPerson, toSticker } from "../api/views";
import { receiveFlow, type ReceiveEvent, type ReceiveScreen } from "./receiveFlow";

const giver = people.mika;
const gifted = sticker({ number: 147 });

const preview = (overrides: Partial<GiftPreview> = {}): GiftPreview => ({
  giver,
  expiresAt: "2026-09-30T12:00:00.000Z",
  receivable: true,
  refusal: null,
  sticker: gifted,
  ...overrides,
});

const received: ReceivedGift = {
  gift: {
    id: "gift-1",
    stickerId: gifted.id,
    giverId: giver.id,
    receiverId: "me",
    status: "received",
    escrowStatus: "claimed",
    packedAt: "2026-09-23T12:00:00.000Z",
    expiresAt: "2026-09-30T12:00:00.000Z",
    sentAt: "2026-09-23T12:00:30.000Z",
    takenOutAt: null,
    receivedAt: "2026-09-23T12:02:00.000Z",
    returnedAt: null,
  },
  sticker: { ...gifted, ownerId: "me" },
  stickerPlacement: {
    stickerId: gifted.id,
    placement: null,
    seenAt: null,
    arrivedAt: "2026-09-23T12:02:00.000Z",
  },
};

/** Plays events from the opening screen. */
const play = (...events: ReceiveEvent[]): ReceiveScreen =>
  events.reduce(receiveFlow, { step: "opening" });

const previewed = (p = preview()): ReceiveEvent => ({ type: "previewed", preview: p });
const failed = (status: number, error: string, detail?: string) =>
  new ApiError(status, { error, ...(detail && { detail }) });

const sealedPreview = {
  giver: toPerson(giver),
  sticker: toSticker(gifted),
  expiresAt: toMs(preview().expiresAt),
};

// The REST doc's refusal codes and statuses: a contract with the server.
const REFUSED_BY_THE_SERVER = [
  [404, "gift_not_found"],
  [501, "needs_server"],
  [403, "group_chat"],
  [403, "own_gift"],
  [409, "already_received"],
  [409, "taken_back"],
  [409, "not_deposited"],
  [410, "gift_expired"],
  [410, "gift_returned"],
] as const;

describe("opening a gift", () => {
  it("shows the sealed bag for a gift that can be received, as screens draw it", () => {
    expect(play(previewed())).toEqual({ step: "sealed", preview: sealedPreview });
  });

  it("shows the refusal a preview gives, naming the giver", () => {
    const refused = preview({ receivable: false, refusal: "group_chat", sticker: null });
    expect(play(previewed(refused))).toEqual({
      step: "refused",
      refusal: "group_chat",
      giver: toPerson(giver),
    });
  });

  it.each(REFUSED_BY_THE_SERVER)(
    "shows the refusal for a preview refused %i %s",
    (status, code) => {
      expect(play({ type: "previewFailed", error: failed(status, code) })).toEqual({
        step: "refused",
        refusal: code,
        giver: null,
      });
    },
  );

  it("says what failed when the preview fails any other way", () => {
    const error = failed(0, "network", "Failed to fetch");
    expect(play({ type: "previewFailed", error })).toEqual({
      step: "failed",
      message: error.message,
    });
  });

  it("opens the gift again on Try again", () => {
    const notYet = preview({ receivable: false, refusal: "not_deposited", sticker: null });
    expect(play(previewed(notYet), { type: "retry" })).toEqual({ step: "opening" });
    const error = failed(0, "network", "Failed to fetch");
    expect(play({ type: "previewFailed", error }, { type: "retry" })).toEqual({ step: "opening" });
  });
});

describe("accepting a gift", () => {
  const torn = () => play(previewed(), { type: "tore" });
  const accepting = () => receiveFlow(torn(), { type: "accept" });

  it("brings up Accept once the bag is torn open", () => {
    expect(torn()).toEqual({ step: "torn", preview: sealedPreview, accepting: false });
  });

  it("waits on Accept's receive, and a second Accept meanwhile changes nothing", () => {
    const busy = accepting();
    expect(busy).toEqual({ step: "torn", preview: sealedPreview, accepting: true });
    expect(receiveFlow(busy, { type: "accept" })).toBe(busy);
  });

  it("closes on the sticker it received", () => {
    expect(receiveFlow(accepting(), { type: "received", response: received })).toEqual({
      step: "received",
      stickerId: gifted.id,
    });
  });

  it("moves to the refusal when the server refuses Accept, naming the giver", () => {
    const error = failed(409, "taken_back");
    expect(receiveFlow(accepting(), { type: "acceptFailed", error })).toEqual({
      step: "refused",
      refusal: "taken_back",
      giver: toPerson(giver),
    });
  });

  it("keeps Accept up with what failed, and clears it when Accept tries again", () => {
    const error = failed(0, "network", "Failed to fetch");
    const again = receiveFlow(accepting(), { type: "acceptFailed", error });
    expect(again).toEqual({
      step: "torn",
      preview: sealedPreview,
      accepting: false,
      failed: error.message,
    });
    expect(receiveFlow(again, { type: "accept" })).toEqual({
      step: "torn",
      preview: sealedPreview,
      accepting: true,
    });
  });
});
