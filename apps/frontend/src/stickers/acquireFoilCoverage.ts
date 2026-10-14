import { foilCoverageImage } from "./foilCoverageImage";
import type { FoilCoverage } from "./foilCoverage";
import { foilBandWidth } from "./foilBand";
import type { StickerFoilMaterial } from "./stickerFoilMaterial";

/** One coverage for every presentation of it, and its static band's mask: baked, or encoded with it. */
export type SharedFoilCoverage = Readonly<FoilCoverage> & { readonly mask: string };

/** How long a coverage may take, for the renderer and the static band alike. */
export const FOIL_COVERAGE_TIMEOUT_MS = 20_000;

const entries = new Map<string, Entry>();
/** Each encoded mask's entry, so a copied cast can keep showing it after its source moves on. */
const encodedMasks = new Map<string, Entry>();
type Subscriber = {
  resolve: (value: SharedFoilCoverage) => void;
  reject: (error: unknown) => void;
};
type Entry = {
  key: string;
  users: number;
  abort: AbortController;
  waiting: Set<Subscriber>;
  value?: SharedFoilCoverage;
  /** The encoded band's object URL, revoked with the entry. */
  objectUrl?: string;
};
function retire(entry: Entry) {
  if (entries.get(entry.key) === entry) entries.delete(entry.key);
  entry.value = undefined;
  if (entry.objectUrl) {
    encodedMasks.delete(entry.objectUrl);
    URL.revokeObjectURL(entry.objectUrl);
  }
  entry.objectUrl = undefined;
}
function letGo(entry: Entry) {
  if (--entry.users > 0) return;
  retire(entry);
  entry.abort.abort();
}

/** One more holder of a shown mask; a baked mask is the server's and needs none. */
export function holdFoilCoverageMask(mask: string): () => void {
  const entry = encodedMasks.get(mask);
  if (!entry) return () => {};
  entry.users++;
  let held = true;
  return () => {
    if (!held) return;
    held = false;
    letGo(entry);
  };
}

/** The longest side the renderer draws a frame this big at, up to a √2 step so near sizes share. */
function tileSide(width: number, height: number) {
  const longest = Math.max(width, height);
  const shown = Math.ceil(longest * Math.min(devicePixelRatio || 1, 2, 1024 / longest));
  return Math.ceil(2 ** (Math.ceil(2 * Math.log2(Math.max(1, shown))) / 2));
}

/**
 * Presentations whose pixels match share one coverage, whatever size shows them, while any holds it.
 * Its alpha is shared and never written; the last release revokes its encoded mask.
 */
export function acquireFoilCoverage(
  cut: string,
  material: StickerFoilMaterial,
  width: number,
  height: number,
  signal: AbortSignal,
) {
  if (signal.aborted)
    return { coverage: Promise.reject<SharedFoilCoverage>(signal.reason), release: () => {} };
  const baked = material.style === "kyoto-seika" ? undefined : material.mask;
  const side = tileSide(width, height);
  const band = foilBandWidth(material, width, height);
  const grow = [band / width, band / height] as const;
  const key = JSON.stringify([cut, material.style, baked ?? null, side, grow]);
  let entry = entries.get(key);
  const fresh = !entry;
  if (!entry) {
    entry = { key, users: 0, abort: new AbortController(), waiting: new Set() };
    entries.set(key, entry);
  }
  const owned = entry;
  owned.users++;
  let released = false;
  let subscriber: Subscriber | undefined;
  const release = () => {
    if (released) return;
    released = true;
    signal.removeEventListener("abort", canceled);
    if (subscriber) {
      owned.waiting.delete(subscriber);
      subscriber.reject(signal.reason ?? new DOMException("Foil coverage released", "AbortError"));
      subscriber = undefined;
    }
    letGo(owned);
  };
  const canceled = () => release();
  const coverage = new Promise<SharedFoilCoverage>((resolve, reject) => {
    if (owned.value) resolve(owned.value);
    else {
      subscriber = {
        resolve: (value) => {
          signal.removeEventListener("abort", canceled);
          subscriber = undefined;
          resolve(value);
        },
        reject: (error) => {
          signal.removeEventListener("abort", canceled);
          subscriber = undefined;
          reject(error);
        },
      };
      owned.waiting.add(subscriber);
      signal.addEventListener("abort", canceled, { once: true });
    }
  });
  if (fresh) {
    const timeout = setTimeout(
      () =>
        owned.abort.abort(
          new DOMException("Preparing shared foil coverage exceeded 20 seconds", "TimeoutError"),
        ),
      FOIL_COVERAGE_TIMEOUT_MS,
    );
    const failed = (error: unknown) => {
      retire(owned);
      for (const waiting of owned.waiting) waiting.reject(error);
      owned.waiting.clear();
    };
    const aborted = () => {
      clearTimeout(timeout);
      failed(owned.abort.signal.reason);
    };
    owned.abort.signal.addEventListener("abort", aborted, { once: true });
    void foilCoverageImage(cut, material, side, grow, owned.abort.signal)
      .then(({ png, ...grown }) => {
        if (owned.abort.signal.aborted) return;
        let mask: string;
        if (baked) mask = baked;
        else if (png) {
          mask = owned.objectUrl = URL.createObjectURL(png);
          encodedMasks.set(mask, owned);
        } else throw new Error(`Growing ${material.style} foil for ${cut} brought no static mask`);
        owned.value = Object.freeze({ ...grown, mask });
        for (const waiting of owned.waiting) waiting.resolve(owned.value);
        owned.waiting.clear();
      })
      .catch(failed)
      .finally(() => {
        clearTimeout(timeout);
        owned.abort.signal.removeEventListener("abort", aborted);
      });
  }
  return { coverage, release };
}
