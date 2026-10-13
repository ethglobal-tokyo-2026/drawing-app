import { MAX_LARGE_LAYOUT_BATCH, type StickerPlacement } from "@drawing-app/api/client";
import { describe, expect, it, onTestFinished, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { boardSticker } from "../api/testFixtures";
import { emptyApi, TEST_OWNER } from "../api/testing";
import { toApiPlacement } from "../api/views";
import { BoardPlacementSaves } from "./boardPlacementSaves";
import type { Placement } from "./placement";

const spot = (x: number): Placement => ({ on: true, x, y: 0.5, r: 0, s: 0.3, z: 1 });
const sticker = { id: "a", no: 1 };
const board = () => ({
  owner: TEST_OWNER,
  boardStickers: [boardSticker({ stickerId: "a", placement: toApiPlacement(spot(0.1)) })],
});
const deferred = <T>() => {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
};
const flush = async () => {
  for (let i = 0; i < 8; i++) await Promise.resolve();
};

describe("BoardPlacementSaves", () => {
  it("refuses to serialize non-finite positions into a different value", () => {
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => diagnostics.mockRestore());
    const write = vi.fn();
    const storage = { getItem: () => null, setItem: write, removeItem: () => {} };
    const saves = new BoardPlacementSaves(
      emptyApi({ saveStickerPlacement: () => new Promise(() => {}) }),
      TEST_OWNER.id,
      storage,
    );
    saves.save(sticker, { phone: spot(Number.NaN) });
    expect(saves.read().preservationError?.code).toBe(
      "person_switch_placement_preservation_failed",
    );
    expect(write).not.toHaveBeenCalled();
  });
  it("keeps pending positions through a foreign selection and reload without applying them to Hana", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const api = emptyApi({ saveStickerPlacement: () => new Promise(() => {}) });
    const old = new BoardPlacementSaves(api, TEST_OWNER.id, storage);
    const close = old.activate();
    old.save(sticker, { phone: spot(0.2), large: spot(0.7) });
    old.pauseNewWrites();
    close();
    const hanaApi = emptyApi();
    const hanaSend = vi.spyOn(hanaApi, "saveStickerPlacement");
    const hanaSaves = new BoardPlacementSaves(hanaApi, "hana", storage);
    hanaSaves.activate();
    expect(hanaSaves.pendingSpots().size).toBe(0);
    expect(hanaSend).not.toHaveBeenCalled();
    const returnedApi = emptyApi();
    const returnedSend = vi.spyOn(returnedApi, "saveStickerPlacement");
    const returned = new BoardPlacementSaves(returnedApi, TEST_OWNER.id, storage);
    returned.activate();
    expect(returned.pendingSpots().get("a")).toEqual({ phone: spot(0.2), large: spot(0.7) });
    expect(returned.read().unsaved.get("a")?.layouts).toEqual(new Set(["phone", "large"]));
    expect(returnedSend).not.toHaveBeenCalled();
    await expect(returned.waitUntilSaved(new AbortController().signal)).rejects.toMatchObject({
      code: "person_switch_placement_unsaved",
    });
    returned.save(sticker, { phone: spot(0.2), large: spot(0.7) });
    await returned.waitUntilSaved(new AbortController().signal);
    expect(values.get(`croquis.board-placement-saves.${TEST_OWNER.id}`)).toBeUndefined();
  });

  it("removes journal entries only after the matching latest position is acknowledged", async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => {
        values.set(key, value);
      },
      removeItem: (key: string) => {
        values.delete(key);
      },
    };
    const first = deferred<StickerPlacement>();
    const second = deferred<StickerPlacement>();
    const send = vi
      .fn<ApiClient["saveStickerPlacement"]>()
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise);
    const saves = new BoardPlacementSaves(
      emptyApi({ saveStickerPlacement: send }),
      TEST_OWNER.id,
      storage,
    );
    saves.activate();
    saves.save(sticker, { phone: spot(0.2) });
    saves.save(sticker, { phone: spot(0.4) });
    first.resolve(boardSticker({ stickerId: "a" }));
    await flush();
    expect(values.get(`croquis.board-placement-saves.${TEST_OWNER.id}`)).toContain('"x":0.4');
    second.resolve(boardSticker({ stickerId: "a" }));
    await saves.waitUntilSaved(new AbortController().signal);
    expect(values.size).toBe(0);
  });

  it.each(["read", "write"])(
    "persists a %s preservation failure and refuses switching",
    async (operation) => {
      const diagnostics = vi.spyOn(console, "error").mockImplementation(() => {});
      onTestFinished(() => diagnostics.mockRestore());
      const storage = {
        getItem: () => {
          if (operation === "read") throw new Error("blocked");
          return null;
        },
        setItem: () => {
          throw new Error("full");
        },
        removeItem: () => {},
      };
      const saves = new BoardPlacementSaves(
        emptyApi({ saveStickerPlacement: () => new Promise(() => {}) }),
        TEST_OWNER.id,
        storage,
      );
      saves.activate();
      if (operation === "write") saves.save(sticker, { phone: spot(0.2) });
      expect(saves.read().preservationError?.code).toBe(
        "person_switch_placement_preservation_failed",
      );
      await expect(saves.waitUntilSaved(new AbortController().signal)).rejects.toMatchObject({
        code: "person_switch_placement_preservation_failed",
      });
    },
  );
  it("pauses new position changes while allowing an already queued save to finish", async () => {
    const request = deferred<StickerPlacement>();
    const api = emptyApi({ saveStickerPlacement: () => request.promise });
    const send = vi.spyOn(api, "saveStickerPlacement");
    const saves = new BoardPlacementSaves(api, TEST_OWNER.id);
    saves.activate();
    saves.save(sticker, { phone: spot(0.2) });
    const resume = saves.pauseNewWrites();
    expect(() => saves.save(sticker, { phone: spot(0.4) })).toThrowError(
      expect.objectContaining({ code: "session_account_changed" }),
    );
    const waiting = saves.waitUntilSaved(new AbortController().signal);
    request.resolve(boardSticker({ stickerId: "a" }));
    await waiting;
    expect(send).toHaveBeenCalledOnce();
    resume();
    saves.save(sticker, { phone: spot(0.4) });
    expect(send).toHaveBeenCalledTimes(2);
  });
  it("waits for active placement saves even with an empty failure map", async () => {
    const request = deferred<StickerPlacement>();
    const saves = new BoardPlacementSaves(
      emptyApi({ saveStickerPlacement: () => request.promise }),
      TEST_OWNER.id,
    );
    saves.activate();
    saves.save(sticker, { phone: spot(0.2) });
    let settled = false;
    const waiting = saves.waitUntilSaved(new AbortController().signal).then(() => {
      settled = true;
    });
    await flush();
    expect(saves.read().unsaved.size).toBe(0);
    expect(settled).toBe(false);
    request.resolve(boardSticker({ stickerId: "a", placement: toApiPlacement(spot(0.2)) }));
    await waiting;
    expect(settled).toBe(true);
  });

  it("drains queued revisions and derived batches before settling", async () => {
    const first = deferred<StickerPlacement>();
    const saves = new BoardPlacementSaves(
      emptyApi({
        saveStickerPlacement: vi
          .fn<ApiClient["saveStickerPlacement"]>()
          .mockImplementationOnce(() => first.promise)
          .mockResolvedValue(boardSticker({ stickerId: "a" })),
      }),
      TEST_OWNER.id,
    );
    saves.activate();
    saves.save(sticker, { phone: spot(0.2) });
    saves.save(sticker, { phone: spot(0.4) });
    const derived = saves.saveDerived([{ id: "a", placement: spot(0.7) }]);
    const waiting = saves.waitUntilSaved(new AbortController().signal);
    first.resolve(boardSticker({ stickerId: "a" }));
    await Promise.all([waiting, derived]);
    expect(saves.read().unsaved.size).toBe(0);
  });

  it("refuses settlement with the affected sticker and layout after a save failed", async () => {
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => diagnostics.mockRestore());
    const saves = new BoardPlacementSaves(
      emptyApi({
        saveStickerPlacement: async () => {
          throw new Error("offline");
        },
      }),
      TEST_OWNER.id,
    );
    saves.activate();
    saves.save(sticker, { phone: spot(0.2) });
    await flush();
    await expect(saves.waitUntilSaved(new AbortController().signal)).rejects.toMatchObject({
      detail: "sticker 1 (phone)",
    });
  });

  it("stops settlement when its deadline aborts", async () => {
    const saves = new BoardPlacementSaves(
      emptyApi({ saveStickerPlacement: () => new Promise(() => {}) }),
      TEST_OWNER.id,
    );
    saves.activate();
    saves.save(sticker, { phone: spot(0.2) });
    const deadline = new AbortController();
    const waiting = saves.waitUntilSaved(deadline.signal);
    deadline.abort();
    await expect(waiting).rejects.toMatchObject({ code: "timeout" });
  });

  it("keeps a failed phone revision when derived large initialization succeeds", async () => {
    const api = emptyApi();
    vi.spyOn(api, "saveStickerPlacement").mockRejectedValueOnce(new Error("offline"));
    const saves = new BoardPlacementSaves(api, TEST_OWNER.id);
    saves.activate();
    saves.save(sticker, { phone: spot(0.2) });
    await flush();
    await saves.saveDerived([{ id: "a", placement: spot(0.7) }]);
    expect(saves.read().unsaved.get("a")?.layouts).toEqual(new Set(["phone"]));
    saves.save(sticker, { phone: spot(0.3) });
    await flush();
    expect(saves.read().unsaved.size).toBe(0);
    expect(saves.pendingSpots().get("a")?.large?.x).toBe(0.7);
  });

  it("retains a failed derived batch and releases its reservation for explicit retry", async () => {
    const api = emptyApi();
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => diagnostics.mockRestore());
    vi.spyOn(api, "saveLargeLayout").mockRejectedValueOnce(new Error("offline"));
    const retry = vi.spyOn(api, "saveStickerPlacement");
    const saves = new BoardPlacementSaves(api, TEST_OWNER.id);
    saves.activate();
    await expect(saves.saveDerived([{ id: "a", placement: spot(0.7) }])).rejects.toMatchObject({
      code: "network",
    });
    expect(saves.read().unsaved.get("a")?.layouts).toEqual(new Set(["large"]));
    saves.save(sticker, { large: spot(0.7) });
    await flush();
    expect(retry.mock.lastCall?.[1]).toEqual({ largePlacement: toApiPlacement(spot(0.7)) });
    expect(saves.read().unsaved.size).toBe(0);
    expect(diagnostics).toHaveBeenCalledExactlyOnceWith(
      "Saving the derived large layout failed for a",
      expect.objectContaining({ code: "network", detail: "offline" }),
    );
  });

  it("keeps failures while absent, retries the failed layout on a newer opposite-layout edit", async () => {
    const request = deferred<StickerPlacement>();
    const api = emptyApi();
    const send = vi
      .spyOn(api, "saveStickerPlacement")
      .mockImplementationOnce(() => request.promise);
    const saves = new BoardPlacementSaves(api, TEST_OWNER.id);
    const leave = saves.activate();
    saves.save(sticker, { phone: spot(0.2) });
    leave();
    request.reject(new ApiError(503, { error: "not_in_test", detail: "offline" }));
    await flush();
    saves.activate();
    expect(saves.read().unsaved.get("a")?.layouts).toEqual(new Set(["phone"]));
    expect(send).toHaveBeenCalledTimes(1);
    saves.save(sticker, { large: spot(0.7) });
    await flush();
    expect(send.mock.lastCall?.[1]).toEqual({
      placement: toApiPlacement(spot(0.2)),
      largePlacement: toApiPlacement(spot(0.7)),
    });
    expect(saves.read().unsaved.size).toBe(0);
  });

  it("keeps opposite-layout failures until their revision is acknowledged, including explicit retry", async () => {
    const api = emptyApi();
    const diagnostics = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => diagnostics.mockRestore());
    vi.spyOn(api, "saveStickerPlacement").mockRejectedValueOnce(new Error("offline"));
    const saves = new BoardPlacementSaves(api, TEST_OWNER.id);
    saves.activate();
    saves.save(sticker, { phone: spot(0.2), large: spot(0.7) });
    await flush();
    expect(saves.read().unsaved.get("a")?.layouts).toEqual(new Set(["phone", "large"]));
    saves.save(sticker, saves.pendingSpots().get("a") ?? {});
    await flush();
    expect(saves.read().unsaved.size).toBe(0);
    expect(diagnostics).toHaveBeenCalledExactlyOnceWith(
      "Saving where sticker 1 sits failed",
      expect.objectContaining({ code: "network", detail: "offline" }),
    );
  });

  it("preserves read checkpoints across acknowledgement and later retirement, then accepts external moves", async () => {
    const request = deferred<StickerPlacement>();
    const api = emptyApi({
      stickerBoard: async () => board(),
      saveStickerPlacement: () => request.promise,
    });
    const saves = new BoardPlacementSaves(api, TEST_OWNER.id);
    saves.activate();
    saves.save(sticker, { phone: spot(0.2) });
    const older = await saves.readBoard();
    request.resolve(
      await emptyApi().saveStickerPlacement("a", { placement: toApiPlacement(spot(0.2)) }),
    );
    await flush();
    expect(saves.overridesFor(older).get("a")?.phone?.x).toBe(0.2);
    const newer = await saves.readBoard();
    expect(saves.overridesFor(newer).size).toBe(0);
    saves.adopted(newer);
    expect(saves.pendingSpots().size).toBe(0);
    expect(saves.overridesFor(older).get("a")?.phone?.x).toBe(0.2);
  });

  it("overlays edits made after a read started even after a newer read retired them", async () => {
    const read = deferred<ReturnType<typeof board>>();
    const api = emptyApi({
      stickerBoard: vi
        .fn()
        .mockImplementationOnce(() => read.promise)
        .mockImplementation(async () => board()),
    });
    const saves = new BoardPlacementSaves(api, TEST_OWNER.id);
    saves.activate();
    const pendingRead = saves.readBoard();
    saves.save(sticker, { phone: spot(0.6) });
    await flush();
    saves.adopted(await saves.readBoard());
    read.resolve(board());
    expect(saves.overridesFor(await pendingRead).get("a")?.phone?.x).toBe(0.6);
  });

  it("reserves every derived batch until it settles, then saves manual edits", async () => {
    const held = deferred<StickerPlacement[]>();
    const api = emptyApi();
    const batch = vi.spyOn(api, "saveLargeLayout").mockImplementationOnce(() => held.promise);
    const manual = vi.spyOn(api, "saveStickerPlacement");
    const saves = new BoardPlacementSaves(api, TEST_OWNER.id);
    saves.activate();
    const derived = Array.from({ length: MAX_LARGE_LAYOUT_BATCH + 1 }, (_, i) => ({
      id: String(i),
      placement: spot(0.2),
    }));
    const result = saves.saveDerived(derived);
    saves.save({ id: "0", no: 1 }, { large: spot(0.8) });
    saves.save({ id: String(MAX_LARGE_LAYOUT_BATCH), no: 2 }, { large: spot(0.9) });
    await flush();
    expect(batch.mock.calls.map(([entries]) => entries.length)).toEqual([
      MAX_LARGE_LAYOUT_BATCH,
      1,
    ]);
    expect(manual.mock.calls.map(([id]) => id)).toEqual([String(MAX_LARGE_LAYOUT_BATCH)]);
    held.resolve(await emptyApi().saveLargeLayout(batch.mock.calls[0][0]));
    await result;
    await flush();
    expect(manual.mock.calls.find(([id]) => id === "0")?.[1].largePlacement?.x).toBe(0.8);
    expect(saves.pendingSpots().get("0")?.large?.x).toBe(0.8);
  });

  it("dispatches different stickers concurrently and pauses unsent work on departure", async () => {
    const held = deferred<StickerPlacement>();
    const api = emptyApi({ saveStickerPlacement: vi.fn(() => held.promise) });
    const saves = new BoardPlacementSaves(api, TEST_OWNER.id);
    const leave = saves.activate();
    saves.save(sticker, { phone: spot(0.2) });
    saves.save({ id: "b", no: 2 }, { phone: spot(0.3) });
    saves.save(sticker, { phone: spot(0.4) });
    expect(api.saveStickerPlacement).toHaveBeenCalledTimes(2);
    leave();
    leave();
    held.resolve(
      await emptyApi().saveStickerPlacement("a", { placement: toApiPlacement(spot(0.2)) }),
    );
    await flush();
    expect(api.saveStickerPlacement).toHaveBeenCalledTimes(2);
    const other = new BoardPlacementSaves(emptyApi(), "other");
    other.activate();
    expect(other.pendingSpots().size).toBe(0);
    saves.activate();
    await flush();
    expect(api.saveStickerPlacement).toHaveBeenCalledTimes(3);
  });

  it("does not overlay missing, given-away, or another account's stickers", async () => {
    const saves = new BoardPlacementSaves(emptyApi(), TEST_OWNER.id);
    saves.save(sticker, { phone: spot(0.2) });
    expect(saves.overridesFor({ ...board(), boardStickers: [] }).size).toBe(0);
    expect(
      saves.overridesFor({
        ...board(),
        boardStickers: [{ ...board().boardStickers[0], held: false }],
      }).size,
    ).toBe(0);
    expect(saves.overridesFor({ ...board(), owner: { ...TEST_OWNER, id: "other" } }).size).toBe(0);
    const snapshot = saves.read();
    expect(saves.read()).toBe(snapshot);
  });
});
