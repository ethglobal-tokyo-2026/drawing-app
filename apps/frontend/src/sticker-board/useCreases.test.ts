import { MAX_SCALE } from "@drawing-app/api/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Affine, CreaseJob, CreaseReply } from "../stickers/creaseWorker";
import { FOIL_BAND_WIDTH, kyotoSeikaBandWidth } from "../stickers/foilBand";
import type { FoilTone } from "../stickers/foilMaterial";
import { testStickerUrls } from "../stickers/testStickerUrls";
import { fieldOf, PHONE_BOARD, stickerBox, unitOf, type Placement } from "./placement";
import { CreaseStore, creaseJobs } from "./useCreases";

const field = fieldOf(PHONE_BOARD.W, PHONE_BOARD.H);
const unit = unitOf("phone", PHONE_BOARD.W);
/** Pixels per CSS px for the bakes. */
const SCALE = 2;
/** How far `at`'s rounding may move a point, even across the largest sticker. */
const ROUNDING_PX = 0.05;

/** A sticker twice as wide as it's tall, so its width and height can't be mixed up. */
function sticker(id: string, at: Partial<Placement> = {}, urls = testStickerUrls(id)) {
  return {
    id,
    width: 200,
    height: 100,
    urls,
    placement: { on: true, x: 0.5, y: 0.5, s: 0.4, r: 0, z: 1, ...at },
  };
}
type TestSticker = ReturnType<typeof sticker>;

const jobsFor = (
  stickers: TestSticker[],
  foilOf: (s: TestSticker) => FoilTone | null = () => null,
) => creaseJobs(stickers, field, unit, foilOf, SCALE);

const boxOf = (s: TestSticker) => stickerBox(field, unit, s.placement, s);

/** `v` turned `deg` degrees clockwise on screen. */
function clockwise(deg: number, [x, y]: readonly [number, number]): [number, number] {
  const t = (deg * Math.PI) / 180;
  return [x * Math.cos(t) - y * Math.sin(t), x * Math.sin(t) + y * Math.cos(t)];
}

/** Where `at` puts a point of the lower sticker's box, from its top-left corner. */
const apply = ([a, b, c, d, e, f]: Affine, [x, y]: readonly [number, number]) => [
  a * x + c * y + e,
  b * x + d * y + f,
];

/**
 * Where a point of `lower`'s box, `fromMiddle` of its middle and turned with it, lies in pixels of the
 * sticker over it, worked out on the board.
 */
function expectedIn(top: TestSticker, lower: TestSticker, fromMiddle: [number, number]) {
  const [a, b] = [boxOf(lower), boxOf(top)];
  const turned = clockwise(lower.placement.r, fromMiddle);
  const onBoard: [number, number] = [a.x - b.x + turned[0], a.y - b.y + turned[1]];
  const [x, y] = clockwise(-top.placement.r, onBoard);
  return [(x + b.w / 2) * SCALE, (y + b.h / 2) * SCALE];
}

describe("creaseJobs", () => {
  it.each([
    ["neither turned", 0, 0, 0.4],
    ["the sticker over it turned", 30, 0, 0.4],
    ["both turned", 30, -20, 0.4],
    ["both turned, as large as a sticker gets", 30, -20, MAX_SCALE],
  ])(
    "puts the sticker underneath where it lies in the top one's frame, %s",
    (_, over, under, s) => {
      const lower = sticker("lower", { x: 0.4, y: 0.5, r: under, s });
      const top = sticker("top", { x: 0.6, y: 0.55, r: over, s });

      const jobs = jobsFor([lower, top]);

      // Only the one lying over another has a crease to bake.
      expect(jobs.map((j) => j.id)).toEqual(["top"]);
      expect(jobs[0].under).toHaveLength(1);
      const [beneath] = jobs[0].under;
      const { w, h } = boxOf(lower);
      expect(beneath.w).toBeCloseTo(w, 1);
      expect(beneath.h).toBeCloseTo(h, 1);
      // Its middle, and its top-left corner, which a turn of its own moves.
      const points: [number, number][] = [
        [0, 0],
        [-w / 2, -h / 2],
      ];
      for (const fromMiddle of points) {
        const [x, y] = apply(beneath.at, [w / 2 + fromMiddle[0], h / 2 + fromMiddle[1]]);
        const [ex, ey] = expectedIn(top, lower, fromMiddle);
        expect(Math.abs(x - ex)).toBeLessThan(ROUNDING_PX);
        expect(Math.abs(y - ey)).toBeLessThan(ROUNDING_PX);
      }
    },
  );

  it("gives no job to stickers that don't touch", () => {
    const apart = [sticker("a", { x: 0.15, y: 0.2 }), sticker("b", { x: 0.85, y: 0.8 })];
    expect(jobsFor(apart)).toEqual([]);
    expect(jobsFor([sticker("alone")])).toEqual([]);
  });

  it("counts a sticker its neighbor's foil band could reach as lying over it", () => {
    /** Two stickers `s` large side by side with `gap` between their edges. */
    const beside = (gap: number, s = 0.4) => {
      const left = sticker("left", { x: 0.3, s });
      const next = boxOf(left).w + gap;
      return [left, sticker("right", { x: 0.3 + next / field.w, s })];
    };
    expect(jobsFor(beside(FOIL_BAND_WIDTH.board)).map((j) => j.id)).toEqual(["right"]);
    expect(jobsFor(beside(FOIL_BAND_WIDTH.board * 3))).toEqual([]);

    // On a large sticker the Kyoto Seika Practice Mode foil's band, grown from the cut, reaches further.
    const [large] = beside(0, MAX_SCALE);
    const band = kyotoSeikaBandWidth(boxOf(large).w, boxOf(large).h);
    expect(band).toBeGreaterThan(FOIL_BAND_WIDTH.board);
    const kyotoSeika = (): FoilTone => "kyoto-seika";
    expect(
      jobsFor(beside(FOIL_BAND_WIDTH.board + band, MAX_SCALE), kyotoSeika).map((j) => j.id),
    ).toEqual(["right"]);
  });

  it("draws each sticker by its outline as the board shows it: its cut, its foil band's mask, or its cut grown by the Kyoto Seika Practice Mode foil's band", () => {
    const foiled = (id: string, at: Partial<Placement>) =>
      sticker(id, at, { ...testStickerUrls(id), foil: `${id}-foil.png` });
    const lower = foiled("lower", { x: 0.4 });
    const top = foiled("top", { x: 0.6 });
    /** The outlines the top sticker's job draws, with `lowerFoil` and `topFoil` worn. */
    const outlines = (lowerFoil: FoilTone | null, topFoil: FoilTone | null) => {
      const [job] = jobsFor([lower, top], (s) => (s.id === "lower" ? lowerFoil : topFoil));
      const [beneath] = job.under;
      return { under: { url: beneath.url, grow: beneath.grow }, own: job.own };
    };

    expect(outlines("holo", null)).toEqual({
      under: { url: lower.urls.foil, grow: 0 },
      own: { url: top.urls.mask, grow: 0 },
    });
    expect(outlines(null, "pink")).toEqual({
      under: { url: lower.urls.mask, grow: 0 },
      own: { url: top.urls.foil, grow: 0 },
    });
    // Its band is grown from the cut, narrower than the server's mask, so the cut is drawn grown.
    const { under, own } = outlines("kyoto-seika", "kyoto-seika");
    expect(under.url).toBe(lower.urls.mask);
    expect(under.grow).toBeCloseTo(kyotoSeikaBandWidth(boxOf(lower).w, boxOf(lower).h), 1);
    expect(own.url).toBe(top.urls.mask);
    expect(own.grow).toBeGreaterThan(0);
  });

  it("keys a job by the stack under it, so it holds as other stickers move and changes when one underneath does", () => {
    const lower = sticker("lower", { x: 0.4 });
    const top = sticker("top", { x: 0.6 });
    const far = sticker("far", { x: 0.9, y: 0.9 });
    const keyOfTop = (stickers: TestSticker[]) =>
      jobsFor(stickers).find((j) => j.id === "top")?.key;

    const before = keyOfTop([lower, top, far]);
    expect(before).toBeDefined();
    expect(keyOfTop([lower, top, { ...far, placement: { ...far.placement, x: 0.8 } }])).toBe(
      before,
    );
    expect(keyOfTop([{ ...lower, placement: { ...lower.placement, y: 0.45 } }, top, far])).not.toBe(
      before,
    );
  });
});

describe("CreaseStore", () => {
  afterEach(() => vi.restoreAllMocks());

  const [job] = jobsFor([sticker("lower", { x: 0.4 }), sticker("top", { x: 0.6 })]);

  /** The worker's answer to `of`: the crease's images, or none when nothing showed a step. */
  const bake = (of: CreaseJob, made = true): Extract<CreaseReply, { ok: true }> => ({
    ok: true,
    board: "board",
    id: of.id,
    key: of.key,
    crease: made
      ? {
          base: new Blob(["base"]),
          normal: new Blob(["normal"]),
          height: new Blob(["height"]),
        }
      : null,
    timings: { decode: 0, draw: 0, shade: 0, encode: 0, total: 0 },
  });

  it("carries accepted normal bounds and releases only its images' URLs", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const store = new CreaseStore();
    const normalBounds = { x: -0.1, y: 0, width: 1.2, height: 1.1 };
    const baked = bake(job);
    store.want([job]);
    store.land({ ...baked, normalBounds, maxSlope: 17 });
    expect(store.creaseOf(job.id)?.normalBounds).toEqual(normalBounds);
    expect(store.creaseOf(job.id)?.maxSlope).toBe(17);
    store.clear();
    expect(revoke).toHaveBeenCalledTimes(Object.keys(baked.crease ?? {}).length);
    expect(revoke.mock.calls.every(([url]) => typeof url === "string")).toBe(true);
  });

  describe("placement-only crease reveal", () => {
    const changed = () => jobsFor([sticker("lower", { x: 0.42 }), sticker("top", { x: 0.6 })])[0];
    const normalOf = (store: CreaseStore, id: string) => {
      const normal = store.creaseOf(id)?.normal;
      if (!normal) throw new Error(`The accepted bake for ${id} has no normal`);
      return normal;
    };

    it.each([0, 7])("never reveals the first accepted plan at generation %s", (generation) => {
      const store = new CreaseStore();
      store.want([job], generation);
      store.land(bake(job));
      const normal = normalOf(store, job.id);
      expect(store.canReveal(job.id, normal)).toBe(false);
      expect(store.startReveal(job.id, normal)).toBe(false);
    });

    it("doesn't reveal a delayed hydration bake after the same plan is read again", () => {
      const store = new CreaseStore();
      store.want([job]);
      store.want([job]);
      store.land(bake(job));
      const normal = normalOf(store, job.id);
      expect(store.canReveal(job.id, normal)).toBe(false);
      expect(store.startReveal(job.id, normal)).toBe(false);
    });

    it("doesn't grant a changed viewport or another changed plan without a placement", () => {
      const store = new CreaseStore();
      store.want([job]);
      store.land(bake(job));
      const resized = creaseJobs(
        [sticker("lower", { x: 0.4 }), sticker("top", { x: 0.6 })],
        fieldOf(PHONE_BOARD.W * 1.25, PHONE_BOARD.H * 1.25),
        unit * 1.25,
        () => null,
        SCALE,
      )[0];
      expect(resized.key).not.toBe(job.key);
      store.want([resized]);
      store.land(bake(resized));
      expect(store.canReveal(resized.id, normalOf(store, resized.id))).toBe(false);
      const moved = changed();
      store.want([moved]);
      store.land(bake(moved));
      expect(store.canReveal(moved.id, normalOf(store, moved.id))).toBe(false);
    });

    it("reveals a genuine changed placement once, only for its accepted normal", () => {
      const store = new CreaseStore();
      store.want([job]);
      store.land(bake(job));
      const oldNormal = normalOf(store, job.id);
      const moved = changed();
      expect(moved.key).not.toBe(job.key);
      store.want([moved], 1);
      expect(store.canReveal(job.id, oldNormal)).toBe(false);
      expect(store.startReveal(job.id, oldNormal)).toBe(false);
      store.land(bake(moved));
      const normal = normalOf(store, moved.id);
      expect(store.canReveal(moved.id, normal)).toBe(true);
      expect(store.startReveal(moved.id, oldNormal)).toBe(false);
      expect(store.canReveal(moved.id, normal)).toBe(true);
      expect(store.startReveal(moved.id, normal)).toBe(true);
      expect(store.canReveal(moved.id, normal)).toBe(false);
      expect(store.startReveal(moved.id, normal)).toBe(false);
      store.want([moved], 2);
      expect(store.canReveal(moved.id, normal)).toBe(false);
    });

    it("keeps a pending placement grant when the same key is planned again", () => {
      const store = new CreaseStore();
      store.want([job]);
      const moved = changed();
      store.want([moved], 1);
      store.want([moved], 1);
      store.land(bake(moved));
      expect(store.startReveal(moved.id, normalOf(store, moved.id))).toBe(true);
    });

    it("doesn't grant an unrelated still-pending hydration job when a placement changes", () => {
      const plan = (x: number) =>
        jobsFor([
          sticker("lower-a", { x: 0.2, y: 0.25, s: 0.15 }),
          sticker("top-a", { x, y: 0.25, s: 0.15 }),
          sticker("lower-b", { x: 0.7, y: 0.75, s: 0.15 }),
          sticker("top-b", { x: 0.8, y: 0.75, s: 0.15 }),
        ]);
      const store = new CreaseStore();
      const first = plan(0.3);
      const moved = plan(0.32);
      const unrelated = moved.find((entry) => entry.id === "top-b");
      const placed = moved.find((entry) => entry.id === "top-a");
      if (!unrelated || !placed) throw new Error("Both separate sticker overlaps need jobs");
      expect(first.find((entry) => entry.id === unrelated.id)?.key).toBe(unrelated.key);
      expect(first.find((entry) => entry.id === placed.id)?.key).not.toBe(placed.key);
      store.want(first);
      store.want(moved, 1);
      for (const entry of moved) store.land(bake(entry));
      expect(store.startReveal(unrelated.id, normalOf(store, unrelated.id))).toBe(false);
      expect(store.startReveal(placed.id, normalOf(store, placed.id))).toBe(true);
    });

    it.each(["superseded", "removed", "failed", "empty"] as const)(
      "discards a placement grant when its wanted bake is %s",
      (answer) => {
        const store = new CreaseStore();
        store.want([job]);
        const moved = changed();
        store.want([moved], 1);
        if (answer === "superseded") store.want([job], 1);
        else if (answer === "removed") store.want([], 1);
        else if (answer === "failed") store.fail(moved);
        else store.land(bake(moved, false));
        store.land(bake(moved));
        const normal = store.creaseOf(moved.id)?.normal ?? "a discarded normal";
        expect(store.canReveal(moved.id, normal)).toBe(false);
        expect(store.startReveal(moved.id, normal)).toBe(false);
      },
    );

    it("clears a canceled board's grant and doesn't replay it after remount", () => {
      const store = new CreaseStore();
      store.want([job]);
      const moved = changed();
      store.want([moved], 1);
      store.land(bake(moved));
      const oldNormal = normalOf(store, moved.id);
      store.clear();
      expect(store.startReveal(moved.id, oldNormal)).toBe(false);
      store.want([moved], 1);
      store.land(bake(moved));
      expect(store.startReveal(moved.id, normalOf(store, moved.id))).toBe(false);
    });

    it.each(["pending", "ready"] as const)(
      "covering the board cancels a %s placement reveal before re-exposure",
      (state) => {
        const store = new CreaseStore();
        store.want([job]);
        const moved = changed();
        store.want([moved], 1);
        if (state === "ready") store.land(bake(moved));
        store.clearRevealIntents();
        store.want([moved], 1);
        store.land(bake(moved));
        expect(store.canReveal(moved.id, normalOf(store, moved.id))).toBe(false);
        expect(store.startReveal(moved.id, normalOf(store, moved.id))).toBe(false);
      },
    );

    it("doesn't grant a changed placement while covered or replay it on re-exposure", () => {
      const store = new CreaseStore();
      store.want([job]);
      const moved = changed();
      store.want([moved], 1, false);
      store.land(bake(moved));
      const normal = normalOf(store, moved.id);
      expect(store.canReveal(moved.id, normal)).toBe(false);
      store.want([moved], 1, true);
      expect(store.startReveal(moved.id, normal)).toBe(false);
    });
  });

  it("doesn't settle initial assembly before the board has planned its crease jobs", async () => {
    const store = new CreaseStore();
    let settled = false;
    void store.whenSettled().then(() => (settled = true));
    await Promise.resolve();
    expect(settled).toBe(false);
    store.want([]);
    await Promise.resolve();
    expect(settled).toBe(true);
  });

  it.each(["crease", "no crease", "failure"] as const)(
    "waits for the requested baseline bake to answer with %s",
    async (answer) => {
      const store = new CreaseStore();
      store.want([job]);
      let settled = false;
      void store.whenSettled().then(() => (settled = true));
      await Promise.resolve();
      expect(settled).toBe(false);
      store.land({ ...bake(job), key: "another stack" });
      await Promise.resolve();
      expect(settled).toBe(false);
      if (answer === "failure") store.fail(job);
      else store.land(bake(job, answer === "crease"));
      await Promise.resolve();
      expect(settled).toBe(true);
    },
  );

  it("releases a canceled assembly wait without waiting for a bake", async () => {
    const store = new CreaseStore();
    store.want([job]);
    const canceled = new AbortController();
    const waiting = store.whenSettled(canceled.signal);
    canceled.abort();
    await expect(waiting).resolves.toBeUndefined();
  });

  it("releases an assembly wait when its board leaves", async () => {
    const store = new CreaseStore();
    store.want([job]);
    const waiting = store.whenSettled();
    store.clear();
    await expect(waiting).resolves.toBeUndefined();
  });

  it("fails only pending wanted keys when the worker stops, preserving completed crease images", async () => {
    const store = new CreaseStore();
    const pending = { ...job, id: "pending", key: "pending stack" };
    store.want([job, pending]);
    store.land(bake(job));
    const shown = store.creaseOf(job.id);
    let settled = false;
    void store.whenSettled().then(() => (settled = true));
    expect(store.failPending()).toEqual([pending.id]);
    await Promise.resolve();
    expect(settled).toBe(true);
    expect(store.creaseOf(job.id)).toBe(shown);
    expect(store.want([job, pending])).toEqual([]);
  });

  it("shows a crease for the stack it was baked for, and drops it the moment the stack changes", () => {
    const store = new CreaseStore();
    const changed = vi.fn();
    store.watch(job.id, changed);
    store.want([job]);

    store.land({ ...bake(job), key: "an older stack" });
    expect(store.creaseOf(job.id)).toBeUndefined();

    store.land(bake(job));
    expect(Object.keys(store.creaseOf(job.id) ?? {}).sort()).toEqual(["base", "height", "normal"]);
    expect(changed).toHaveBeenCalledTimes(1);

    const restacked = { ...job, key: "another stack" };
    expect(store.want([restacked])).toEqual([restacked]);
    expect(store.creaseOf(job.id)).toBeUndefined();
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it("keeps the crease shown when a second bake of the same stack lands, and doesn't post it again", () => {
    const store = new CreaseStore();
    const changed = vi.fn();
    store.watch(job.id, changed);
    const todo = store.want([job]);
    store.land(bake(job));
    const shown = store.creaseOf(job.id);
    store.land(bake(job));
    expect(store.creaseOf(job.id)).toBe(shown);
    expect(changed).toHaveBeenCalledTimes(1);
    expect(store.stillToBake(todo)).toEqual([]);
  });

  it("doesn't bake a stack again once its bake left nothing to show", () => {
    const store = new CreaseStore();
    store.want([job]);
    store.land(bake(job, false));
    expect(store.want([job])).toEqual([]);
  });

  it("doesn't bake a stack again once its bake failed, until the stack changes", () => {
    const store = new CreaseStore();
    store.want([job]);
    store.fail(job);
    expect(store.want([job])).toEqual([]);
    const restacked = { ...job, key: "another stack" };
    expect(store.want([restacked])).toEqual([restacked]);
  });

  it("lets go of a crease's images when it's replaced and when the board goes", () => {
    const revoke = vi.spyOn(URL, "revokeObjectURL");
    const store = new CreaseStore();
    store.want([job]);
    store.land(bake(job));
    const first = store.creaseOf(job.id);
    const restacked = { ...job, key: "another stack" };
    store.want([restacked]);
    store.land(bake(restacked));
    const second = store.creaseOf(job.id);
    store.clear();

    for (const crease of [first, second]) {
      if (!crease) throw new Error("A bake left no crease");
      for (const url of Object.values(crease)) expect(revoke).toHaveBeenCalledWith(url);
    }
  });
});
