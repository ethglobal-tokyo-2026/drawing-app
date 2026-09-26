import { FEEL_CONFIG } from "./gameConfig";
import { miniHeartSvg, stampHeartSvg, svgDataUrl } from "./heartArt";
import type { MiniHeart } from "./miniHeartPhysics";

export interface MiniHeartLayer {
  draw: (hearts: readonly MiniHeart[]) => void;
  clear: () => void;
}

const MINI = FEEL_CONFIG.miniHearts;
/** The largest a heart is drawn, in px: a thrown or sweated mini heart, and 昇天's rain (22–34px). */
const MINI_PX = Math.max(MINI.sizes[1], MINI.sweatSizes[1]);
const RAIN_PX = 34;
/** Device pixels per px at most: hearts this small show no more detail past 2. */
const MAX_DPR = 2;
const DEG = Math.PI / 180;

/** Each tone's heart, then the rain stamp, as SVG at a size in px. */
const ART: readonly { svg: (px: number) => string; px: number }[] = [
  ...MINI.tones.map((tone) => ({ svg: (px: number) => miniHeartSvg(tone, px), px: MINI_PX })),
  { svg: (px: number) => stampHeartSvg(px), px: RAIN_PX },
];
const RAIN_ART = ART.length - 1;

/** The art drawn once per pixel ratio into small canvases, which each frame copies from. */
const baked = new Map<number, (HTMLCanvasElement | null)[]>();
/** Art finished baking so far: a layer drawn before its art arrived draws again. */
let bakes = 0;

/** The art at `dpr`, each null until its image loads. */
function artAt(dpr: number): (HTMLCanvasElement | null)[] {
  const known = baked.get(dpr);
  if (known) return known;
  const art: (HTMLCanvasElement | null)[] = ART.map(() => null);
  baked.set(dpr, art);
  ART.forEach(({ svg, px }, i) => {
    const size = Math.ceil(px * dpr);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, size, size);
      art[i] = canvas;
      bakes++;
    };
    img.src = svgDataUrl(svg(size));
  });
  return art;
}

/** One canvas over a layer, and what it last showed. */
interface Surface {
  kind: MiniHeart["kind"];
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
  /** Device pixels per px, and the canvas's size in px: 0 until it's measured. */
  dpr: number;
  width: number;
  height: number;
  /** Each heart drawn as id, x, y, rotation, scale and opacity in turn, to the precision that shows. */
  shown: number[];
  next: number[];
  /** Art finished baking when it last drew. */
  bakesSeen: number;
}

function surface(layer: HTMLElement, kind: MiniHeart["kind"]): Surface {
  const canvas = document.createElement("canvas");
  canvas.className = "gr-minis";
  canvas.setAttribute("aria-hidden", "true");
  layer.append(canvas);
  return {
    kind,
    canvas,
    ctx: canvas.getContext("2d"),
    dpr: 1,
    width: 0,
    height: 0,
    shown: [],
    next: [],
    bakesSeen: -1,
  };
}

function resize(s: Surface, width: number, height: number) {
  s.dpr = Math.min(MAX_DPR, window.devicePixelRatio || 1);
  s.width = width;
  s.height = height;
  // Resizing a canvas empties it.
  s.canvas.width = Math.round(width * s.dpr);
  s.canvas.height = Math.round(height * s.dpr);
}

/**
 * Draws the surface's hearts afresh, in the physics' order, so the newest is on top: at `scale`, as
 * the physics moves them in the live game's px.
 */
function paint(s: Surface, hearts: readonly MiniHeart[], scale: number) {
  const { ctx } = s;
  const dpr = s.dpr * scale;
  if (!ctx) return;
  s.bakesSeen = bakes;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, s.canvas.width, s.canvas.height);
  if (s.width === 0) return;
  const art = artAt(dpr);
  for (const heart of hearts) {
    if (heart.kind !== s.kind) continue;
    const image = art[heart.kind === "rain" ? RAIN_ART : heart.tone];
    if (!image) continue;
    const k = heart.scale * dpr;
    const cos = Math.cos(heart.rotation * DEG) * k;
    const sin = Math.sin(heart.rotation * DEG) * k;
    // Turned and scaled about its middle, as the heart's CSS transform was.
    ctx.setTransform(cos, sin, -sin, cos, heart.x * dpr, heart.y * dpr);
    ctx.globalAlpha = heart.opacity;
    ctx.drawImage(image, -heart.size / 2, -heart.size / 2, heart.size, heart.size);
  }
}

/**
 * Draws the physics' hearts on two canvases: 昇天's rain on one behind the big heart, the rest on
 * one in front of it. Each canvas is sized when its layer resizes, never by reading layout per frame.
 * `scale`: the stage's size over the live game's, whose px the physics moves the hearts in.
 */
export function createMiniHeartLayer(
  layers: { front: HTMLElement; behind: HTMLElement },
  scale = 1,
): MiniHeartLayer {
  const surfaces = [surface(layers.front, "mini"), surface(layers.behind, "rain")];
  let latest: readonly MiniHeart[] = [];

  if (typeof ResizeObserver === "function") {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const s = surfaces.find((x) => x.canvas === entry.target);
        if (!s) continue;
        if (!s.canvas.isConnected) {
          observer.disconnect();
          return;
        }
        resize(s, entry.contentRect.width, entry.contentRect.height);
        paint(s, latest, scale);
      }
    });
    for (const s of surfaces) observer.observe(s.canvas);
  } else {
    for (const s of surfaces) resize(s, s.canvas.clientWidth, s.canvas.clientHeight);
  }

  return {
    draw: (hearts) => {
      latest = hearts;
      for (const s of surfaces) s.next.length = 0;
      for (const heart of hearts) {
        const s = heart.kind === "rain" ? surfaces[1] : surfaces[0];
        s.next.push(
          heart.id,
          Math.round(heart.x * 10),
          Math.round(heart.y * 10),
          Math.round(heart.rotation * 10),
          Math.round(heart.scale * 1000),
          Math.round(heart.opacity * 1000),
        );
      }
      for (const s of surfaces) {
        // A settled pile keeps still, so most frames draw nothing.
        const same =
          s.bakesSeen === bakes &&
          s.next.length === s.shown.length &&
          s.next.every((value, i) => value === s.shown[i]);
        if (same) continue;
        [s.shown, s.next] = [s.next, s.shown];
        paint(s, hearts, scale);
      }
    },
    clear: () => {
      latest = [];
      for (const s of surfaces) {
        s.shown.length = 0;
        paint(s, latest, scale);
      }
    },
  };
}
