import { blankCanvas, context2d } from "../canvas/context2d";
import { lerp } from "../../ui/easing";
import { releaseCanvas } from "../../ui/releaseCanvas";
import type { Rect } from "./stickerPasses";

/** The paper's backing. */
const BACKING = "#E7E5EE";
/** Its maker's print: a pattern on the paper, bilingual on purpose, not copy for the catalog. */
const PRINT = "SEAL · シール · ";
const INK = "#1C1824";
/** Seal Yellow: the blade is the seal check's own "now". */
const SEAL = "#FFD93B";

/** What `make` gives, or null after saying why: the ceremony plays on without that canvas. */
function paintable<T>(make: () => T, what: string): T | null {
  try {
    return make();
  } catch (error) {
    console.error(`No 2D context for the seal ceremony's ${what}; it plays without it`, error);
    return null;
  }
}

/** One of the sticker's passes, on a canvas of its own size that CSS lays over the sticker's box. */
export function paintPass(canvas: HTMLCanvasElement, pass: ImageBitmap, what: string) {
  const g = paintable(() => context2d(canvas), what);
  if (!g) return;
  canvas.width = pass.width;
  canvas.height = pass.height;
  g.drawImage(pass, 0, 0);
}

/** The used sticker silhouette: the backing liner, its maker's print, and the cut wall. */
export function paintUsedStickerSilhouette(
  canvas: HTMLCanvasElement,
  box: Rect,
  mask: CanvasImageSource,
  r: number,
) {
  const W = Math.max(1, Math.round(box.w * r));
  const H = Math.max(1, Math.round(box.h * r));
  canvas.width = W;
  canvas.height = H;
  const g = paintable(() => context2d(canvas), "used sticker silhouette");
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
  const wall = paintable(() => blankCanvas(W, H), "cut wall");
  if (wall) {
    const { canvas: wallCanvas, g: wg } = wall;
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
      g.drawImage(wallCanvas, 0, 0);
      g.globalAlpha = 1;
    }
    releaseCanvas(wallCanvas);
  }
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
/** How far past the sticker's box the blade, its outline and its shadow can reach, in px. */
const BLADE_REACH = 12;

/**
 * Sizes `canvas` to the sticker's box with room for the blade, on whole canvas pixels so its own lie
 * on the same grid as a canvas over the whole ceremony would, and returns its 2D context drawing in
 * the ceremony's pixels.
 */
function overBox(canvas: HTMLCanvasElement, box: Rect, r: number, what: string) {
  const x0 = Math.floor((box.x - BLADE_REACH) * r);
  const y0 = Math.floor((box.y - BLADE_REACH) * r);
  const x1 = Math.ceil((box.x + box.w + BLADE_REACH) * r);
  const y1 = Math.ceil((box.y + box.h + BLADE_REACH) * r);
  canvas.width = x1 - x0;
  canvas.height = y1 - y0;
  Object.assign(canvas.style, {
    left: `${x0 / r}px`,
    top: `${y0 / r}px`,
    width: `${(x1 - x0) / r}px`,
    height: `${(y1 - y0) / r}px`,
  });
  const g = paintable(() => context2d(canvas), what);
  g?.setTransform(r, 0, 0, r, -x0, -y0);
  const clear = () => {
    if (!g) return;
    g.save();
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, canvas.width, canvas.height);
    g.restore();
  };
  return g && { g, clear };
}

/**
 * The cut line, as a function that draws it as far round as the ceremony has got: an Ink hairline
 * led by a Seal Yellow dot, the blade, lifted off the paper by its shadow. Once the cut is made, the
 * blade can keep running round it, pass after pass, trailing a heavier stroke of fresh cut. The
 * hairline and the blade each have a canvas over the sticker's box, so while the blade runs round
 * the finished cut, only the blade and its fresh cut are drawn again.
 */
export function makeCutLine(
  hairline: HTMLCanvasElement,
  blade: HTMLCanvasElement,
  box: Rect,
  line: number[][],
  r: number,
) {
  const lineCanvas = overBox(hairline, box, r, "cut line");
  const bladeCanvas = overBox(blade, box, r, "cutter");
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
    return [lo, lerp(ax, bx, u), lerp(ay, by, u)];
  };

  /** Adds the line from `a` to `b` px along it to `g`'s path, `a` before `b`. */
  const trace = (g: CanvasRenderingContext2D, a: number, b: number) => {
    const [from, ax, ay] = pointAt(a);
    const [to, bx, by] = pointAt(b);
    g.moveTo(ax, ay);
    for (let i = from; i < to; i++) g.lineTo(line[i][0], line[i][1]);
    g.lineTo(bx, by);
  };

  /** The whole hairline, made once the cut is: from then on it's stroked as it is. */
  let whole: Path2D | null = null;
  const wholeLine = () => {
    if (whole) return whole;
    whole = new Path2D();
    whole.moveTo(line[0][0], line[0][1]);
    for (let i = 1; i < line.length; i++) whole.lineTo(line[i][0], line[i][1]);
    return whole;
  };

  const drawBlade = (g: CanvasRenderingContext2D, x: number, y: number) => {
    g.fillStyle = SEAL;
    g.strokeStyle = INK;
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

  const stroking = (g: CanvasRenderingContext2D, alpha: number) => {
    g.globalAlpha = alpha;
    g.lineCap = "round";
    g.lineJoin = "round";
    g.strokeStyle = INK;
  };

  let lineShown = "";
  let bladeShown = "";
  const draw = (progress: number, alpha: number, cutter: Cutter | null = null) => {
    const drawn = progress > 0 && alpha > 0 && line.length >= 2;
    const reach = progress * total;
    // The hairline changes only while the cut runs, or as it fades.
    const lineKey = drawn ? `${Math.round(progress * 400)} ${alpha}` : "";
    if (lineCanvas && lineKey !== lineShown) {
      lineShown = lineKey;
      const { g, clear } = lineCanvas;
      clear();
      if (drawn) {
        stroking(g, alpha);
        g.lineWidth = LINE_WIDTH;
        if (progress < 1) {
          g.beginPath();
          trace(g, 0, reach);
          g.stroke();
        } else g.stroke(wholeLine());
        g.globalAlpha = 1;
      }
    }
    const running = progress >= 1 && cutter !== null && cutter.alpha > 0;
    const bladeKey = !drawn
      ? ""
      : progress < 1
        ? lineKey
        : running
          ? `${Math.round(cutter.at * 4000)} ${cutter.trail} ${cutter.alpha} ${alpha}`
          : "";
    if (!bladeCanvas || bladeKey === bladeShown) return;
    bladeShown = bladeKey;
    const { g, clear } = bladeCanvas;
    clear();
    if (!bladeKey) return;
    if (progress < 1) {
      stroking(g, alpha);
      const [, hx, hy] = pointAt(reach);
      drawBlade(g, hx, hy);
    } else if (running) {
      // Another pass: the fresh cut thickens toward the blade, wrapping past the line's start.
      stroking(g, alpha * cutter.alpha);
      const head = cutter.at * total;
      const trail = fresh * cutter.trail;
      const step = trail / FRESH_STEPS;
      for (let k = 0; k < FRESH_STEPS; k++) {
        const a = head - trail + k * step;
        const b = a + step;
        g.lineWidth = LINE_WIDTH + ((FRESH_WIDTH - LINE_WIDTH) * (k + 1)) / FRESH_STEPS;
        g.beginPath();
        if (a >= 0) trace(g, a, b);
        else if (b <= 0) trace(g, total + a, total + b);
        else {
          trace(g, total + a, total);
          trace(g, 0, b);
        }
        g.stroke();
      }
      const [, bx, by] = pointAt(head);
      drawBlade(g, bx, by);
    }
    g.globalAlpha = 1;
  };
  return { draw, length: total };
}
