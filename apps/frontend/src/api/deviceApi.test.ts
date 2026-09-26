import { describe, expect, it, vi } from "vitest";
import type { GiftRecord } from "../giving/giftStore";
import type { StickerRecord } from "../stickers/stickerStorage";
import { ApiError } from "./apiClient";
import type { Person } from "./contract";
import { createDeviceApi, type DeviceSources } from "./deviceApi";

const me: Person = { id: "me", handle: "alice", lineDisplayName: "Alice", linePictureUrl: null };

const record = (id: string, no: number, extra: Partial<StickerRecord> = {}): StickerRecord => ({
  id,
  no,
  createdAt: Date.UTC(2026, 8, 20 + no),
  timeUsed: 120,
  blob: new Blob(),
  width: 200,
  height: 100,
  ...extra,
});

/** A device holding `records` (newest first) and `gifts`, with every change kept in memory. */
function device(records: StickerRecord[], gifts: GiftRecord[] = [], seen: string[] = []) {
  const kept = { seen: new Set(seen), placements: new Map<string, unknown>() };
  const sources: DeviceSources = {
    me: () => me,
    listStickers: () => Promise.resolve(records),
    updatePlacement: vi.fn((id: string, placement) => {
      kept.placements.set(id, placement);
      return Promise.resolve();
    }),
    gifts: () => gifts,
    readSeen: () => new Set(kept.seen),
    saveSeen: (s) => {
      kept.seen = new Set(s);
    },
    urlsOf: (r) => ({ png: `blob:${r.id}`, ...(r.mask && { mask: `blob:${r.id}-mask` }) }),
  };
  return { api: createDeviceApi(sources), sources, kept };
}

describe("deviceApi", () => {
  it("lists your stickers oldest first, as yours and held", async () => {
    const { api } = device([record("b", 2), record("a", 1)]);
    const board = await api.stickerBoard();
    expect(board.owner).toEqual(me);
    expect(board.boardStickers.map((b) => b.sticker.number)).toEqual([1, 2]);
    expect(board.boardStickers.every((b) => b.held && b.sticker.artist.id === "me")).toBe(true);
  });

  it("gives a sticker without a mask empty image URLs, and keeps its placement's meaning", async () => {
    const placed = record("a", 1, { placement: { on: false, x: 0.2, y: 0.3, s: 0.4, r: 5, z: 2 } });
    const [b] = (await device([placed]).api.stickerBoard()).boardStickers;
    expect(b?.sticker.images).toMatchObject({ png: "blob:a", mask: "", spec: "", rim: "" });
    expect(b?.placement).toEqual({ onBoard: false, x: 0.2, y: 0.3, scale: 0.4, rotation: 5, z: 2 });
  });

  it("marks a sticker with a gift in the bag or on its way", async () => {
    const gifts: GiftRecord[] = [
      { id: "g1", stickerId: "a", state: "sent", packedAt: 1, sentAt: 2 },
      {
        id: "g2",
        stickerId: "b",
        state: "not_sent",
        packedAt: 1,
        closedAt: 2,
        reason: "taken_out",
      },
    ];
    const board = await device([record("b", 2), record("a", 1)], gifts).api.stickerBoard();
    expect(board.boardStickers.map((b) => b.openGift)).toEqual([
      { id: "g1", status: "sent" },
      null,
    ]);
  });

  it("saves a placement in this device's names", async () => {
    const { api, kept } = device([record("a", 1)]);
    const saved = await api.saveStickerPlacement("a", {
      onBoard: true,
      x: 0.5,
      y: 0.5,
      scale: 0.3,
      rotation: -4,
      z: 7,
    });
    expect(kept.placements.get("a")).toEqual({ on: true, x: 0.5, y: 0.5, s: 0.3, r: -4, z: 7 });
    expect(saved.placement?.rotation).toBe(-4);
  });

  it("counts what's still NEW after the tray marks some seen", async () => {
    const { api, kept } = device([record("c", 3), record("b", 2), record("a", 1)], [], ["a"]);
    expect(await api.markTraySeen(["b"])).toEqual({ newStickerCount: 1 });
    expect(kept.seen).toEqual(new Set(["a", "b"]));
  });

  it("lists gifts in the bag or on their way, newest first", async () => {
    const gifts: GiftRecord[] = [
      { id: "g1", stickerId: "a", state: "sent", packedAt: 10, sentAt: 20 },
      { id: "g2", stickerId: "b", state: "packed", packedAt: 30 },
      {
        id: "g3",
        stickerId: "a",
        state: "not_sent",
        packedAt: 5,
        closedAt: 6,
        reason: "abandoned",
      },
    ];
    const { gifts: pending } = await device(
      [record("b", 2), record("a", 1)],
      gifts,
    ).api.pendingGifts();
    expect(pending.map((p) => [p.gift.id, p.gift.status, p.sticker.id])).toEqual([
      ["g2", "packed", "b"],
      ["g1", "sent", "a"],
    ]);
  });

  it("can't open gifts without the server", async () => {
    const { api } = device([]);
    const body = { giftClaimToken: "t", liffContextType: "utou" } as const;
    await expect(api.previewGift(body)).rejects.toMatchObject({
      status: 501,
      code: "needs_server",
    });
    await expect(api.receiveGift(body)).rejects.toBeInstanceOf(ApiError);
  });

  it("answers 404 for a sticker it doesn't have", async () => {
    await expect(device([]).api.stickerDetail("x")).rejects.toMatchObject({
      status: 404,
      code: "sticker_not_found",
    });
  });
});
