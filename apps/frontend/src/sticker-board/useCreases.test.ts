import { afterEach, describe, expect, it, vi } from "vitest";
import { CREASE_SIDES } from "../stickers/crease";
import type { Affine, CreaseJob, CreaseReply } from "../stickers/creaseWorker";
import { testStickerUrls } from "../stickers/testStickerUrls";
import { fieldOf, PHONE_BOARD, stickerBox, unitOf, type Placement } from "./placement";
import { CreaseStore, creaseJobs, FOIL_REACH } from "./useCreases";

const field = fieldOf(PHONE_BOARD.W, PHONE_BOARD.H);
const unit = unitOf("phone", PHONE_BOARD.W);
/** Pixels per CSS px for the bakes. */
const SCALE = 2;
/** `at` is stored to two places, which over a sticker's size moves a point by under a pixel. */
const ROUNDING_PX = 1;

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

const jobsFor = (stickers: TestSticker[], wearsFoil: (s: TestSticker) => boolean = () => false) =>
  creaseJobs(stickers, field, unit, wearsFoil, SCALE);

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
    ["neither turned", 0, 0],
    ["the sticker over it turned", 30, 0],
    ["both turned", 30, -20],
  ])("puts the sticker underneath where it lies in the top one's frame, %s", (_, over, under) => {
    const lower = sticker("lower", { x: 0.4, y: 0.5, r: under });
    const top = sticker("top", { x: 0.6, y: 0.55, r: over });

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
  });

  it("lights a turned sticker's crease from each side's light on screen, turned into its frame", () => {
    const r = 30;
    const [job] = jobsFor([sticker("lower", { x: 0.4 }), sticker("top", { x: 0.6, r })]);

    for (const side of ["topLeft", "bottomRight", "topRight", "bottomLeft"] as const) {
      // Turned back by the sticker's own turn, the light on screen lies in the sticker's frame.
      const [x, y] = clockwise(-r, CREASE_SIDES[side]);
      expect(job.lights[side][0]).toBeCloseTo(x, 2);
      expect(job.lights[side][1]).toBeCloseTo(y, 2);
    }
  });

  it("gives no job to stickers that don't touch", () => {
    const apart = [sticker("a", { x: 0.15, y: 0.2 }), sticker("b", { x: 0.85, y: 0.8 })];
    expect(jobsFor(apart)).toEqual([]);
    expect(jobsFor([sticker("alone")])).toEqual([]);
  });

  it("counts a sticker its neighbor's foil band could reach as lying over it", () => {
    /** Two stickers side by side with `gap` between their edges. */
    const beside = (gap: number) => {
      const left = sticker("left", { x: 0.3 });
      const next = boxOf(left).w + gap;
      return [left, sticker("right", { x: 0.3 + next / field.w })];
    };
    expect(jobsFor(beside(FOIL_REACH)).map((j) => j.id)).toEqual(["right"]);
    expect(jobsFor(beside(FOIL_REACH * 3))).toEqual([]);
  });

  it("draws a sticker that wears foil by its foil band, and one that doesn't by its cut", () => {
    const foiled = (id: string, at: Partial<Placement>) =>
      sticker(id, at, { ...testStickerUrls(id), foil: `${id}-foil.png` });
    const lower = foiled("lower", { x: 0.4 });
    const top = foiled("top", { x: 0.6 });

    const [lowerOnly] = jobsFor([lower, top], (s) => s.id === "lower");
    expect(lowerOnly.under[0].url).toBe(lower.urls.foil);
    expect(lowerOnly.own).toBe(top.urls.mask);

    const [topOnly] = jobsFor([lower, top], (s) => s.id === "top");
    expect(topOnly.under[0].url).toBe(lower.urls.mask);
    expect(topOnly.own).toBe(top.urls.foil);
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

  /** The worker's answer to `of`: the crease lit from each side, or none when nothing showed a step. */
  const bake = (of: CreaseJob, made = true): Extract<CreaseReply, { ok: true }> => ({
    ok: true,
    board: "board",
    id: of.id,
    key: of.key,
    crease: made
      ? {
          topLeft: new Blob(["topLeft"]),
          bottomRight: new Blob(["bottomRight"]),
          topRight: new Blob(["topRight"]),
          bottomLeft: new Blob(["bottomLeft"]),
        }
      : null,
    timings: { decode: 0, draw: 0, shade: 0, encode: 0, total: 0 },
  });

  it("shows a crease for the stack it was baked for, and drops it the moment the stack changes", () => {
    const store = new CreaseStore();
    const changed = vi.fn();
    store.watch(job.id, changed);
    store.want([job]);

    store.land({ ...bake(job), key: "an older stack" });
    expect(store.creaseOf(job.id)).toBeUndefined();

    store.land(bake(job));
    expect(store.creaseOf(job.id)).toBeDefined();
    expect(changed).toHaveBeenCalledTimes(1);

    const restacked = { ...job, key: "another stack" };
    expect(store.want([restacked])).toEqual([restacked]);
    expect(store.creaseOf(job.id)).toBeUndefined();
    expect(changed).toHaveBeenCalledTimes(2);
  });

  it("doesn't bake a stack again once its bake left nothing to show", () => {
    const store = new CreaseStore();
    store.want([job]);
    store.land(bake(job, false));
    expect(store.want([job])).toEqual([]);
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
