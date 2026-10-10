import { GLINT_SVG, svgDataUrl } from "../../gratitude/heartArt";
import { SHEEN_LEAN_DEG } from "../../stickers/resinSheen";
import { clamp, clamp01, EASE_OUT, EASE_PEEL, EASE_PEEL_POINTS } from "../../ui/easing";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { blankCanvas } from "../canvas/context2d";
import type { Rect } from "../sealing/stickerPasses";
import "./layerFlash.css";

/** How long the band takes to cross the sheet, and how long the outline shows: an unverified guess. */
export const FLASH_MS = 240;
/** How long a glint pops and fades once the band has passed it: an unverified guess. */
export const GLINT_TAIL_MS = 500;

/** Sheet px per flash px: the flash is built at quarter scale. */
const SHRINK = 4;
/** The band's width, of the sheet's. */
const BAND = 0.36;
/** How brightly the band lights the ink. */
const SHEEN = 0.5;
/** The most glints a flash sparks. */
const MAX_GLINTS = 7;
/** How close two glints may be, of the sheet's short side, so a small drawing sparks fewer. */
const GLINT_GAP = 0.12;
/** CSS px a glint drifts off its edge as it fades. */
const GLINT_TRAVEL = 5;
/** Flash px the outline stands off the ink. */
const OUTLINE_PX = 1;
/** The alpha at which a flash px counts as ink, for finding its edge. */
const EDGE_ALPHA = 48;
/** The edge pixels glints are picked among, at most, so a long edge costs no more than a short one. */
const MAX_EDGE_PICKS = 2048;

const REDUCED = "(prefers-reduced-motion: reduce)";
/** DESIGN.md's Ink and the light, spelled out: a canvas can't read the tokens. */
const INK = "#1C1824";
const LIGHT = "#FFFFFF";
const GLINT_IMAGE = `url("${svgDataUrl(GLINT_SVG)}")`;
const LEAN = Math.tan((SHEEN_LEAN_DEG * Math.PI) / 180);

/** At quarter scale a bilinear draw reads two of each four sheet px; four draws offset by a quarter flash px read them all, so a hairline isn't lost. */
const SAMPLES = [-0.25, 0.25].flatMap((dx) => [-0.25, 0.25].map((dy) => [dx, dy] as const));
/** The eight neighbors: the ink drawn at each grows it a flash px all round. */
const AROUND = [-1, 0, 1].flatMap((dx) =>
  [-1, 0, 1].filter((dy) => dx !== 0 || dy !== 0).map((dy) => [dx, dy] as const),
);

type Bezier = readonly [number, number, number, number];

/** The time, 0 to 1, at which a cubic-bezier easing reaches `progress`. */
function timeAt([x1, y1, x2, y2]: Bezier, progress: number): number {
  const along = (a: number, b: number, u: number) =>
    3 * a * u * (1 - u) ** 2 + 3 * b * u * u * (1 - u) + u ** 3;
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (along(y1, y2, mid) < progress) lo = mid;
    else hi = mid;
  }
  return along(x1, x2, (lo + hi) / 2);
}

/**
 * The band leans about the sheet's middle row and travels across it, of the sheet's width: from wholly
 * off its left to wholly off its right, on every row. `aspect` is the sheet's height over its width.
 */
function sweepFor(aspect: number) {
  const reach = (LEAN * aspect) / 2;
  const from = -BAND - reach;
  const to = 1 + reach;
  /** When the band's middle passes a point given as fractions of the sheet, in ms. */
  const litAt = (fx: number, fy: number) => {
    const at = fx - BAND / 2 + LEAN * aspect * (fy - 0.5);
    return timeAt(EASE_PEEL_POINTS, clamp01((at - from) / (to - from))) * FLASH_MS;
  };
  return { from, to, litAt };
}

/** Where a glint sparks, flash px, and the way off the ink there. */
interface Spark {
  x: number;
  y: number;
  dx: number;
  dy: number;
}

/**
 * Up to MAX_GLINTS points on the ink's edge in `image`, read at (ox, oy), each at least `gap` flash px
 * from the rest: the first nearest the light, then each the farthest from those before it.
 */
function sparksOn(image: ImageData, ox: number, oy: number, gap: number): Spark[] {
  const { data, width, height } = image;
  const alpha = (x: number, y: number) =>
    x < 0 || y < 0 || x >= width || y >= height ? 0 : data[(y * width + x) * 4 + 3];
  const edge: number[] = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (alpha(x, y) < EDGE_ALPHA) continue;
      const out =
        alpha(x - 1, y) < EDGE_ALPHA ||
        alpha(x + 1, y) < EDGE_ALPHA ||
        alpha(x, y - 1) < EDGE_ALPHA ||
        alpha(x, y + 1) < EDGE_ALPHA;
      if (out) edge.push(x, y);
    }
  }
  if (edge.length === 0) return [];
  const step = 2 * Math.ceil(edge.length / 2 / MAX_EDGE_PICKS);
  const xs: number[] = [];
  const ys: number[] = [];
  for (let i = 0; i < edge.length; i += step) {
    xs.push(edge[i]);
    ys.push(edge[i + 1]);
  }
  let next = 0;
  for (let i = 1; i < xs.length; i++) if (xs[i] + ys[i] < xs[next] + ys[next]) next = i;
  const nearest = new Float64Array(xs.length).fill(Infinity);
  const picked: number[] = [];
  while (next >= 0 && picked.length < MAX_GLINTS) {
    picked.push(next);
    const [px, py] = [xs[next], ys[next]];
    next = -1;
    let farthest = gap * gap;
    for (let i = 0; i < xs.length; i++) {
      nearest[i] = Math.min(nearest[i], (xs[i] - px) ** 2 + (ys[i] - py) ** 2);
      if (nearest[i] >= farthest) {
        farthest = nearest[i];
        next = i;
      }
    }
  }
  return picked.map((i) => {
    const [x, y] = [xs[i], ys[i]];
    // Down the alpha's slope is off the ink; a lone pixel has none, so it drifts away from the light.
    const dx = alpha(x - 1, y) - alpha(x + 1, y);
    const dy = alpha(x, y - 1) - alpha(x, y + 1);
    const length = Math.hypot(dx, dy);
    return length > 0
      ? { x: x + ox, y: y + oy, dx: dx / length, dy: dy / length }
      : { x: x + ox, y: y + oy, dx: Math.SQRT1_2, dy: Math.SQRT1_2 };
  });
}

/** The ink's outline where `above` covers it, in Ink: the ink grown a flash px all round, less itself, cut to above's alpha. */
function coveredOutline(ink: HTMLCanvasElement, above: HTMLCanvasElement) {
  const made = blankCanvas(ink.width, ink.height);
  const { g } = made;
  for (const [dx, dy] of AROUND) g.drawImage(ink, dx * OUTLINE_PX, dy * OUTLINE_PX);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(ink, 0, 0);
  g.globalCompositeOperation = "destination-in";
  const { width, height } = above;
  g.drawImage(above, 0, 0, width, height, 0, 0, width / SHRINK, height / SHRINK);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = INK;
  g.fillRect(0, 0, ink.width, ink.height);
  return made;
}

export interface LayerFlash {
  /** Stops it at once, and lets go of everything it made. */
  readonly cancel: () => void;
}

export interface FlashParts {
  /** The layer's own canvas: sheet-sized, device px. */
  readonly layer: HTMLCanvasElement;
  /** Where the layer's ink reaches, device px. */
  readonly inked: Rect;
  /** The layers above it composited, sheet-sized; 0 × 0 while none shows ink. */
  readonly above: HTMLCanvasElement;
  /** Takes the band: over the layer's canvas, so the layer's opacity fades the light with its ink. */
  readonly current: HTMLElement;
  /** Takes the outline and the glints, after `above`, so both show over what covers the ink. */
  readonly sheet: HTMLElement;
  /** Told once the flash has played out; never after `cancel`. */
  readonly onEnd: () => void;
}

/**
 * Flashes a layer's ink in the one light: a band sweeps it from the top left, under the layers above,
 * a dashed Ink outline traces the ink they cover, and glints spark off its edges as the band passes,
 * covered ones too. Built at quarter scale from the layer's own canvas. Null when nothing plays: under
 * reduced motion, or when the layer shows no ink.
 */
export function flashLayer(parts: FlashParts): LayerFlash | null {
  if (window.matchMedia(REDUCED).matches) return null;
  const { layer, inked, above } = parts;
  const { width, height } = layer;
  const w = Math.ceil(width / SHRINK);
  const h = Math.ceil(height / SHRINK);
  const x0 = clamp(Math.floor(inked.x / SHRINK) - 1, 0, w);
  const y0 = clamp(Math.floor(inked.y / SHRINK) - 1, 0, h);
  const x1 = clamp(Math.ceil((inked.x + inked.w) / SHRINK) + 1, 0, w);
  const y1 = clamp(Math.ceil((inked.y + inked.h) / SHRINK) + 1, 0, h);
  if (x1 <= x0 || y1 <= y0) return null;

  const sheen = blankCanvas(w, h);
  for (const [dx, dy] of SAMPLES) {
    sheen.g.drawImage(layer, 0, 0, width, height, dx, dy, width / SHRINK, height / SHRINK);
  }
  const sparks = sparksOn(
    sheen.g.getImageData(x0, y0, x1 - x0, y1 - y0),
    x0,
    y0,
    GLINT_GAP * Math.min(w, h),
  );
  if (sparks.length === 0) {
    releaseCanvas(sheen.canvas);
    return null;
  }
  // Drawing from a 0 × 0 canvas throws; with nothing above, nothing covers the ink.
  const outline = above.width > 0 && above.height > 0 ? coveredOutline(sheen.canvas, above) : null;
  sheen.g.globalCompositeOperation = "source-in";
  sheen.g.fillStyle = LIGHT;
  sheen.g.fillRect(0, 0, w, h);

  const aspect = height / width;
  const sweep = sweepFor(aspect);
  const travel: KeyframeAnimationOptions = { duration: FLASH_MS, easing: EASE_PEEL };
  const animations: Animation[] = [];

  // The band is a strip of the sheet; the sheen inside it moves against it, so the light crosses the
  // ink while the ink holds still. Its translate is of its own width, the sheen's of the sheet's.
  const band = document.createElement("div");
  band.className = "layer-flash__band";
  band.setAttribute("aria-hidden", "true");
  band.style.width = `${BAND * 100}%`;
  sheen.canvas.className = "layer-flash__sheen";
  sheen.canvas.style.width = `${100 / BAND}%`;
  band.append(sheen.canvas);
  parts.current.append(band);
  const lean = `skewX(${-SHEEN_LEAN_DEG}deg)`;
  const unlean = `skewX(${SHEEN_LEAN_DEG}deg)`;
  animations.push(
    band.animate(
      [
        { transform: `translateX(${(sweep.from / BAND) * 100}%) ${lean}`, opacity: SHEEN },
        { transform: `translateX(${(sweep.to / BAND) * 100}%) ${lean}`, opacity: SHEEN },
      ],
      travel,
    ),
    sheen.canvas.animate(
      [
        { transform: `${unlean} translateX(${-sweep.from * 100}%)` },
        { transform: `${unlean} translateX(${-sweep.to * 100}%)` },
      ],
      travel,
    ),
  );

  if (outline) {
    outline.canvas.className = "ink-canvas layer-flash__outline";
    outline.canvas.setAttribute("aria-hidden", "true");
    parts.sheet.append(outline.canvas);
    animations.push(
      outline.canvas.animate(
        [{ opacity: 0 }, { opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }],
        { duration: FLASH_MS },
      ),
    );
  }

  const glints = document.createElement("div");
  glints.className = "layer-flash__glints";
  glints.setAttribute("aria-hidden", "true");
  for (const spark of sparks) {
    const glint = document.createElement("span");
    glint.className = "layer-flash__glint";
    const fx = ((spark.x + 0.5) * SHRINK) / width;
    const fy = ((spark.y + 0.5) * SHRINK) / height;
    glint.style.left = `${fx * 100}%`;
    glint.style.top = `${fy * 100}%`;
    glint.style.backgroundImage = GLINT_IMAGE;
    glints.append(glint);
    const [tx, ty] = [spark.dx * GLINT_TRAVEL, spark.dy * GLINT_TRAVEL];
    animations.push(
      glint.animate(
        [
          { transform: "translate(0, 0) scale(0) rotate(-40deg)", opacity: 1, easing: EASE_OUT },
          {
            transform: `translate(${tx * 0.4}px, ${ty * 0.4}px) scale(1) rotate(0deg)`,
            opacity: 1,
            offset: 0.3,
            easing: EASE_OUT,
          },
          { transform: `translate(${tx}px, ${ty}px) scale(0.4) rotate(30deg)`, opacity: 0 },
        ],
        { duration: GLINT_TAIL_MS, delay: sweep.litAt(fx, fy) },
      ),
    );
  }
  parts.sheet.append(glints);

  const letGo = () => {
    window.clearTimeout(end);
    for (const animation of animations) animation.cancel();
    band.remove();
    glints.remove();
    releaseCanvas(sheen.canvas);
    if (outline) {
      outline.canvas.remove();
      releaseCanvas(outline.canvas);
    }
  };
  // A glint starts as the band passes it, by FLASH_MS at the latest.
  const end = window.setTimeout(() => {
    letGo();
    parts.onEnd();
  }, FLASH_MS + GLINT_TAIL_MS);
  return { cancel: letGo };
}
