import { GLINT_SVG, svgDataUrl } from "../../gratitude/heartArt";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { blankCanvas } from "../canvas/context2d";
import type { Rect } from "../sealing/stickerPasses";
import { glintGroup, pickInkEdges } from "./layerGlints";
import "./layerFlash.css";

export const FLASH_MS = 280;
/** Includes the last satellite's delay and a cleanup allowance. */
export const GLINT_TAIL_MS = 940;
const REDUCED = "(prefers-reduced-motion: reduce)";
const INK = "#1C1824";
const LIGHT = "#FFFFFF";
const AROUND = [-1, 0, 1].flatMap((dx) =>
  [-1, 0, 1].filter((dy) => dx || dy).map((dy) => [dx, dy] as const),
);
const glintImage = (pink: boolean) => {
  const art = pink ? GLINT_SVG.replace('fill="#fff"', 'fill="#ff4f9a"') : GLINT_SVG;
  const path = art.match(/<path[^>]+\/>/)?.[0];
  if (!path) throw new Error("The layer sparkle has no path");
  const undercut = path
    .replace(/stroke="[^"]+"/, 'stroke="#fff"')
    .replace('stroke-width="2.2"', 'stroke-width="5.2"');
  return 'url("' + svgDataUrl(art.replace(path, undercut + path)) + '")';
};
const GLINT_IMAGES = [glintImage(true), glintImage(false)];

/** Two edges outline selected ink only through the layers covering it. */
function coveredOutline(
  ink: HTMLCanvasElement,
  above: HTMLCanvasElement,
  edge: number,
  full: boolean,
  allocate: typeof blankCanvas,
) {
  const made = allocate(ink.width, ink.height);
  const inner = allocate(ink.width, ink.height);
  for (const [dx, dy] of AROUND) {
    made.g.drawImage(ink, dx * edge * 2, dy * edge * 2);
    inner.g.drawImage(ink, dx * edge, dy * edge);
  }
  for (const [part, color] of [
    [made, LIGHT],
    [inner, INK],
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
  if (full) {
    // A filled sheet has no exterior contour inside its crop. An inset rule shows its extent.
    g.globalCompositeOperation = "source-over";
    const inset = edge * 5;
    for (const [offset, color] of [
      [0, LIGHT],
      [edge, INK],
    ] as const) {
      const at = inset + offset;
      g.fillStyle = color;
      g.fillRect(at, at, ink.width - at * 2, edge);
      g.fillRect(at, ink.height - at - edge, ink.width - at * 2, edge);
      g.fillRect(at, at, edge, ink.height - at * 2);
      g.fillRect(ink.width - at - edge, at, edge, ink.height - at * 2);
    }
  }
  g.globalCompositeOperation = "destination-in";
  g.drawImage(above, 0, 0, above.width, above.height, 0, 0, ink.width, ink.height);
  return made;
}

export interface LayerFlash {
  readonly cancel: () => void;
}
export interface FlashParts {
  /** Effective selected ink, already clipped to its base. Borrowed, never changed. */
  readonly layer: HTMLCanvasElement;
  readonly inked: Rect;
  readonly below: HTMLCanvasElement;
  readonly above: HTMLCanvasElement;
  /** Selected opacity multiplied by the clipping base opacity, from 0 to 100. */
  readonly opacity: number;
  readonly sheet: HTMLElement;
  readonly onEnd: () => void;
}

/** Contrast and local ink sparkle groups, prepared once and animated by the browser. */
export function flashLayer(parts: FlashParts): LayerFlash | null {
  const media = window.matchMedia(REDUCED);
  const { layer, inked, above, below, opacity } = parts;
  if (
    document.hidden ||
    opacity <= 0 ||
    !layer.width ||
    !layer.height ||
    inked.w <= 0 ||
    inked.h <= 0
  )
    return null;
  const reduced = media.matches;
  const bounds = parts.sheet.getBoundingClientRect();
  const cssWidth = bounds.width || layer.width;
  const cssHeight = bounds.height || layer.height;
  // Feedback has its own bounded raster; the artwork always retains its original resolution.
  const scale = Math.min(
    1,
    cssWidth / layer.width,
    Math.sqrt(600_000 / (layer.width * layer.height)),
  );
  const width = Math.max(1, Math.ceil(layer.width * scale));
  const height = Math.max(1, Math.ceil(layer.height * scale));
  const canvases: HTMLCanvasElement[] = [];
  const animations: Animation[] = [];
  let glints: HTMLDivElement | null = null;
  let end = 0;
  let ended = false;
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
    const source = allocate(width, height, { willReadFrequently: true });
    // Each bilinear pass reads every source pixel. A single 3:1 reduction can skip a hairline.
    let reading = layer;
    while (reading.width > width * 2 || reading.height > height * 2) {
      const smaller = allocate(
        Math.max(width, Math.ceil(reading.width / 2)),
        Math.max(height, Math.ceil(reading.height / 2)),
      );
      smaller.g.drawImage(
        reading,
        0,
        0,
        reading.width,
        reading.height,
        0,
        0,
        smaller.canvas.width,
        smaller.canvas.height,
      );
      if (reading !== layer) releaseCanvas(reading);
      reading = smaller.canvas;
    }
    source.g.drawImage(reading, 0, 0, reading.width, reading.height, 0, 0, width, height);
    if (reading !== layer) releaseCanvas(reading);
    const ink = source.g.getImageData(0, 0, width, height);
    // Keep the original alpha raster until all particle sizing and motion are prepared.
    const sparks = reduced
      ? []
      : pickInkEdges(ink.data, width, height, width / cssWidth, height / cssHeight).flatMap(
          (spark, group) => glintGroup(spark, group, cssWidth, cssHeight),
        );
    // Opaque silhouette subtraction prevents a covered translucent fill from flashing throughout.
    let inkPixels = 0;
    for (let i = 3; i < ink.data.length; i += 4)
      if (ink.data[i]) {
        ink.data[i] = 255;
        inkPixels++;
      }
    if (!inkPixels) {
      letGo();
      return null;
    }
    const silhouette = allocate(width, height);
    silhouette.g.putImageData(ink, 0, 0);
    const outline =
      above.width && above.height
        ? coveredOutline(
            silhouette.canvas,
            above,
            (width / cssWidth) * 1.25,
            inkPixels === width * height,
            allocate,
          )
        : null;
    releaseCanvas(silhouette.canvas);

    // Choose contrast from what is actually visible, including the lower ink and effective opacity.
    const sampled = allocate(Math.ceil(width / 4), Math.ceil(height / 4), {
      willReadFrequently: true,
    });
    const sw = sampled.canvas.width,
      sh = sampled.canvas.height;
    if (below.width && below.height)
      sampled.g.drawImage(below, 0, 0, below.width, below.height, 0, 0, sw, sh);
    sampled.g.globalAlpha = opacity / 100;
    sampled.g.drawImage(layer, 0, 0, layer.width, layer.height, 0, 0, sw, sh);
    sampled.g.globalAlpha = 1;
    if (above.width && above.height)
      sampled.g.drawImage(above, 0, 0, above.width, above.height, 0, 0, sw, sh);
    const visible = sampled.g.getImageData(0, 0, sw, sh);
    for (let i = 0; i < visible.data.length; i += 4) {
      const alpha = visible.data[i + 3] / 255;
      const luminance =
        visible.data[i] * 0.2126 + visible.data[i + 1] * 0.7152 + visible.data[i + 2] * 0.0722;
      const light = luminance * alpha + 255 * (1 - alpha) < 150;
      visible.data[i] = light ? 255 : 28;
      visible.data[i + 1] = light ? 255 : 24;
      visible.data[i + 2] = light ? 255 : 36;
      visible.data[i + 3] = 255;
    }
    sampled.g.putImageData(visible, 0, 0);
    const pulse = allocate(width, height);
    pulse.g.drawImage(sampled.canvas, 0, 0, sw, sh, 0, 0, width, height);
    pulse.g.globalCompositeOperation = "destination-in";
    pulse.g.drawImage(source.canvas, 0, 0);
    if (above.width && above.height) {
      pulse.g.globalCompositeOperation = "destination-out";
      pulse.g.drawImage(above, 0, 0, above.width, above.height, 0, 0, width, height);
    }
    releaseCanvas(source.canvas);
    releaseCanvas(sampled.canvas);
    const cue = (canvas: HTMLCanvasElement, name: string, peak: number) => {
      canvas.className = `ink-canvas layer-flash__${name}`;
      canvas.setAttribute("aria-hidden", "true");
      parts.sheet.append(canvas);
      if (reduced) canvas.style.opacity = `${peak}`;
      else
        animations.push(
          canvas.animate(
            [
              { opacity: 0 },
              { opacity: peak, offset: 0.2 },
              { opacity: peak, offset: 0.55 },
              { opacity: 0 },
            ],
            { duration: FLASH_MS },
          ),
        );
    };
    cue(pulse.canvas, "pulse", 0.58);
    if (outline) cue(outline.canvas, "outline", 0.95);
    if (!reduced) {
      glints = document.createElement("div");
      glints.className = "layer-flash__glints";
      glints.setAttribute("aria-hidden", "true");
      const groupHost = glints;
      for (const path of sparks) {
        const glint = document.createElement("span");
        glint.className = "layer-flash__glint";
        glint.style.left = `${(path.x / cssWidth) * 100}%`;
        glint.style.top = `${(path.y / cssHeight) * 100}%`;
        glint.style.width = glint.style.height = `${path.size}px`;
        glint.style.margin = `${-path.size / 2}px 0 0 ${-path.size / 2}px`;
        glint.style.backgroundImage = GLINT_IMAGES[path.pink ? 0 : 1];
        groupHost.append(glint);
        animations.push(
          glint.animate(path.frames, {
            duration: path.duration,
            delay: path.delay,
            fill: "both",
          }),
        );
      }
      parts.sheet.append(glints);
    }
    end = window.setTimeout(
      () => {
        letGo();
        parts.onEnd();
      },
      reduced ? FLASH_MS : GLINT_TAIL_MS,
    );
    media.addEventListener("change", letGo);
    document.addEventListener("visibilitychange", onVisibility);
    return { cancel: letGo };
  } catch (error) {
    letGo();
    throw error;
  }
}
