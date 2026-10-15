import { expect, type Locator } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { boardSticker, say, sealIntoTray, signIn, startsWith, test } from "./helpers.ts";

const { stickerBoard } = strings;
const language = "en";

test.use({ reducedMotion: "reduce" });

/**
 * A point on one sticker's cut, off every other cut, inside the box of a sticker drawn over it, in
 * page pixels. The cuts come from the stickers' masks, never from the press areas under test.
 */
function inkUnderNeighbor(sheet: Locator) {
  return sheet.evaluate(async (el) => {
    /** Pixels kept clear of every cut line and box edge, so a tap can't land across one. */
    const margin = 4;
    const around = [
      [0, 0],
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    /** A slot as drawn, turned and scaled: its box in page pixels, and its cut from its mask. */
    async function frameOf(slot: HTMLElement) {
      const at = (x: number, y: number) => {
        const probe = document.createElement("i");
        probe.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:0;height:0`;
        slot.append(probe);
        const { x: px, y: py } = probe.getBoundingClientRect();
        probe.remove();
        return { x: px, y: py };
      };
      const [w, h] = [slot.offsetWidth, slot.offsetHeight];
      const o = at(0, 0);
      const right = at(w, 0);
      const down = at(0, h);
      const ux = { x: right.x - o.x, y: right.y - o.y };
      const uy = { x: down.x - o.x, y: down.y - o.y };
      const url = /url\("?([^")]+)"?\)/.exec(
        slot.querySelector<HTMLElement>(".tray__fit")?.style.getPropertyValue("--m") ?? "",
      )?.[1];
      if (!url) throw new Error(`Sticker ${slot.dataset.id} shows no cut mask`);
      const mask = new Image();
      mask.src = url;
      await mask.decode();
      const paint = document.createElement("canvas");
      paint.width = mask.naturalWidth;
      paint.height = mask.naturalHeight;
      const g = paint.getContext("2d");
      if (!g) throw new Error("No 2D canvas to read a mask with");
      g.drawImage(mask, 0, 0);
      const alpha = g.getImageData(0, 0, paint.width, paint.height).data;
      const det = ux.x * uy.y - uy.x * ux.y;
      /** Where page point `p` falls across this box, from 0 to 1, and how far inside its edges. */
      const local = (p: { x: number; y: number }) => {
        const [dx, dy] = [p.x - o.x, p.y - o.y];
        const u = (dx * uy.y - dy * uy.x) / det;
        const v = (ux.x * dy - ux.y * dx) / det;
        return { u, v, depth: Math.min(u * w, (1 - u) * w, v * h, (1 - v) * h) };
      };
      const inCut = (u: number, v: number) => {
        if (u < 0 || u >= 1 || v < 0 || v >= 1) return false;
        const x = Math.floor(u * paint.width);
        const y = Math.floor(v * paint.height);
        return alpha[(y * paint.width + x) * 4 + 3] >= 128;
      };
      const cutAround = (u: number, v: number) =>
        around.map(([du, dv]) => inCut(u + (du * margin) / w, v + (dv * margin) / h));
      return {
        no: /No\.\d+/.exec(slot.getAttribute("aria-label") ?? "")?.[0],
        page: (u: number, v: number) => ({
          x: o.x + u * ux.x + v * uy.x,
          y: o.y + u * ux.y + v * uy.y,
        }),
        local,
        wellInside: (u: number, v: number) => cutAround(u, v).every(Boolean),
        nearCut: (p: { x: number; y: number }) => {
          const { u, v } = local(p);
          return cutAround(u, v).some(Boolean);
        },
      };
    }
    // Later slots are drawn over earlier ones.
    const slots = [...el.querySelectorAll<HTMLElement>('.tray__slot[data-state="here"]')];
    const frames = await Promise.all(slots.map(frameOf));
    let best: { x: number; y: number; depth: number; lowerNo?: string; upperNo?: string } | null =
      null;
    const steps = 60;
    for (const [i, lower] of frames.entries())
      for (let a = 1; a < steps; a++)
        for (let b = 1; b < steps; b++) {
          if (!lower.wellInside(a / steps, b / steps)) continue;
          const p = lower.page(a / steps, b / steps);
          if (frames.some((other, j) => j !== i && other.nearCut(p))) continue;
          const over = frames.findLastIndex((other, j) => j > i && other.local(p).depth > margin);
          if (over < 0) continue;
          const depth = frames[over].local(p).depth;
          if (!best || depth > best.depth)
            best = { ...p, depth, lowerNo: lower.no, upperNo: frames[over].no };
        }
    if (!best) throw new Error("No sticker's box covers another's cut on the sheet");
    return best;
  });
}

test("a tray sticker's blank corner lets a tap reach the sticker under it", async ({ page }) => {
  await signIn(page, "tray-cut-selection", language);
  // Diagonal strokes leave two corners of each box blank: a sheet too narrow for three in a row packs
  // one onto the others, its box over their cuts.
  for (let i = 0; i < 3; i++) await sealIntoTray(page, language);
  const zipper = page.getByRole("button", {
    name: startsWith(say(stickerBoard.tray.zipper, language)),
  });
  await expect(zipper).toHaveAttribute("aria-expanded", "false");
  await zipper.press("ArrowDown");
  await expect(zipper).toHaveAttribute("aria-expanded", "true");
  const front = page.locator(".tray__stack .tray__sheet.is-top");
  await expect(front.locator('.tray__slot[data-state="here"]')).toHaveCount(3);
  await expect(front.locator(".tray__fit img")).toHaveCount(3);

  const { x, y, lowerNo, upperNo } = await inkUnderNeighbor(front);
  if (!lowerNo || !upperNo) throw new Error("A sticker on the sheet names no number");
  await page.touchscreen.tap(x, y);
  await expect(boardSticker(page, language, lowerNo)).toBeVisible();
  await expect(boardSticker(page, language, upperNo)).toHaveCount(0);
});
