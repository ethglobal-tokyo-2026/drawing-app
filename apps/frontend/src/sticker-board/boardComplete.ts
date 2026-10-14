import { useEffect, useState } from "react";
import {
  afterBoardCompleteLabel,
  FRAMES_AFTER_BOARD_COMPLETE_MS,
  noteBootMilestone,
} from "../performance/bootMilestones";
import { watchFrames } from "../performance/performanceRecorder";
import { whenStickerSettled } from "../stickers/stickerRenderer";
import type { FoilTone } from "../stickers/foilMaterial";
import { onTheBoard, type BoardStickerView } from "./boardSticker";
import type { CreaseStore } from "./useCreases";

/**
 * Board complete: the first board of this app open has its stickers in. The fresh board has landed
 * and its exposed stickers' images, initial creases and laminate have settled, or there's nothing
 * left to wait for. What can wait (the code
 * for what opens from the board, the stat board, the drawing screen) waits for it and a quiet second
 * after, so nothing else downloads while the board assembles.
 */

/** Once the board is complete, how long it stays quiet before what waited for it starts. */
export const QUIET_MS = 1000;
/** A board still assembling this long after it first showed counts as complete, so nothing waits for ever. */
export const GIVE_UP_MS = 10_000;

let completeAt: number | null = null;
const waiting = new Set<() => void>();
let givingUp: ReturnType<typeof setTimeout> | undefined;
const materialWaits = new Set<AbortController>();

/** The board is complete, or has nothing left to wait for; only the first call counts. */
export function markBoardComplete(): void {
  if (completeAt !== null) return;
  completeAt = performance.now();
  clearTimeout(givingUp);
  for (const waiting of materialWaits) waiting.abort();
  materialWaits.clear();
  noteBootMilestone("board complete", undefined, completeAt);
  watchFrames(afterBoardCompleteLabel(), completeAt, FRAMES_AFTER_BOARD_COMPLETE_MS);
  for (const done of waiting) done();
  waiting.clear();
  // The board holds its images now.
  decodes.clear();
}

export const whenBoardComplete = (): Promise<void> =>
  completeAt === null ? new Promise((resolve) => waiting.add(resolve)) : Promise.resolve();

/** The board complete, then a quiet second: when what waited for it can start. */
export async function whenBoardQuiet(): Promise<void> {
  await whenBoardComplete();
  const left = (completeAt ?? 0) + QUIET_MS - performance.now();
  if (left > 0) await new Promise((resolve) => setTimeout(resolve, left));
}

/** Each image's one decode, shared by the warm-up at boot and the board's first assembly. */
const decodes = new Map<string, { img: HTMLImageElement; decoded: Promise<void> }>();

/**
 * Loads and decodes an image, once per URL; it settles either way, since a broken image mustn't hold
 * the board up. The browser keeps one copy per URL, so the board's own <img> and CSS masks share it.
 */
export function decodeImage(url: string): Promise<void> {
  const known = decodes.get(url);
  if (known) return known.decoded;
  const img = new Image();
  img.decoding = "async";
  img.src = url;
  const decoded = img.decode().then(
    () => {},
    () => {},
  );
  // Held until the board is complete, so nothing throws the decoded image away before it shows.
  decodes.set(url, { img, decoded });
  return decoded;
}

/** A sticker as the board's assembly waits for it: its images' URLs. */
interface AssemblingSticker {
  urls: readonly string[];
}

/** What the board's assembly waits for: each sticker on it. A given sticker has left it. */
export const assemblyOf = (
  stickers: readonly BoardStickerView[],
  foilOf?: (sticker: BoardStickerView) => FoilTone | null,
): AssemblingSticker[] =>
  stickers.flatMap((s) => {
    if (!onTheBoard(s)) return [];
    const { png, mask, foil } = s.urls;
    const tone = foilOf?.(s);
    // Kyoto Seika Practice Mode foil grows from the cut; holo and pink use the baked foil mask.
    return [{ urls: [png, mask, ...(foil && tone && tone !== "kyoto-seika" ? [foil] : [])] }];
  });

interface InitialBoardMaterials {
  root: HTMLElement;
  creases: CreaseStore;
  active: boolean;
}

/** Waits only for surfaces exposed at assembly, then for the first crease baseline's committed normal. */
async function initialMaterials(
  { root, creases, active }: InitialBoardMaterials,
  signal: AbortSignal,
): Promise<void> {
  if (!active || document.hidden) return;
  // Geometry is read once, outside motion. A hidden owner is not admitted just to finish boot.
  const surfaces = [
    ...root.querySelectorAll<HTMLCanvasElement>(".placed-sticker canvas.sticker-material"),
  ].filter((canvas) => {
    if (!canvas.isConnected || !canvas.clientWidth || !canvas.clientHeight) return false;
    const box = canvas.getBoundingClientRect();
    return box.bottom >= 0 && box.top <= innerHeight && box.right >= 0 && box.left <= innerWidth;
  });
  if (!surfaces.length) return;
  await creases.whenSettled(signal);
  if (signal.aborted) return;
  // The store's reply precedes React's normal prop update; cross its commit before waiting on upload.
  await new Promise<void>((resolve) => {
    const finish = () => {
      cancelAnimationFrame(frame);
      signal.removeEventListener("abort", finish);
      resolve();
    };
    const frame = requestAnimationFrame(finish);
    signal.addEventListener("abort", finish, { once: true });
  });
  if (signal.aborted) return;
  await Promise.all(
    surfaces.map((canvas) => {
      const id = canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId;
      return whenStickerSettled(
        canvas,
        { normal: id ? creases.creaseOf(id)?.normal : undefined },
        signal,
      );
    }),
  );
}

/**
 * Follows the board's first assembly, on this open: decodes each sticker's images as the board shows
 * them, notes the first sticker and the last for the performance report, and marks the board complete
 * once every exposed sticker of the fresh board has its baseline material. A board drawn from the phone's storage (`fresh` false)
 * starts its stickers decoding, and the fresh board completes it.
 */
export function followBoardAssembly(
  stickers: readonly AssemblingSticker[],
  { fresh, materials }: { fresh: boolean; materials?: InitialBoardMaterials },
): (() => void) | undefined {
  if (completeAt !== null) return;
  givingUp ??= setTimeout(markBoardComplete, GIVE_UP_MS);
  const each = stickers.map(async (s) => {
    await Promise.all(s.urls.map(decodeImage));
    noteBootMilestone("first sticker decoded");
  });
  if (!fresh) return;
  const controller = new AbortController();
  materialWaits.add(controller);
  const images = stickers.reduce((n, s) => n + s.urls.length, 0);
  const material = materials ? initialMaterials(materials, controller.signal) : Promise.resolve();
  void Promise.all([...each, material]).then(() => {
    if (controller.signal.aborted) return;
    noteBootMilestone("all stickers", `${stickers.length} stickers, ${images} images`);
    markBoardComplete();
  });
  return () => {
    controller.abort();
    materialWaits.delete(controller);
  };
}

/**
 * Once the board is complete and has had its quiet second, and then the page is idle, starts loading
 * the parts' code; true from then on.
 */
export function usePreloadAfterBoard(parts: readonly { preload: () => Promise<unknown> }[]) {
  const [idle, setIdle] = useState(false);
  useEffect(() => {
    let current = true;
    let cancel = () => {};
    const run = () => {
      setIdle(true);
      for (const part of parts) void part.preload();
    };
    void whenBoardQuiet().then(() => {
      if (!current) return;
      // Safari has no requestIdleCallback; the quiet second has waited already.
      if (typeof requestIdleCallback === "function") {
        const id = requestIdleCallback(run, { timeout: 2000 });
        cancel = () => cancelIdleCallback(id);
      } else {
        const id = setTimeout(run, 0);
        cancel = () => clearTimeout(id);
      }
    });
    return () => {
      current = false;
      cancel();
    };
  }, [parts]);
  return idle;
}

/** For tests: back to a board that hasn't assembled yet, as a new page would start. */
export function forgetBoardComplete(): void {
  completeAt = null;
  clearTimeout(givingUp);
  for (const waiting of materialWaits) waiting.abort();
  materialWaits.clear();
  givingUp = undefined;
  waiting.clear();
  decodes.clear();
}
