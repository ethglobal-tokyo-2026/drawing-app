import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useEffectEvent,
  useId,
  useState,
  useSyncExternalStore,
} from "react";
import { isPerformanceRecorderOn, notePerformance } from "../performance/performanceRecorder";
import { CREASE_SIDES, lightIn, type CreaseImage, type CreaseSide } from "../stickers/crease";
import type {
  Affine,
  CreaseBatch,
  CreaseJob,
  CreaseReply,
  Silhouette,
} from "../stickers/creaseWorker";
import type { Crease } from "../stickers/StickerFigure";
import { kyotoSeikaBandWidth } from "../stickers/kyotoSeikaFoil";
import type { FoilTone } from "../stickers/StickerFoil";
import type { StickerUrls } from "../stickers/stickerUrls";
import { deviceSetting } from "../ui/deviceSetting";
import { workerCanPaint } from "../ui/workerCanPaint";
import { stickerBox, type Field, type Placement } from "./placement";

interface CreaseSticker {
  id: string;
  width: number;
  height: number;
  urls: StickerUrls;
  placement: Placement;
}

/**
 * The crease's pixels per CSS px at most: it's soft, so a finer bake looks the same on a denser
 * screen and only takes more memory.
 */
const MAX_SCALE = 1;
/** How long the board holds still before its creases are baked again. */
const SETTLE_MS = 90;
/**
 * How far apart two stickers' boxes can lie and one still count as over the other, in CSS px, since a
 * holo or pink band's mask from the server fills the box; a band grown from the cut widens it to its
 * own width. Also the width a holo or pink band is grown by where there's no such mask (the Shop's
 * sample, never on a board).
 */
export const FOIL_REACH = 5;

/** Whether this device shows creases: only once its developer slip switches them on. */
const creasesShown = deviceSetting<boolean>("board.creases", {
  parse: (text) => text === "on",
  serialize: (on) => (on ? "on" : null),
  name: "Whether creases show",
});

/** Whether this device shows creases, as its developer slip last set it. */
export const useCreasesShown = (): boolean =>
  useSyncExternalStore(creasesShown.subscribe, creasesShown.get);
/** Shows or hides creases on this device; says whether the device kept the choice. */
export const keepCreasesShown = (on: boolean): boolean => creasesShown.set(on);

type Box = { x: number; y: number; w: number; h: number; r: number };

/** `p` after `q`. */
const mul = (p: Affine, q: Affine): Affine => [
  p[0] * q[0] + p[2] * q[1],
  p[1] * q[0] + p[3] * q[1],
  p[0] * q[2] + p[2] * q[3],
  p[1] * q[2] + p[3] * q[3],
  p[0] * q[4] + p[2] * q[5] + p[4],
  p[1] * q[4] + p[3] * q[5] + p[5],
];
const move = (x: number, y: number): Affine => [1, 0, 0, 1, x, y];
/** Clockwise on screen, as CSS turns a sticker. */
const turn = (deg: number): Affine => {
  const t = (deg * Math.PI) / 180;
  return [Math.cos(t), Math.sin(t), -Math.sin(t), Math.cos(t), 0, 0];
};

/** The corners of a box turned about its middle, grown by `reach`, on the board. */
function corners(b: Box, reach: number): [number, number][] {
  const t = (b.r * Math.PI) / 180;
  const [c, s] = [Math.cos(t), Math.sin(t)];
  const [hw, hh] = [b.w / 2 + reach, b.h / 2 + reach];
  return [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ].map(([x, y]) => [b.x + x * c - y * s, b.y + x * s + y * c]);
}

/** Whether two turned boxes overlap: no edge of either separates them. */
function overlaps(a: Box, b: Box, reach: number) {
  const pa = corners(a, reach);
  const pb = corners(b, reach);
  const span = (pts: [number, number][], nx: number, ny: number) => {
    const d = pts.map(([x, y]) => x * nx + y * ny);
    return [Math.min(...d), Math.max(...d)];
  };
  for (const poly of [pa, pb]) {
    for (let i = 0; i < 2; i++) {
      const [[x0, y0], [x1, y1]] = [poly[i], poly[i + 1]];
      const [nx, ny] = [y0 - y1, x1 - x0];
      const [a0, a1] = span(pa, nx, ny);
      const [b0, b1] = span(pb, nx, ny);
      if (a1 < b0 || b1 < a0) return false;
    }
  }
  return true;
}

/** A value for each side a crease is baked lit from. */
const bySide = <T>(of: (side: CreaseSide) => T): Record<CreaseSide, T> => ({
  topLeft: of("topLeft"),
  bottomRight: of("bottomRight"),
  topRight: of("topRight"),
  bottomLeft: of("bottomLeft"),
});

/** A value for each of a crease's images. */
const byImage = <T>(of: (image: CreaseImage) => T): Record<CreaseImage, T> => ({
  base: of("base"),
  ...bySide(of),
});

const r2 = (v: number) => Math.round(v * 100) / 100;
const r5 = (v: number) => Math.round(v * 100_000) / 100_000;
/**
 * Rounded so float noise doesn't change a job's key: the move to two places, under a pixel; the turn
 * and scale to five, since their error grows with the sticker's size.
 */
const roundAffine = ([a, b, c, d, e, f]: Affine): Affine => [
  r5(a),
  r5(b),
  r5(c),
  r5(d),
  r2(e),
  r2(f),
];

/**
 * A sticker's outline as the board draws it: its cut; with holo or pink foil, the band's mask the
 * server made; with the Kyoto Seika Practice Mode foil, its cut grown by that band, as its CSS grows it.
 */
function silhouetteOf(
  urls: StickerUrls,
  tone: FoilTone | null,
  box: { w: number; h: number },
): Silhouette {
  if (tone === "kyoto-seika") {
    return { url: urls.mask, grow: r2(kyotoSeikaBandWidth(box.w, box.h)) };
  }
  if (!tone) return { url: urls.mask, grow: 0 };
  return urls.foil ? { url: urls.foil, grow: 0 } : { url: urls.mask, grow: FOIL_REACH };
}

/** Each sticker's crease job, from the stickers under it; `stickers` go bottom to top. */
export function creaseJobs<S extends CreaseSticker>(
  stickers: readonly S[],
  field: Field,
  unit: number,
  foilOf: (s: S) => FoilTone | null,
  scale: number,
): CreaseJob[] {
  const boxes = stickers.map((s) => ({
    ...stickerBox(field, unit, s.placement, s),
    r: s.placement.r,
  }));
  const outlines = stickers.map((s, i) => silhouetteOf(s.urls, foilOf(s), boxes[i]));
  const jobs: CreaseJob[] = [];
  stickers.forEach((top, i) => {
    const b = boxes[i];
    const under = stickers.slice(0, i).flatMap((_, j) => {
      const a = boxes[j];
      const reach = Math.max(FOIL_REACH, outlines[i].grow, outlines[j].grow);
      if (!overlaps(a, b, reach)) return [];
      // The one underneath's box, from its middle, into this one's frame, then into pixels.
      const steps: Affine[] = [
        [scale, 0, 0, scale, 0, 0],
        move(b.w / 2, b.h / 2),
        turn(-b.r),
        move(a.x - b.x, a.y - b.y),
        turn(a.r),
        move(-a.w / 2, -a.h / 2),
      ];
      return [{ ...outlines[j], w: r2(a.w), h: r2(a.h), at: roundAffine(steps.reduce(mul)) }];
    });
    if (!under.length) return;
    // Each side's light is on screen; the bake is in the sticker's frame, which its turn moves.
    const lights = bySide((side): [number, number] => {
      const [x, y] = lightIn(b.r, [...CREASE_SIDES[side]]);
      return [r2(x), r2(y)];
    });
    const shape = {
      width: Math.ceil(b.w * scale),
      height: Math.ceil(b.h * scale),
      scale,
      lights,
      own: outlines[i],
      under,
    };
    jobs.push({ id: top.id, key: JSON.stringify(shape), ...shape });
  });
  return jobs;
}

/** What a bake left for a sticker. */
interface Baked {
  /** The stack it was baked for. */
  key: string;
  /** Absent when nothing underneath showed a step. */
  crease?: Crease;
}

/** One board's baked creases, by sticker, and who watches each. */
export class CreaseStore {
  /**
   * Includes a sticker whose bake left nothing to show or failed, so its stack isn't baked again until
   * it changes.
   */
  readonly #baked = new Map<string, Baked>();
  readonly #watchers = new Map<string, Set<() => void>>();
  /** The key each sticker's crease must match to show: the board's stack now. */
  #wanted = new Map<string, string>();

  /** A sticker's crease, once it's baked. */
  creaseOf(id: string): Crease | undefined {
    return this.#baked.get(id)?.crease;
  }

  /** Calls `onChange` when that sticker's crease changes; returns what stops it. */
  watch(id: string, onChange: () => void): () => void {
    const watchers = this.#watchers.get(id) ?? new Set<() => void>();
    this.#watchers.set(id, watchers);
    watchers.add(onChange);
    return () => {
      watchers.delete(onChange);
      if (!watchers.size && this.#watchers.get(id) === watchers) this.#watchers.delete(id);
    };
  }

  /**
   * Takes the jobs the board's stack calls for now. A crease baked for another stack goes at once, so
   * none outlives what it was baked for. Returns the jobs not yet baked.
   */
  want(jobs: readonly CreaseJob[]): CreaseJob[] {
    this.#wanted = new Map(jobs.map((j) => [j.id, j.key]));
    for (const [id, baked] of this.#baked) {
      if (this.#wanted.get(id) !== baked.key) this.#put(id, null);
    }
    return this.stillToBake(jobs);
  }

  /** Those of `jobs` the board's stack still calls for and no bake has answered yet. */
  stillToBake(jobs: readonly CreaseJob[]): CreaseJob[] {
    return jobs.filter(
      (j) => this.#wanted.get(j.id) === j.key && this.#baked.get(j.id)?.key !== j.key,
    );
  }

  /**
   * Shows a bake's crease, unless the sticker's stack has changed since it was posted, or a bake of
   * the same stack already shows: replacing it would press it in again.
   */
  land({ id, key, crease }: Extract<CreaseReply, { ok: true }>) {
    if (this.#wanted.get(id) !== key || this.#baked.get(id)?.key === key) return;
    this.#put(id, {
      key,
      ...(crease && { crease: byImage((image) => URL.createObjectURL(crease[image])) }),
    });
  }

  /** Records a bake that failed, so its stack isn't posted again until it changes. */
  fail({ id, key }: { id: string; key: string }) {
    if (this.#wanted.get(id) !== key || this.#baked.get(id)?.key === key) return;
    this.#put(id, { key });
  }

  /** Lets go of every crease, as the board goes. */
  clear() {
    this.#wanted = new Map();
    for (const id of [...this.#baked.keys()]) this.#put(id, null);
  }

  #put(id: string, baked: Baked | null) {
    const old = this.#baked.get(id);
    if (old?.crease) for (const url of Object.values(old.crease)) URL.revokeObjectURL(url);
    if (baked) this.#baked.set(id, baked);
    else this.#baked.delete(id);
    // A sticker with no crease before or after has nothing to redraw.
    if (!old?.crease && !baked?.crease) return;
    for (const onChange of this.#watchers.get(id) ?? []) onChange();
  }
}

/** The creases of the board the calling sticker is on; none outside a board that bakes them. */
export const CreasesContext = createContext<CreaseStore | null>(null);

const nothing = () => {};

/** A sticker's crease, shown once it's baked; only that sticker redraws when it lands. */
export function useCrease(id: string): Crease | undefined {
  const store = useContext(CreasesContext);
  const watch = useCallback(
    (onChange: () => void) => (store ? store.watch(id, onChange) : nothing),
    [store, id],
  );
  const creaseOf = useCallback(() => store?.creaseOf(id), [store, id]);
  return useSyncExternalStore(watch, creaseOf);
}

/** The mounted boards' stores, by the board id their batches carry back in the worker's replies. */
const stores = new Map<string, CreaseStore>();
let worker: Worker | null = null;
/** Whether a worker can paint here, checked once, the first time it's asked. */
let workerPaints: boolean | null = null;
/** Whether the console and recorder have been told this browser can't bake creases. */
let saidCantBake = false;
let batches = 0;

/** Whether this browser can bake creases: the crease worker paints on OffscreenCanvas. */
export function creasesCanBake(): boolean {
  workerPaints ??= workerCanPaint();
  return workerPaints;
}

/** Says what went wrong with creases, in the console and the performance recorder. */
function sayCreaseFailed(why: string) {
  console.error(why);
  notePerformance("crease", why);
}

function heard(reply: CreaseReply) {
  if (!reply.ok) {
    sayCreaseFailed(`Baking sticker ${reply.id}'s crease failed: ${reply.error}`);
    stores.get(reply.board)?.fail(reply);
    return;
  }
  if (isPerformanceRecorderOn()) {
    notePerformance("crease", `baked ${reply.id} in ${reply.timings.total.toFixed(1)} ms`);
  }
  stores.get(reply.board)?.land(reply);
}

/** Lets go of a worker that failed, so the next batch starts a fresh one. */
function dropWorker(failed: Worker, why: string) {
  sayCreaseFailed(why);
  failed.terminate();
  if (worker === failed) worker = null;
}

/** The one worker every board's batches go to; none where a worker can't paint, which it says once. */
function creaseWorker(): Worker | null {
  if (worker) return worker;
  if (!creasesCanBake()) {
    if (!saidCantBake)
      sayCreaseFailed("A worker can't paint in this browser, so no crease is baked");
    saidCantBake = true;
    return null;
  }
  const started = new Worker(new URL("../stickers/creaseWorker.ts", import.meta.url), {
    type: "module",
  });
  started.onmessage = (event: MessageEvent<CreaseReply>) => heard(event.data);
  // A script that didn't load reports a bare event, with no message: a page open since before a
  // deploy asks for the old build's worker, which the deploy removed.
  started.onerror = (event) =>
    dropWorker(
      started,
      event.message
        ? `The crease worker failed: ${event.message}`
        : "The crease worker's script didn't load",
    );
  started.onmessageerror = () => dropWorker(started, "The crease worker's answer couldn't be read");
  worker = started;
  return started;
}

/** Tells the worker, if it's running, that a board wants nothing baked, so it drops the board's batch. */
function bakeNothingFor(board: string) {
  const message: CreaseBatch = { board, batch: ++batches, jobs: [] };
  worker?.postMessage(message);
}

/**
 * Bakes the creases of a board's stickers off the main thread once the board holds still, again for
 * each sticker whose stack changes, and none for the sticker in hand. Returns the board's creases,
 * which its stickers read through `CreasesContext`. A device that hasn't switched creases on bakes
 * none, and switching them off takes every crease off the board.
 */
export function useCreases<S extends CreaseSticker>({
  stickers,
  field,
  unit,
  foilOf,
  held,
}: {
  /** On the board, bottom to top. */
  stickers: readonly S[];
  field: Field | null;
  unit: number | null;
  /** The foil it wears, if any, whose band is then its outline. */
  foilOf: (s: S) => FoilTone | null;
  /** The sticker in hand, which has no crease and lies under none. */
  held?: string;
}): CreaseStore {
  const board = useId();
  const [store] = useState(() => new CreaseStore());
  const shown = useCreasesShown();
  const scale = Math.min(MAX_SCALE, window.devicePixelRatio || 1);
  // With creases off, as on most devices, there's nothing to bake, so no sticker is read.
  const signature = shown
    ? [
        held,
        field && `${field.left},${field.top},${field.w},${field.h}`,
        unit,
        scale,
        ...stickers.map((s) => {
          const p = s.placement;
          return `${s.id}:${p.x},${p.y},${p.s},${p.r},${foilOf(s)}`;
        }),
      ].join("|")
    : "off";

  useEffect(() => {
    stores.set(board, store);
    return () => {
      stores.delete(board);
      store.clear();
      bakeNothingFor(board);
    };
  }, [board, store]);

  const bake = useEffectEvent(() => {
    const jobs =
      shown && field && unit
        ? creaseJobs(
            stickers.filter((s) => s.id !== held),
            field,
            unit,
            foilOf,
            scale,
          )
        : [];
    const todo = store.want(jobs);
    if (!todo.length) {
      bakeNothingFor(board);
      return undefined;
    }
    const timer = window.setTimeout(() => {
      // A bake of the last batch may have landed while the board held still.
      const left = store.stillToBake(todo);
      if (!left.length) return;
      const message: CreaseBatch = { board, batch: ++batches, jobs: left };
      // Creases are decoration: a worker that can't start leaves the board without them, and says so.
      try {
        creaseWorker()?.postMessage(message);
      } catch (error) {
        console.error(
          `The crease worker didn't start, so ${left.length} stickers show no crease`,
          error,
        );
      }
    }, SETTLE_MS);
    return () => window.clearTimeout(timer);
  });
  useEffect(() => bake(), [signature]);

  return store;
}
