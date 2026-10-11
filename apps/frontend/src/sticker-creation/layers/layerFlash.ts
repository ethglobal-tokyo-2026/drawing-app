import { GLINT_SVG, svgDataUrl } from "../../gratitude/heartArt";
import { clamp, EASE_OUT } from "../../ui/easing";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { blankCanvas } from "../canvas/context2d";
import type { Rect } from "../sealing/stickerPasses";
import "./layerFlash.css";

/** The stationary ink cue, including its readable peak. */
export const FLASH_MS = 280;
/** The glints finish falling within half a second of selection. */
export const GLINT_TAIL_MS = 480;

/** Sheet px per sampled px: color and edge sampling stay at quarter scale. */
const SHRINK = 4;
const MAX_GLINTS = 7;
/** Distance between glints, of the sheet's short side. */
const GLINT_GAP = 0.12;
/** CSS px a glint falls after it has popped. */
const GLINT_TRAVEL = 14;
/** The alpha at which a flash px counts as ink, for finding its edge. */
const EDGE_ALPHA = 48;
/** The edge pixels glints are picked among, at most, so a long edge costs no more than a short one. */
const MAX_EDGE_PICKS = 2048;

const REDUCED = "(prefers-reduced-motion: reduce)";
/** DESIGN.md's Ink and the light, spelled out: a canvas can't read the tokens. */
const INK = "#1C1824";
const LIGHT = "#FFFFFF";
const GLINT_IMAGE = `url("${svgDataUrl(GLINT_SVG)}")`;

/** At quarter scale a bilinear draw reads two of each four sheet px; four draws offset by a quarter flash px read them all, so a hairline isn't lost. */
const SAMPLES = [-0.25, 0.25].flatMap((dx) => [-0.25, 0.25].map((dy) => [dx, dy] as const));
/** The eight neighbors used to grow the covered ink contour. */
const AROUND = [-1, 0, 1].flatMap((dx) =>
  [-1, 0, 1].filter((dy) => dx !== 0 || dy !== 0).map((dy) => [dx, dy] as const),
);

/** Where a glint sparks, in flash px. */
interface Spark {
  x: number;
  y: number;
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
  return picked.map((i) => ({ x: xs[i] + ox, y: ys[i] + oy }));
}

/** Two contrasting edges keep covered selected ink identifiable over either light or dark ink. */
function coveredOutline(
  ink: HTMLCanvasElement,
  above: HTMLCanvasElement,
  edge: number,
  allocate: typeof blankCanvas,
) {
  const made = allocate(ink.width, ink.height);
  const inner = allocate(ink.width, ink.height);
  for (const [dx, dy] of AROUND) {
    made.g.drawImage(ink, dx * edge * 2, dy * edge * 2);
    inner.g.drawImage(ink, dx * edge, dy * edge);
  }
  for (const [part, color] of [
    [made, INK],
    [inner, LIGHT],
  ] as const) {
    part.g.globalCompositeOperation = "source-in";
    part.g.fillStyle = color;
    part.g.fillRect(0, 0, ink.width, ink.height);
  }
  const { g } = made;
  g.globalCompositeOperation = "source-over";
  g.drawImage(inner.canvas, 0, 0);
  releaseCanvas(inner.canvas);
  g.globalCompositeOperation = "destination-out";
  g.drawImage(ink, 0, 0);
  g.globalCompositeOperation = "destination-in";
  g.drawImage(above, 0, 0);
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
  /** Takes the pulse: over the layer's canvas, so the layer's opacity fades the light with its ink. */
  readonly current: HTMLElement;
  /** Takes the covered outline and glints, after `above`, so both show over what covers the ink. */
  readonly sheet: HTMLElement;
  /** Told once the flash has played out; never after `cancel`. */
  readonly onEnd: () => void;
}

/** A stationary contrast pulse and a few falling glints, sampled once from effective selected ink. */
export function flashLayer(parts: FlashParts): LayerFlash | null {
  const media = window.matchMedia(REDUCED);
  if (document.hidden) return null;
  const reduced = media.matches;
  const { layer, inked, above } = parts;
  const { width, height } = layer;
  const w = Math.ceil(width / SHRINK);
  const h = Math.ceil(height / SHRINK);
  const x0 = clamp(Math.floor(inked.x / SHRINK) - 1, 0, w);
  const y0 = clamp(Math.floor(inked.y / SHRINK) - 1, 0, h);
  const x1 = clamp(Math.ceil((inked.x + inked.w) / SHRINK) + 1, 0, w);
  const y1 = clamp(Math.ceil((inked.y + inked.h) / SHRINK) + 1, 0, h);
  if (x1 <= x0 || y1 <= y0) return null;

  const canvases: HTMLCanvasElement[] = [];
  const animations: Animation[] = [];
  let glints: HTMLDivElement | null = null;
  let end = 0;
  let ended = false;
  // Ownership starts at allocation, including temporaries used while constructing the contour.
  const allocate: typeof blankCanvas = (...args) => {
    const made = blankCanvas(...args);
    canvases.push(made.canvas);
    return made;
  };
  const letGo = () => {
    if (ended) return;
    ended = true;
    window.clearTimeout(end);
    media.removeEventListener("change", letGo);
    document.removeEventListener("visibilitychange", onVisibility);
    for (const animation of animations) animation.cancel();
    animations.length = 0;
    glints?.remove();
    glints = null;
    for (const canvas of canvases) {
      canvas.remove();
      releaseCanvas(canvas);
    }
    canvases.length = 0;
  };
  const onVisibility = () => {
    if (document.hidden) letGo();
  };

  try {
    const sampled = allocate(w, h);
    for (const [dx, dy] of SAMPLES) {
      sampled.g.drawImage(layer, 0, 0, width, height, dx, dy, width / SHRINK, height / SHRINK);
    }
    const image = sampled.g.getImageData(x0, y0, x1 - x0, y1 - y0);
    const sparks = sparksOn(image, x0, y0, GLINT_GAP * Math.min(w, h));
    if (sparks.length === 0) {
      letGo();
      return null;
    }
    // Drawing from a 0 × 0 canvas throws; with nothing above, nothing covers the ink.
    const shownWidth = parts.sheet.getBoundingClientRect().width;
    const edge = shownWidth > 0 ? width / shownWidth : SHRINK;
    const outline =
      above.width > 0 && above.height > 0 ? coveredOutline(layer, above, edge, allocate) : null;
    // Contrast is chosen once per sampled pixel; alpha still follows the selected ink.
    for (let i = 0; i < image.data.length; i += 4) {
      const alpha = image.data[i + 3] / 255;
      const luminance =
        0.2126 * image.data[i] + 0.7152 * image.data[i + 1] + 0.0722 * image.data[i + 2];
      const light = luminance * alpha + 255 * (1 - alpha) < 150;
      image.data[i] = light ? 255 : 28;
      image.data[i + 1] = light ? 255 : 24;
      image.data[i + 2] = light ? 255 : 36;
      image.data[i + 3] = 255;
    }
    sampled.g.clearRect(0, 0, w, h);
    sampled.g.putImageData(image, x0, y0);
    // Only color choice is sampled. The full-resolution ink supplies the exact edge and alpha.
    const pulse = allocate(width, height);
    pulse.g.drawImage(sampled.canvas, 0, 0, w, h, 0, 0, width, height);
    pulse.g.globalCompositeOperation = "destination-in";
    pulse.g.drawImage(layer, 0, 0);
    releaseCanvas(sampled.canvas);
    const cue = (canvas: HTMLCanvasElement, host: HTMLElement, name: string) => {
      canvas.className = `ink-canvas layer-flash__${name}`;
      canvas.setAttribute("aria-hidden", "true");
      host.append(canvas);
      if (reduced) canvas.style.opacity = "0.8";
      else
        animations.push(
          canvas.animate(
            [
              { opacity: 0 },
              { opacity: 0.8, offset: 0.2 },
              { opacity: 0.8, offset: 0.6 },
              { opacity: 0 },
            ],
            { duration: FLASH_MS },
          ),
        );
    };
    cue(pulse.canvas, parts.current, "pulse");
    if (outline) cue(outline.canvas, parts.sheet, "outline");

    glints = reduced ? null : document.createElement("div");
    if (glints) {
      glints.className = "layer-flash__glints";
      glints.setAttribute("aria-hidden", "true");
      for (const spark of sparks) {
        const glint = document.createElement("span");
        glint.className = "layer-flash__glint";
        glint.style.left = `${(((spark.x + 0.5) * SHRINK) / width) * 100}%`;
        glint.style.top = `${(((spark.y + 0.5) * SHRINK) / height) * 100}%`;
        glint.style.backgroundImage = GLINT_IMAGE;
        glints.append(glint);
        animations.push(
          glint.animate(
            [
              { transform: "translateY(0) scale(0)", opacity: 0, easing: EASE_OUT },
              { transform: "translateY(0) scale(1)", opacity: 1, offset: 0.22 },
              {
                transform: `translateY(${GLINT_TRAVEL * 0.65}px) scale(0.9)`,
                opacity: 1,
                offset: 0.78,
              },
              { transform: `translateY(${GLINT_TRAVEL}px) scale(0.65)`, opacity: 0 },
            ],
            { duration: GLINT_TAIL_MS },
          ),
        );
      }
      parts.sheet.append(glints);
    }

    end = window.setTimeout(
      () => {
        letGo();
        parts.onEnd();
      },
      reduced ? 300 : GLINT_TAIL_MS,
    );
    media.addEventListener("change", letGo);
    document.addEventListener("visibilitychange", onVisibility);
    return { cancel: letGo };
  } catch (error) {
    letGo();
    throw error;
  }
}
