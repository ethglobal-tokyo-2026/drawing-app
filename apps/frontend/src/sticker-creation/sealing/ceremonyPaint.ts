import { releaseCanvas } from "../../ui/releaseCanvas";
import type { Box } from "./sealTimeline";

/** The paper's backing, and what its maker printed on it. */
const BACKING = "#E7E5EE";
const PRINT = "SEAL · シール · ";
const INK = "#1C1824";
/** Seal Yellow: the blade is the seal check's own "now". */
const SEAL = "#FFD93B";

type Size = { w: number; h: number };

/** A canvas's 2D context, or null after saying why: the ceremony plays on without that canvas. */
function paintable(canvas: HTMLCanvasElement, what: string) {
  const g = canvas.getContext("2d");
  if (!g) console.error(`No 2D context for the seal ceremony's ${what}; it plays without it`);
  return g;
}

/** Sizes a canvas that covers the ceremony, at `r` device pixels per pixel. */
function cover(canvas: HTMLCanvasElement, { w, h }: Size, r: number) {
  canvas.width = Math.round(w * r);
  canvas.height = Math.round(h * r);
}

/** The dim over the sheet: everything but the die-cut, at the sticker's place. */
export function paintDim(
  canvas: HTMLCanvasElement,
  size: Size,
  box: Box,
  mask: CanvasImageSource,
  r: number,
) {
  cover(canvas, size, r);
  const g = paintable(canvas, "dim");
  if (!g) return;
  g.setTransform(r, 0, 0, r, 0, 0);
  g.fillStyle = "rgba(28, 24, 36, 0.52)";
  g.fillRect(0, 0, size.w, size.h);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(mask, box.x, box.y, box.w, box.h);
  g.globalCompositeOperation = "source-over";
}

/** The used sticker silhouette: the backing liner, its maker's print, and the cut wall. */
export function paintUsedStickerSilhouette(
  canvas: HTMLCanvasElement,
  box: Box,
  mask: CanvasImageSource,
  r: number,
) {
  const W = Math.max(1, Math.round(box.w * r));
  const H = Math.max(1, Math.round(box.h * r));
  canvas.width = W;
  canvas.height = H;
  const g = paintable(canvas, "used sticker silhouette");
  if (!g) return;
  g.fillStyle = BACKING;
  g.fillRect(0, 0, W, H);
  // The maker's backing print, on a 30° diagonal.
  g.save();
  g.translate(W / 2, H / 2);
  g.rotate(-Math.PI / 6);
  g.fillStyle = "rgba(110, 104, 120, 0.36)";
  g.font = `700 ${Math.round(11 * r)}px "Croquis Sans", "Hiragino Sans", "Zen Kaku Gothic New", system-ui, sans-serif`;
  g.textBaseline = "middle";
  const unit = g.measureText(PRINT).width || 70 * r;
  const span = Math.hypot(W, H);
  const row = 21 * r;
  for (let k = 0, y = -span / 2; y < span / 2; y += row, k++)
    for (let x = -span / 2 - (k % 2 ? unit / 2 : 0); x < span / 2; x += unit)
      g.fillText(PRINT, x, y);
  g.restore();
  // The paper's thickness: a soft shadow along the cut wall nearest the light.
  const wall = document.createElement("canvas");
  wall.width = W;
  wall.height = H;
  const wg = paintable(wall, "cut wall");
  if (wg) {
    for (const [ox, oy, alpha] of [
      [1.4, 2.2, 0.22],
      [3.4, 5, 0.1],
    ]) {
      wg.globalCompositeOperation = "source-over";
      wg.clearRect(0, 0, W, H);
      wg.fillStyle = INK;
      wg.fillRect(0, 0, W, H);
      wg.globalCompositeOperation = "destination-out";
      wg.drawImage(mask, ox * r, oy * r, W, H);
      g.globalAlpha = alpha;
      g.drawImage(wall, 0, 0);
      g.globalAlpha = 1;
    }
  }
  releaseCanvas(wall);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(mask, 0, 0, W, H);
  g.globalCompositeOperation = "source-over";
}

/**
 * The cutter running round the finished cut: how far round it is (0–1), how much of its fresh cut
 * trails it yet (0–1), and how strongly it shows.
 */
export interface Cutter {
  at: number;
  trail: number;
  alpha: number;
}

/** The hairline's width, and the fresh cut's where it meets the blade. */
const LINE_WIDTH = 1.4;
const FRESH_WIDTH = 3.8;
/** How much fresh cut trails the blade: a share of the line, up to a length in px, in tapering steps. */
const FRESH_SHARE = 0.3;
const FRESH_MAX = 170;
const FRESH_STEPS = 10;
/** The blade's radius, in px. */
const BLADE = 5.4;

/**
 * The cut line, as a function that draws it as far round as the ceremony has got: an Ink hairline
 * led by a Seal Yellow dot, the blade, lifted off the paper by its shadow. Once the cut is made, the
 * blade can keep running round it, pass after pass, trailing a heavier stroke of fresh cut. It
 * redraws only when what it shows would change.
 */
export function makeCutLine(canvas: HTMLCanvasElement, size: Size, line: number[][], r: number) {
  cover(canvas, size, r);
  const g = paintable(canvas, "cut line");
  const lengths = [0];
  for (let i = 1; i < line.length; i++)
    lengths.push(
      lengths[i - 1] + Math.hypot(line[i][0] - line[i - 1][0], line[i][1] - line[i - 1][1]),
    );
  const total = lengths[lengths.length - 1] || 1;
  const fresh = Math.min(total * FRESH_SHARE, FRESH_MAX);

  /** The index of the segment `d` px along the line falls in, and the point there. */
  const pointAt = (d: number): [number, number, number] => {
    let lo = 1;
    let hi = line.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (lengths[mid] < d) lo = mid + 1;
      else hi = mid;
    }
    const u = (d - lengths[lo - 1]) / (lengths[lo] - lengths[lo - 1] || 1);
    const [ax, ay] = line[lo - 1];
    const [bx, by] = line[lo];
    return [lo, ax + (bx - ax) * u, ay + (by - ay) * u];
  };

  /** Adds the line from `a` to `b` px along it to the current path, `a` before `b`. */
  const trace = (a: number, b: number) => {
    const [from, ax, ay] = pointAt(a);
    const [to, bx, by] = pointAt(b);
    g?.moveTo(ax, ay);
    for (let i = from; i < to; i++) g?.lineTo(line[i][0], line[i][1]);
    g?.lineTo(bx, by);
  };

  const blade = (x: number, y: number) => {
    if (!g) return;
    g.fillStyle = SEAL;
    g.lineWidth = 1.5;
    g.beginPath();
    g.arc(x, y, BLADE, 0, Math.PI * 2);
    // Its shadow falls down and to the right, from the one light.
    g.shadowColor = "rgba(28, 24, 36, 0.32)";
    g.shadowOffsetX = r;
    g.shadowOffsetY = 1.6 * r;
    g.shadowBlur = 2 * r;
    g.fill();
    g.shadowColor = "transparent";
    g.stroke();
  };

  let shown = "";
  const draw = (progress: number, alpha: number, cutter: Cutter | null = null) => {
    const key = `${Math.round(progress * 400)} ${alpha} ${cutter ? `${Math.round(cutter.at * 4000)} ${cutter.trail} ${cutter.alpha}` : ""}`;
    if (!g || key === shown) return;
    shown = key;
    g.setTransform(r, 0, 0, r, 0, 0);
    g.clearRect(0, 0, size.w, size.h);
    if (progress <= 0 || alpha <= 0 || line.length < 2) return;
    g.globalAlpha = alpha;
    const reach = progress * total;
    g.lineWidth = LINE_WIDTH;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = INK;
    g.beginPath();
    g.moveTo(line[0][0], line[0][1]);
    let [hx, hy] = line[0];
    for (let i = 1; i < line.length; i++) {
      if (lengths[i] <= reach) {
        g.lineTo(line[i][0], line[i][1]);
        [hx, hy] = line[i];
        continue;
      }
      const u = (reach - lengths[i - 1]) / (lengths[i] - lengths[i - 1] || 1);
      hx = line[i - 1][0] + (line[i][0] - line[i - 1][0]) * u;
      hy = line[i - 1][1] + (line[i][1] - line[i - 1][1]) * u;
      g.lineTo(hx, hy);
      break;
    }
    g.stroke();
    if (progress < 1) blade(hx, hy);
    else if (cutter && cutter.alpha > 0) {
      // Another pass: the fresh cut thickens toward the blade, wrapping past the line's start.
      g.globalAlpha = alpha * cutter.alpha;
      const head = cutter.at * total;
      const trail = fresh * cutter.trail;
      const step = trail / FRESH_STEPS;
      for (let k = 0; k < FRESH_STEPS; k++) {
        const a = head - trail + k * step;
        const b = a + step;
        g.lineWidth = LINE_WIDTH + ((FRESH_WIDTH - LINE_WIDTH) * (k + 1)) / FRESH_STEPS;
        g.beginPath();
        if (a >= 0) trace(a, b);
        else if (b <= 0) trace(total + a, total + b);
        else {
          trace(total + a, total);
          trace(0, b);
        }
        g.stroke();
      }
      const [, bx, by] = pointAt(head);
      blade(bx, by);
    }
    g.globalAlpha = 1;
  };
  return { draw, length: total };
}
