import { useEffect, useState } from "react";
import { noteBootMilestone } from "../performance/bootMilestones";
import { watchFrames } from "../performance/performanceRecorder";
import { onItsWay, type BoardStickerView } from "./boardSticker";

/**
 * Board complete: the first board of this app open has its stickers in. The fresh board has landed
 * and every sticker on it has decoded, or there's nothing left to wait for. What can wait (the code
 * for what opens from the board, the stat board, the drawing screen) waits for it and a quiet second
 * after, so nothing else downloads while the board assembles.
 */

/** Once the board is complete, how long it stays quiet before what waited for it starts. */
export const QUIET_MS = 1000;
/** A board still assembling this long after it first showed counts as complete, so nothing waits for ever. */
const GIVE_UP_MS = 10_000;
/** How much of the board's first motion the performance report sums up. */
const FRAMES_AFTER_MS = 5000;

let completeAt: number | null = null;
const waiting = new Set<() => void>();
let givingUp: ReturnType<typeof setTimeout> | undefined;

/** The board is complete, or has nothing left to wait for; only the first call counts. */
export function markBoardComplete(): void {
  if (completeAt !== null) return;
  completeAt = performance.now();
  clearTimeout(givingUp);
  noteBootMilestone("board complete", undefined, completeAt);
  watchFrames("the 5s after the board was complete", completeAt, FRAMES_AFTER_MS);
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
export interface AssemblingSticker {
  urls: readonly string[];
}

/** What the board's assembly waits for: each sticker on it. A given sticker has left it. */
export const assemblyOf = (stickers: readonly BoardStickerView[]): AssemblingSticker[] =>
  stickers.flatMap((s) => {
    if (!s.placement.on || !s.held || onItsWay(s)) return [];
    const { png, mask, spec, rim } = s.urls;
    return [{ urls: [png, mask, spec, rim].filter((url) => url !== undefined) }];
  });

/**
 * Follows the board's first assembly, on this open: decodes each sticker's images as the board shows
 * them, notes the first sticker and the last for the performance report, and marks the board complete
 * once every sticker of the fresh board is in. A board drawn from the phone's storage (`fresh` false)
 * starts its stickers decoding, and the fresh board completes it.
 */
export function followBoardAssembly(
  stickers: readonly AssemblingSticker[],
  { fresh }: { fresh: boolean },
): void {
  if (completeAt !== null) return;
  givingUp ??= setTimeout(markBoardComplete, GIVE_UP_MS);
  const each = stickers.map(async (s) => {
    await Promise.all(s.urls.map(decodeImage));
    noteBootMilestone("first sticker decoded");
  });
  if (!fresh) return;
  const images = stickers.reduce((n, s) => n + s.urls.length, 0);
  void Promise.all(each).then(() => {
    noteBootMilestone("all stickers", `${stickers.length} stickers, ${images} images`);
    markBoardComplete();
  });
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
  givingUp = undefined;
  waiting.clear();
  decodes.clear();
}
