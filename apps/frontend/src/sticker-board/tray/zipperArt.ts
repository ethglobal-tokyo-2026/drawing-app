/**
 * The Zipper's artwork: the molded slider and its pull, drawn as SVG, and the chain (tapes, teeth,
 * stops and the lining between the rows), painted on canvases. Each part of the chain is painted once
 * into a sprite, from the colors zipper.css gives it, and a frame of motion only draws the sprites
 * where they go: a few canvases change, not hundreds of styled boxes.
 */
import { context2d } from "../../sticker-creation/canvas/context2d";
import { releaseCanvas } from "../../ui/releaseCanvas";

const SVG_NS = "http://www.w3.org/2000/svg";

function svg(
  doc: Document,
  tag: string,
  attrs: Record<string, string | number>,
  ...kids: Node[]
): SVGElement {
  const el = doc.createElementNS(SVG_NS, tag);
  for (const [name, value] of Object.entries(attrs)) el.setAttribute(name, String(value));
  el.append(...kids);
  return el;
}

/** A gradient in the part's own units, its stops reading the Zipper's color variables. */
function gradient(
  doc: Document,
  id: string,
  [x1, y1, x2, y2]: readonly [number, number, number, number],
  stops: readonly (readonly [number, string])[],
): SVGElement {
  return svg(
    doc,
    "linearGradient",
    { id, gradientUnits: "userSpaceOnUse", x1, y1, x2, y2 },
    ...stops.map(([offset, color]) =>
      svg(doc, "stop", { offset, style: `stop-color:var(${color})` }),
    ),
  );
}

/** The slider: its throat, where the joined chain leaves, points down toward the far end, and its
 * shoulders, where the parted rows leave, point up. Matte painted metal, lit from the top left. */
export function sliderBody(doc: Document, id: number): SVGElement {
  const face = `zb${id}`;
  const grip = `zg${id}`;
  const metal: readonly (readonly [number, string])[] = [
    [0, "--zip-body-lit"],
    [0.42, "--zip-body"],
    [1, "--zip-body-deep"],
  ];
  const bridge: readonly (readonly [number, string])[] = [
    [0, "--zip-body-lit"],
    [0.5, "--zip-body"],
    [1, "--zip-body-deep"],
  ];
  return svg(
    doc,
    "svg",
    { class: "zip__body", viewBox: "-12 -17 24 34", "aria-hidden": "true", focusable: "false" },
    svg(
      doc,
      "defs",
      {},
      gradient(doc, face, [-12, -17, 12, 17], metal),
      gradient(doc, grip, [-4, -7, 4, 13], bridge),
    ),
    svg(doc, "path", {
      d: "M-5.5 17H5.5Q8 17 8.4 14.5L11.8 -7Q12.3 -10.5 10.4 -13.4L8.4 -16.2Q7.2 -17.6 5.6 -16.6L0 -10.6L-5.6 -16.6Q-7.2 -17.6 -8.4 -16.2L-10.4 -13.4Q-12.3 -10.5 -11.8 -7L-8.4 14.5Q-8 17 -5.5 17Z",
      fill: `url(#${face})`,
      style: "stroke:var(--zip-body-rim)",
      "stroke-width": ".7",
    }),
    svg(doc, "path", {
      d: "M-11.1 -6.4L-7.9 14.1M-10.9 -9.4Q-11.5 -12.4 -9.5 -14.6L-8.5 -15.8",
      fill: "none",
      stroke: "rgba(255,255,255,.85)",
      "stroke-width": ".8",
      "stroke-linecap": "round",
    }),
    svg(doc, "path", {
      d: "M10.9 -7.2L7.6 13.6M-5 16.4H5",
      fill: "none",
      stroke: "rgba(28,24,36,.18)",
      "stroke-width": "1",
      "stroke-linecap": "round",
    }),
    svg(doc, "path", {
      d: "M-2.2 -11.6L0 -13.9L2.2 -11.6",
      fill: "none",
      stroke: "rgba(28,24,36,.22)",
      "stroke-width": ".7",
    }),
    svg(doc, "path", {
      d: "M-5.7 -0.2h1.3v4.4h-1.3zM4.4 -0.2h1.3v4.4h-1.3z",
      fill: "rgba(28,24,36,.34)",
    }),
    svg(doc, "rect", {
      x: "-4.3",
      y: "-6.6",
      width: "8.6",
      height: "19.6",
      rx: "3.9",
      fill: `url(#${grip})`,
      style: "stroke:var(--zip-body-rim)",
      "stroke-width": ".6",
    }),
    svg(doc, "path", {
      d: "M-3.1 -4.8Q-3.1 -5.6 -1.9 -5.6H1.7",
      fill: "none",
      stroke: "rgba(255,255,255,.9)",
      "stroke-width": ".7",
      "stroke-linecap": "round",
    }),
  );
}

/** The pull hangs from its hinge toward the far end: a paddle with a window the tape shows through, a
 * molded lip, and the ring round the bridge. The back is the same part seen from behind once it flops
 * over, so its light is authored reversed. */
export function pullFace(doc: Document, id: number, side: "front" | "back"): SVGElement {
  const back = side === "back";
  const paddle = `zt${side}${id}`;
  const ring = `zr${side}${id}`;
  const leftEdge = "M-5 6.4L-7.9 32.6";
  const rightEdge = "M5 6.4L7.9 32.6Q8.4 46.4 0 46.6";
  const plastic = (mid: number): readonly (readonly [number, string])[] => [
    [0, "--zip-slider-lit"],
    [mid, "--zip-slider"],
    [1, "--zip-slider-deep"],
  ];
  return svg(
    doc,
    "svg",
    {
      class: `zip__tab zip__tab--${side}`,
      viewBox: "-11 -5 22 55",
      "aria-hidden": "true",
      focusable: "false",
    },
    svg(
      doc,
      "defs",
      {},
      gradient(doc, paddle, back ? [11, 50, -11, -5] : [-11, -5, 11, 50], plastic(0.48)),
      gradient(doc, ring, back ? [0, 4.2, 0, -3.4] : [0, -3.4, 0, 4.2], plastic(0.5)),
    ),
    svg(doc, "path", {
      "fill-rule": "evenodd",
      d: "M-5.2 4H5.2Q6.4 4 6.7 5.6L9.6 33Q10.4 48.5 0 48.5Q-10.4 48.5 -9.6 33L-6.7 5.6Q-6.4 4 -5.2 4ZM-3 38.4A3 3 0 0 0 3 38.4V31.2A3 3 0 0 0 -3 31.2Z",
      fill: `url(#${paddle})`,
      style: "stroke:var(--zip-slider-rim)",
      "stroke-width": ".7",
    }),
    svg(doc, "path", {
      d: back ? rightEdge : leftEdge,
      fill: "none",
      stroke: "rgba(255,255,255,.55)",
      "stroke-width": ".8",
      "stroke-linecap": "round",
    }),
    svg(doc, "path", {
      d: back ? leftEdge : rightEdge,
      fill: "none",
      stroke: "rgba(90,8,46,.22)",
      "stroke-width": ".8",
      "stroke-linecap": "round",
    }),
    svg(doc, "path", {
      d: "M-3 31.2A3 3 0 0 1 3 31.2",
      fill: "none",
      stroke: `rgba(90,8,46,${back ? ".1" : ".28"})`,
      "stroke-width": ".7",
    }),
    svg(doc, "path", {
      d: "M-5.6 4.2H5.6Q7.6 4.2 7.6 2.2V-1.4Q7.6 -3.4 5.6 -3.4H-5.6Q-7.6 -3.4 -7.6 -1.4V2.2Q-7.6 4.2 -5.6 4.2Z",
      fill: `url(#${ring})`,
      style: "stroke:var(--zip-slider-rim)",
      "stroke-width": ".6",
    }),
  );
}

/* ---------------------------------------------------------------- the chain, painted */

/** Tooth to tooth along one row. */
export const PITCH = 12;
/** A tooth's thickness. */
export const TOOTH = 5.8;
/** A top stop's length; the bottom stop spans both tapes and is a little longer. */
export const STOP = 6;
export const FAR_STOP = 6.5;

/** The left row, which parts, and the right one, sewn to the tray. */
type Row = "a" | "b";
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}
type Radii = readonly [topLeft: number, topRight: number, bottomRight: number, bottomLeft: number];
const round = (r: number): Radii => [r, r, r, r];
const grown = (b: Box, by: number): Box => ({
  x: b.x - by,
  y: b.y - by,
  w: b.w + 2 * by,
  h: b.h + 2 * by,
});

/** A tooth, about its place on the chain's center line: its head reaches past the line into the gap
 * between two of the other row's, and row a's head, toward the center, is the rounder end. */
const TOOTH_LENGTH = 10;
const TOOTH_HEAD = 3;
const toothBox = (row: Row): Box => ({
  x: row === "a" ? TOOTH_HEAD - TOOTH_LENGTH : -TOOTH_HEAD,
  y: -TOOTH / 2,
  w: TOOTH_LENGTH,
  h: TOOTH,
});
const TOOTH_RADII: Record<Row, Radii> = { a: [1, 3, 3, 1], b: [3, 1, 1, 3] };
/** The molded step where a tooth grips its tape, in from its tail, and the hollow in its head that takes
 * the other row's hook. */
const STEP = { from: 2.4, width: 0.8, inset: 0.9, color: "rgba(28, 24, 36, 0.22)" };
const HOLLOW = { from: 1.1, top: 1.8, width: 2, height: 2.2, radius: 1.1 };
const HOLLOW_COLOR = "rgba(28, 24, 36, 0.15)";

/** A molded part's face, lit along its top edge and shaded toward its foot: lit down to `lit` px, plain
 * from `plain` px down to `shadeFrom` of its height. */
interface Face {
  lit: number;
  plain: number;
  shadeFrom: number;
}
const TOOTH_FACE: Face = { lit: 0.9, plain: 1.7, shadeFrom: 0.56 };
const STOP_FACE: Face = { lit: 0.9, plain: 1.6, shadeFrom: 0.55 };
/** The hairline rim round each molded part, and its contact shadow, lit from the top left. */
const RIM = 0.5;
interface Shadow {
  dx: number;
  dy: number;
  blur: number;
  color: string;
}
const TOOTH_SHADOW: Shadow = { dx: 0.7, dy: 1.2, blur: 1.1, color: "rgba(8, 6, 12, 0.6)" };
const STOP_SHADOW: Shadow = { dx: 0.8, dy: 1.4, blur: 1.3, color: "rgba(8, 6, 12, 0.55)" };

/** A tooth's slice of tape, beside its tail: longer than the pitch, so each slice overlaps its neighbors
 * and a tight bend shows no notch. */
const TAPE = { width: 13.5, gap: 1.5, overlap: 2 };
const tapeBox = (row: Row): Box => ({
  x: row === "a" ? -TAPE.gap - TAPE.width : TAPE.gap,
  y: -PITCH / 2 - TAPE.overlap,
  w: TAPE.width,
  h: PITCH + 2 * TAPE.overlap,
});
/** The weave: a thread every 2px. The selvedge: a light thread down the outer edge. The stitch line
 * where the tape is sewn on, in from the outer edge: dashes every 6px, from 2px down each slice. */
const WEAVE = { thread: 1, every: 2 };
const SELVEDGE = 1;
const STITCH = { from: 3.4, width: 1.3, dash: 3.4, every: 6, offset: 2 };

/** A square stop on top of each tape, and one across both at the far end, each with a recess molded in
 * and shaded along its top and left edges. */
const STOPS = {
  top: { box: { x: -STOP / 2, y: -STOP / 2, w: STOP, h: STOP }, radius: 1.6 },
  far: { box: { x: -8.5, y: -FAR_STOP / 2, w: 17, h: FAR_STOP }, radius: 2 },
};
const RECESS = { inset: 1.4, radius: 1, shade: 0.5, color: "rgba(28, 24, 36, 0.14)" };

/** A sliver of lining's height. */
export const SLIVER = 5;
/** The lining's sliver, painted once this wide and stretched to each sliver's width: shadowed under the
 * left lip, plain across, and a touch deeper again where it tucks under the right row. */
const LINING_SPAN = 100;
const LINING_SHADE = { deepTo: 0.26, plainTo: 0.88 };
/** Room round each sprite for its rim and shadow. */
const SPRITE_PAD = 3;

/** The chain's colors as zipper.css gives them, computed, which canvases take as they are. */
interface ChainColors {
  tape: string;
  weave: string;
  selvedge: string;
  stitch: string;
  tooth: string;
  toothLit: string;
  toothShade: string;
  toothRim: string;
  lining: string;
  liningDeep: string;
  liningEdge: string;
}

function readColors(root: HTMLElement, win: Window): ChainColors {
  const probe = root.ownerDocument.createElement("i");
  probe.hidden = true;
  root.append(probe);
  const read = (color: string) => {
    probe.style.color = color;
    return win.getComputedStyle(probe).color;
  };
  const colors: ChainColors = {
    tape: read("var(--zip-tape)"),
    weave: read("var(--zip-weave)"),
    selvedge: read("var(--zip-selvedge)"),
    stitch: read("var(--zip-stitch)"),
    tooth: read("var(--zip-tooth)"),
    toothLit: read("var(--zip-tooth-lit)"),
    toothShade: read("var(--zip-tooth-shade)"),
    toothRim: read("var(--zip-tooth-rim)"),
    lining: read("var(--zip-lining)"),
    liningDeep: read("var(--zip-lining-deep)"),
    liningEdge: read("color-mix(in srgb, var(--zip-lining) 92%, var(--zip-lining-deep))"),
  };
  probe.remove();
  return colors;
}

/** A part painted once, and the box round its anchor it's drawn into, in CSS px. */
interface Sprite {
  canvas: HTMLCanvasElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Paints `box`, and `pad` px round it, at `scale` device px to the CSS px, its edges on whole device
 * pixels, so a part drawn square to the screen lands on them. */
function sprite(
  doc: Document,
  scale: number,
  box: Box,
  pad: number,
  paint: (g: CanvasRenderingContext2D) => void,
  allocated: HTMLCanvasElement[],
): Sprite {
  const x = Math.floor((box.x - pad) * scale) / scale;
  const y = Math.floor((box.y - pad) * scale) / scale;
  const w = Math.ceil((box.x + box.w + pad) * scale) / scale - x;
  const h = Math.ceil((box.y + box.h + pad) * scale) / scale - y;
  const canvas = doc.createElement("canvas");
  allocated.push(canvas);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
  const g = context2d(canvas);
  g.setTransform(scale, 0, 0, scale, -x * scale, -y * scale);
  paint(g);
  return { canvas, x, y, w, h };
}

/** Adds a rounded rectangle to the path, its corners shrunk together where they'd overlap, as CSS does. */
function roundedRect(g: CanvasRenderingContext2D, { x, y, w, h }: Box, radii: Radii) {
  const fits = (side: number, r1: number, r2: number) => (r1 + r2 > 0 ? side / (r1 + r2) : 1);
  const [tl, tr, br, bl] = radii;
  const k = Math.min(1, fits(w, tl, tr), fits(h, tr, br), fits(w, br, bl), fits(h, bl, tl));
  g.moveTo(x + tl * k, y);
  g.arcTo(x + w, y, x + w, y + h, tr * k);
  g.arcTo(x + w, y + h, x, y + h, br * k);
  g.arcTo(x, y + h, x, y, bl * k);
  g.arcTo(x, y, x + w, y, tl * k);
  g.closePath();
}

/** A molded part: its contact shadow, its rim, and its face. Canvas shadows are in device pixels. */
function molded(
  g: CanvasRenderingContext2D,
  box: Box,
  radii: Radii,
  face: Face,
  shadow: Shadow,
  c: ChainColors,
  scale: number,
) {
  g.save();
  g.shadowColor = shadow.color;
  g.shadowBlur = shadow.blur * scale;
  g.shadowOffsetX = shadow.dx * scale;
  g.shadowOffsetY = shadow.dy * scale;
  g.beginPath();
  roundedRect(g, box, radii);
  g.fillStyle = c.tooth;
  g.fill();
  g.restore();
  g.beginPath();
  roundedRect(g, grown(box, RIM), [radii[0] + RIM, radii[1] + RIM, radii[2] + RIM, radii[3] + RIM]);
  g.fillStyle = c.toothRim;
  g.fill();
  const fill = g.createLinearGradient(0, box.y, 0, box.y + box.h);
  fill.addColorStop(0, c.toothLit);
  fill.addColorStop(face.lit / box.h, c.toothLit);
  fill.addColorStop(face.plain / box.h, c.tooth);
  fill.addColorStop(face.shadeFrom, c.tooth);
  fill.addColorStop(1, c.toothShade);
  g.beginPath();
  roundedRect(g, box, radii);
  g.fillStyle = fill;
  g.fill();
}

function paintTooth(g: CanvasRenderingContext2D, row: Row, c: ChainColors, scale: number) {
  const box = toothBox(row);
  molded(g, box, TOOTH_RADII[row], TOOTH_FACE, TOOTH_SHADOW, c, scale);
  const stepX = row === "a" ? box.x + STEP.from : box.x + box.w - STEP.from - STEP.width;
  g.fillStyle = STEP.color;
  g.fillRect(stepX, box.y + STEP.inset, STEP.width, box.h - 2 * STEP.inset);
  const hollowX = row === "a" ? box.x + box.w - HOLLOW.from - HOLLOW.width : box.x + HOLLOW.from;
  g.beginPath();
  roundedRect(
    g,
    { x: hollowX, y: box.y + HOLLOW.top, w: HOLLOW.width, h: HOLLOW.height },
    round(HOLLOW.radius),
  );
  g.fillStyle = HOLLOW_COLOR;
  g.fill();
}

function paintTape(g: CanvasRenderingContext2D, row: Row, c: ChainColors) {
  const box = tapeBox(row);
  g.fillStyle = c.tape;
  g.fillRect(box.x, box.y, box.w, box.h);
  g.fillStyle = c.weave;
  for (let y = 0; y < box.h; y += WEAVE.every)
    g.fillRect(box.x, box.y + y, box.w, Math.min(WEAVE.thread, box.h - y));
  g.fillStyle = c.selvedge;
  g.fillRect(row === "a" ? box.x : box.x + box.w - SELVEDGE, box.y, SELVEDGE, box.h);
  // The stitch's dashes repeat down a slice from `offset` px, and that pattern repeats every slice's
  // length, so a dash can be cut short where one repeat ends.
  const x = row === "a" ? box.x + STITCH.from : box.x + box.w - STITCH.from - STITCH.width;
  g.fillStyle = c.stitch;
  for (let tile = STITCH.offset - box.h; tile < box.h; tile += box.h)
    for (let at = tile; at < tile + box.h; at += STITCH.every) {
      const from = Math.max(0, at);
      const to = Math.min(box.h, at + STITCH.dash, tile + box.h);
      if (to > from) g.fillRect(x, box.y + from, STITCH.width, to - from);
    }
}

function paintStop(
  g: CanvasRenderingContext2D,
  stop: (typeof STOPS)["top"],
  c: ChainColors,
  scale: number,
) {
  molded(g, stop.box, round(stop.radius), STOP_FACE, STOP_SHADOW, c, scale);
  const recess = grown(stop.box, -RECESS.inset);
  const shifted = { ...recess, x: recess.x + RECESS.shade, y: recess.y + RECESS.shade };
  g.save();
  g.beginPath();
  roundedRect(g, recess, round(RECESS.radius));
  g.clip();
  g.beginPath();
  roundedRect(g, recess, round(RECESS.radius));
  roundedRect(g, shifted, round(RECESS.radius));
  g.fillStyle = RECESS.color;
  g.fill("evenodd");
  g.restore();
}

function paintLining(g: CanvasRenderingContext2D, c: ChainColors) {
  const fill = g.createLinearGradient(0, 0, LINING_SPAN, 0);
  fill.addColorStop(0, c.liningDeep);
  fill.addColorStop(LINING_SHADE.deepTo, c.lining);
  fill.addColorStop(LINING_SHADE.plainTo, c.lining);
  fill.addColorStop(1, c.liningEdge);
  g.fillStyle = fill;
  g.fillRect(0, 0, LINING_SPAN, 1);
}

function paintSprites(
  doc: Document,
  root: HTMLElement,
  win: Window,
  scale: number,
  allocated: HTMLCanvasElement[],
) {
  const c = readColors(root, win);
  const at = (box: Box, paint: (g: CanvasRenderingContext2D) => void) =>
    sprite(doc, scale, box, SPRITE_PAD, paint, allocated);
  return {
    tooth: {
      a: at(toothBox("a"), (g) => paintTooth(g, "a", c, scale)),
      b: at(toothBox("b"), (g) => paintTooth(g, "b", c, scale)),
    },
    tape: {
      a: at(tapeBox("a"), (g) => paintTape(g, "a", c)),
      b: at(tapeBox("b"), (g) => paintTape(g, "b", c)),
    },
    stop: {
      top: at(STOPS.top.box, (g) => paintStop(g, STOPS.top, c, scale)),
      far: at(STOPS.far.box, (g) => paintStop(g, STOPS.far, c, scale)),
    },
    lining: sprite(
      doc,
      scale,
      { x: 0, y: 0, w: LINING_SPAN, h: 1 },
      0,
      (g) => paintLining(g, c),
      allocated,
    ),
  };
}
type Sprites = ReturnType<typeof paintSprites>;

/** Where each tooth of a row is drawn: its place in the host, its turn in radians, and how far its
 * slice of tape is stretched along the row. */
export interface ToothPlaces {
  n: number;
  x: Float64Array;
  y: Float64Array;
  turn: Float64Array;
  stretch: Float64Array;
}
export const toothPlaces = (n: number): ToothPlaces => ({
  n,
  x: new Float64Array(n),
  y: new Float64Array(n),
  turn: new Float64Array(n),
  stretch: new Float64Array(n).fill(1),
});

/** The lining's slivers drawn this frame: each across from `left` to `right`, about `y`. */
export interface SliverPlaces {
  n: number;
  left: Float64Array;
  right: Float64Array;
  y: Float64Array;
}
export const sliverPlaces = (most: number): SliverPlaces => ({
  n: 0,
  left: new Float64Array(most),
  right: new Float64Array(most),
  y: new Float64Array(most),
});

/** Where the stops are sewn on: one on top of each tape, and one across both at the far end. */
interface StopPlaces {
  top: readonly { x: number; y: number }[];
  far: { x: number; y: number };
}

/** The furthest a sprite reaches from its anchor, before its tape is stretched. */
const REACH = 24;

/** A canvas over the host, its 2D context, and the device pixels last drawn on, to clear. */
function layer(doc: Document, className: string) {
  const canvas = doc.createElement("canvas");
  canvas.className = className;
  canvas.setAttribute("aria-hidden", "true");
  let g: CanvasRenderingContext2D | null = null;
  return {
    canvas,
    get g() {
      return (g ??= context2d(canvas));
    },
    drawn: { x0: 0, y0: 0, x1: 0, y1: 0 },
  };
}
type Layer = ReturnType<typeof layer>;

export interface ChainArt {
  /** Under what the open mouth shows: the lining. */
  readonly lining: HTMLCanvasElement;
  /** Over it: the right row, then the left row and the stops. */
  readonly rowB: HTMLCanvasElement;
  readonly rowA: HTMLCanvasElement;
  /** Sizes the canvases to the host's pixels, at the screen's pixel ratio. */
  fit: (w: number, h: number) => void;
  /** Draws the right row where it's sewn on. */
  drawRowB: (teeth: ToothPlaces) => void;
  /** Draws the left row where it is this frame, and the stops over both rows. */
  drawRowA: (teeth: ToothPlaces, stops: StopPlaces) => void;
  drawLining: (slivers: SliverPlaces) => void;
  /** Retries a failed allocation on the next deliberate use of the pull. */
  retry: () => boolean;
}

/**
 * The chain's canvases in `root`, whose CSS gives its colors. Its sprites are painted again when the
 * color scheme or the screen's pixel ratio changes, and `repaint` then draws the chain again.
 */
export function createChainArt(
  root: HTMLElement,
  win: Window,
  signal: AbortSignal,
  repaint: () => void,
  onError?: (error: unknown) => void,
): ChainArt {
  const doc = root.ownerDocument;
  const lining = layer(doc, "zip__canvas zip__lining");
  const rowB = layer(doc, "zip__canvas zip__row zip__row--b");
  const rowA = layer(doc, "zip__canvas zip__row zip__row--a");
  let scale = 0;
  let sprites: Sprites | null = null;
  let size = { w: 0, h: 0 };
  let allocated: HTMLCanvasElement[] = [];
  let failed = false;
  let disposed = false;
  const layers = [lining, rowB, rowA];
  const release = () => {
    for (const canvas of allocated) releaseCanvas(canvas);
    allocated = [];
    sprites = null;
    for (const { canvas } of layers) releaseCanvas(canvas);
  };
  signal.addEventListener(
    "abort",
    () => {
      disposed = true;
      release();
    },
    { once: true },
  );

  /** Artwork failure leaves the pull and tray usable, with a persistent board alert. */
  function attempt(work: () => void): boolean {
    if (disposed) return false;
    try {
      work();
      if (failed) {
        failed = false;
        for (const { canvas } of layers) canvas.hidden = false;
        onError?.(null);
      }
      return true;
    } catch (error) {
      release();
      for (const { canvas } of layers) canvas.hidden = true;
      failed = true;
      console.error(
        "The Zipper's artwork could not be drawn; the pull still opens the sticker tray",
        error,
      );
      onError?.(error);
      return false;
    }
  }
  function prepareSprites() {
    const next: HTMLCanvasElement[] = [];
    try {
      const painted = paintSprites(doc, root, win, scale, next);
      for (const canvas of allocated) releaseCanvas(canvas);
      allocated = next;
      sprites = painted;
    } catch (error) {
      for (const canvas of next) releaseCanvas(canvas);
      throw error;
    }
  }

  function fit(w: number, h: number) {
    size = { w, h };
    return attempt(() => {
      const ratio = win.devicePixelRatio || 1;
      if (!sprites || ratio !== scale) {
        scale = ratio;
        prepareSprites();
      }
      for (const l of layers) {
        // A new size clears the canvas. Acquiring every context here makes refusal recoverable.
        l.canvas.width = Math.round(w * scale);
        l.canvas.height = Math.round(h * scale);
        l.g.setTransform(1, 0, 0, 1, 0, 0);
        Object.assign(l.drawn, { x0: 0, y0: 0, x1: 0, y1: 0 });
      }
    });
  }
  const scheme = win.matchMedia("(prefers-color-scheme: dark)");
  scheme.addEventListener(
    "change",
    () => {
      if (!size.w) return;
      if (attempt(prepareSprites) && fit(size.w, size.h)) repaint();
    },
    { signal },
  );
  // The pixel ratio changes as the page is zoomed or moves to another screen.
  let resolution: MediaQueryList | null = null;
  const watchResolution = () => {
    resolution?.removeEventListener("change", onResolution);
    resolution = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`);
    resolution.addEventListener("change", onResolution, { signal });
  };
  function onResolution() {
    watchResolution();
    if (size.w && fit(size.w, size.h)) repaint();
  }
  watchResolution();

  /** Clears what `l` last drew, and sets it up to draw in CSS px. */
  function begin(l: Layer) {
    const { g, drawn } = l;
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (drawn.x1 > drawn.x0)
      g.clearRect(drawn.x0, drawn.y0, drawn.x1 - drawn.x0, drawn.y1 - drawn.y0);
    Object.assign(drawn, { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity });
  }
  /** Notes that `l` drew within `reach` CSS px of (x, y). */
  function mark(l: Layer, x: number, y: number, reach: number) {
    const { drawn } = l;
    drawn.x0 = Math.min(drawn.x0, Math.floor((x - reach) * scale));
    drawn.y0 = Math.min(drawn.y0, Math.floor((y - reach) * scale));
    drawn.x1 = Math.max(drawn.x1, Math.ceil((x + reach) * scale));
    drawn.y1 = Math.max(drawn.y1, Math.ceil((y + reach) * scale));
  }
  const blit = (g: CanvasRenderingContext2D, s: Sprite) =>
    g.drawImage(s.canvas, 0, 0, s.canvas.width, s.canvas.height, s.x, s.y, s.w, s.h);

  /** Each tooth's slice of tape, then the tooth, in order down the row, as each overlaps the last. */
  function drawRow(l: Layer, row: Row, teeth: ToothPlaces) {
    if (!sprites) return;
    const { g } = l;
    const tape = sprites.tape[row];
    const tooth = sprites.tooth[row];
    for (let j = 0; j < teeth.n; j++) {
      const turn = teeth.turn[j];
      const stretch = teeth.stretch[j];
      let ex = teeth.x[j] * scale;
      let ey = teeth.y[j] * scale;
      // A tooth square to the screen lands on whole device pixels, as its sprite was painted.
      if (turn === 0 && stretch === 1) {
        ex = Math.round(ex);
        ey = Math.round(ey);
      }
      const cos = Math.cos(turn) * scale;
      const sin = Math.sin(turn) * scale;
      g.setTransform(cos, sin, -sin * stretch, cos * stretch, ex, ey);
      blit(g, tape);
      g.setTransform(cos, sin, -sin, cos, ex, ey);
      blit(g, tooth);
      mark(l, teeth.x[j], teeth.y[j], REACH * Math.max(1, stretch));
    }
  }
  function drawStop(l: Layer, s: Sprite, { x, y }: { x: number; y: number }) {
    l.g.setTransform(scale, 0, 0, scale, Math.round(x * scale), Math.round(y * scale));
    blit(l.g, s);
    mark(l, x, y, REACH);
  }

  return {
    lining: lining.canvas,
    rowB: rowB.canvas,
    rowA: rowA.canvas,
    fit,
    retry: () => failed && fit(size.w, size.h),
    drawRowB(teeth) {
      if (failed) return;
      attempt(() => {
        begin(rowB);
        drawRow(rowB, "b", teeth);
      });
    },
    drawRowA(teeth, stops) {
      if (failed) return;
      attempt(() => {
        begin(rowA);
        drawRow(rowA, "a", teeth);
        if (!sprites) return;
        for (const at of stops.top) drawStop(rowA, sprites.stop.top, at);
        drawStop(rowA, sprites.stop.far, stops.far);
      });
    },
    drawLining(slivers) {
      if (failed) return;
      attempt(() => {
        begin(lining);
        if (!sprites) return;
        const { g } = lining;
        const s = sprites.lining;
        g.setTransform(scale, 0, 0, scale, 0, 0);
        for (let i = 0; i < slivers.n; i++) {
          const left = slivers.left[i];
          const right = slivers.right[i];
          const y = slivers.y[i];
          g.drawImage(
            s.canvas,
            0,
            0,
            s.canvas.width,
            s.canvas.height,
            left,
            y - SLIVER / 2,
            right - left,
            SLIVER,
          );
          mark(lining, left, y, SLIVER);
          mark(lining, right, y, SLIVER);
        }
      });
    },
  };
}
