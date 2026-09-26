import { useEffect, useState, type RefObject } from "react";

let settle = () => {};
const settled = new Promise<void>((resolve) => {
  settle = resolve;
});
let isSettled = false;

/**
 * Resolves once the board's first load has settled: its stickers' images are in and the artist chips
 * that greet it have played, or it failed to load. Once per page load. Work the board doesn't need,
 * like Privy's SDK, waits for it rather than competing with the board's own downloads.
 */
export const boardSettled = () => settled;

export function settleBoard() {
  if (isSettled) return;
  isSettled = true;
  // For the performance recording and the boot measurements.
  performance.mark("board-settled");
  settle();
}

/** Loaded, or failed, which is as settled as it will get. */
const loaded = (img: HTMLImageElement) =>
  img.complete
    ? Promise.resolve()
    : new Promise<void>((resolve) => {
        img.addEventListener("load", () => resolve(), { once: true });
        img.addEventListener("error", () => resolve(), { once: true });
      });

/**
 * Settles the board once the images in `stage` have loaded and the first-load chips are done.
 * `stickers` names the stickers on the board, null until they render; `failed` settles at once.
 */
export function useSettleBoard(
  stage: RefObject<HTMLElement | null>,
  {
    stickers,
    failed,
    chipsPlaying,
  }: { stickers: string | null; failed: boolean; chipsPlaying: boolean },
) {
  /** The stickers whose images are all in. */
  const [imagesIn, setImagesIn] = useState<string | null>(null);
  useEffect(() => {
    if (isSettled || stickers === null) return;
    let live = true;
    const images = Array.from(stage.current?.querySelectorAll("img") ?? []);
    void Promise.all(images.map(loaded)).then(() => {
      if (live) setImagesIn(stickers);
    });
    return () => {
      live = false;
    };
  }, [stage, stickers]);

  const done = failed || (stickers !== null && imagesIn === stickers && !chipsPlaying);
  useEffect(() => {
    if (done) settleBoard();
  }, [done]);
}
