import { seededRandom } from "../ui/seededRandom";

/**
 * The big heart as six SVGs of one size, stacked body, flush, pale, gloss, ink, face. Face goes last
 * so the sweat drop sits over the boiling outline; body alone stays in the flow and sizes the stack.
 */
export interface HeartLayers {
  body: string;
  flush: string;
  pale: string;
  gloss: string;
  face: string;
  ink: string;
}

/** A point on the heart's outline in its viewBox, with the outward unit normal there. */
export interface OutlinePoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

type Point = readonly [x: number, y: number];

const INK = "#1C1824";
const PINK = "#FF4F9A";
/** Lets the same markup work inline and as an `<img>`. */
const XMLNS = 'xmlns="http://www.w3.org/2000/svg"';
const INK_STROKE = `stroke="${INK}" stroke-linecap="round" stroke-linejoin="round" fill="none"`;

export const HEART_VIEWBOX: { width: number; height: number } = { width: 240, height: 232 };

const HEART_START: Point = [120, 212];
/** The heart's cubic curves from its tip, each as two control points and an end. */
const HEART_CURVES: readonly (readonly [Point, Point, Point])[] = [
  [
    [112, 206],
    [22, 150],
    [22, 86],
  ],
  [
    [22, 48],
    [50, 22],
    [82, 22],
  ],
  [
    [100, 22],
    [113, 32],
    [120, 46],
  ],
  [
    [127, 32],
    [140, 22],
    [158, 22],
  ],
  [
    [190, 22],
    [218, 48],
    [218, 86],
  ],
  [
    [218, 150],
    [128, 206],
    [120, 212],
  ],
];
const HEART_D = `M${HEART_START.join(" ")}${HEART_CURVES.map((c) => `C${c.flat().join(" ")}`).join("")}Z`;
const HEART_MIDDLE: Point = [120, 120];
const MINI_D =
  "M20 35.5C18.6 34.4 3.5 25.2 3.5 14.2C3.5 8.4 7.9 4 13.3 4C16.2 4 18.6 5.4 20 7.8C21.4 5.4 23.8 4 26.7 4C32.1 4 36.5 8.4 36.5 14.2C36.5 25.2 21.4 34.4 20 35.5Z";

/** Steps per curve when measuring the outline as a polyline: enough that the steps hug the curves. */
const OUTLINE_STEPS_PER_CURVE = 64;

/** The outline at `u`, which runs one unit per curve from the tip, and its direction there. */
function outlineAt(u: number) {
  const k = Math.min(Math.floor(u), HEART_CURVES.length - 1);
  const t = u - k;
  const s = 1 - t;
  const from = k === 0 ? HEART_START : HEART_CURVES[k - 1][2];
  const [c1, c2, to] = HEART_CURVES[k];
  const at = (j: 0 | 1) =>
    s * s * s * from[j] + 3 * s * s * t * c1[j] + 3 * s * t * t * c2[j] + t * t * t * to[j];
  const slope = (j: 0 | 1) =>
    3 * (s * s * (c1[j] - from[j]) + 2 * s * t * (c2[j] - c1[j]) + t * t * (to[j] - c2[j]));
  return { x: at(0), y: at(1), dx: slope(0), dy: slope(1) };
}

/**
 * `count` points evenly spaced along the outline, as `getPointAtLength` spaces them. Spreading them
 * by parameter would crowd the short curves, so the outline is measured as a polyline and walked.
 */
export function heartOutline(count: number): OutlinePoint[] {
  let last = { x: HEART_START[0], y: HEART_START[1], along: 0 };
  const steps = [last];
  for (let i = 1; i <= HEART_CURVES.length * OUTLINE_STEPS_PER_CURVE; i++) {
    const { x, y } = outlineAt(i / OUTLINE_STEPS_PER_CURVE);
    last = { x, y, along: last.along + Math.hypot(x - last.x, y - last.y) };
    steps.push(last);
  }
  const points: OutlinePoint[] = [];
  let i = 0;
  for (let n = 0; n < count; n++) {
    const along = (n * last.along) / count;
    while (steps[i + 1].along <= along) i++;
    const a = steps[i];
    const b = steps[i + 1];
    const f = (along - a.along) / (b.along - a.along);
    const x = a.x + (b.x - a.x) * f;
    const y = a.y + (b.y - a.y) * f;
    const { dx, dy } = outlineAt((i + f) / OUTLINE_STEPS_PER_CURVE);
    const length = Math.hypot(dx, dy);
    let nx = dy / length;
    let ny = -dx / length;
    if (nx * (x - HEART_MIDDLE[0]) + ny * (y - HEART_MIDDLE[1]) < 0) {
      nx = -nx;
      ny = -ny;
    }
    points.push({ x, y, nx, ny });
  }
  return points;
}

/** The outline redrawn by an unsteady hand: jittered, then curved through the midpoints. */
function boilingOutline(outline: readonly OutlinePoint[], random: () => number, width: number) {
  const points = outline.map((p) => ({
    x: p.x + (random() - 0.5) * 3.6,
    y: p.y + (random() - 0.5) * 3.6,
  }));
  const f = (n: number) => n.toFixed(1);
  let d = `M${f(points[0].x)} ${f(points[0].y)}`;
  for (let i = 1; i <= points.length; i++) {
    const a = points[i % points.length];
    const b = points[(i + 1) % points.length];
    d += `Q${f(a.x)} ${f(a.y)} ${f((a.x + b.x) / 2)} ${f((a.y + b.y) / 2)}`;
  }
  return `<path d="${d}Z" fill="none" stroke="${INK}" stroke-width="${width}" stroke-linejoin="round"/>`;
}

const eyeHeart = (cx: number, cy: number) =>
  `<g transform="translate(${cx - 11} ${cy - 11}) scale(.55)"><path d="${MINI_D}" fill="#F0145A" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/><ellipse cx="13" cy="13" rx="4" ry="3" fill="#fff" opacity=".9"/></g>`;

/** Every face, the blush hatching, the nosebleed and the sweat drop, each shown by a data attribute. */
const FACES = `
  <g class="f-hatch">
    <ellipse cx="74" cy="131" rx="16" ry="8.5" fill="#FF1C62" opacity=".42"/>
    <ellipse cx="166" cy="131" rx="16" ry="8.5" fill="#FF1C62" opacity=".42"/>
    <path d="M64 138L70 124M71 139L77 125M78 140L84 126M156 138L162 124M163 139L169 125M170 140L176 126" ${INK_STROKE} stroke-width="2.4" opacity=".9"/>
  </g>
  <g class="f-hatch-full">
    <path d="M57 137L62 126M85 140L90 128M149 137L154 126M177 140L182 128" ${INK_STROKE} stroke-width="2.2" opacity=".85"/>
    <path d="M103 125L107 117M110 126L114 118M117 127L121 119M124 126L128 118M131 125L135 117" ${INK_STROKE} stroke-width="1.8" opacity=".6"/>
  </g>
  <g class="f f-dots">
    <ellipse cx="96" cy="112" rx="6.5" ry="8.5" fill="${INK}"/><ellipse cx="144" cy="112" rx="6.5" ry="8.5" fill="${INK}"/>
    <circle cx="98.6" cy="108.4" r="2.2" fill="#fff"/><circle cx="146.6" cy="108.4" r="2.2" fill="#fff"/>
    <path d="M111 128Q120 136 129 128" ${INK_STROKE} stroke-width="3.6"/>
  </g>
  <g class="f f-shy">
    <ellipse cx="101" cy="114" rx="6" ry="7.6" fill="${INK}"/><ellipse cx="149" cy="114" rx="6" ry="7.6" fill="${INK}"/>
    <circle cx="103.4" cy="110.8" r="2" fill="#fff"/><circle cx="151.4" cy="110.8" r="2" fill="#fff"/>
    <path d="M108 131q3.5-3.6 7 0t7 0t7 0" ${INK_STROKE} stroke-width="3.2"/>
  </g>
  <g class="f f-hearts">
    ${eyeHeart(95, 110)}${eyeHeart(145, 110)}
    <path d="M106 126Q120 146 134 126Z" fill="${INK}" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/>
  </g>
  <g class="f f-over">
    <path d="M85 103L100 112L85 121M155 103L140 112L155 121" ${INK_STROKE} stroke-width="4.4"/>
    <ellipse cx="120" cy="134" rx="6.5" ry="8.5" fill="${INK}"/>
  </g>
  <g class="f f-bliss">
    <path d="M86 115Q95 103 104 115M136 115Q145 103 154 115" ${INK_STROKE} stroke-width="3.8"/>
    <path d="M110 128Q120 138 130 128" ${INK_STROKE} stroke-width="3.6"/>
  </g>
  <g class="f f-wide">
    <ellipse cx="95" cy="110" rx="9.5" ry="11.5" fill="${INK}"/><ellipse cx="145" cy="110" rx="9.5" ry="11.5" fill="${INK}"/>
    <circle cx="98.6" cy="105.4" r="3.4" fill="#fff"/><circle cx="92.4" cy="115" r="1.6" fill="#fff"/>
    <circle cx="148.6" cy="105.4" r="3.4" fill="#fff"/><circle cx="142.4" cy="115" r="1.6" fill="#fff"/>
    <ellipse cx="120" cy="133" rx="4.5" ry="5.5" fill="${INK}"/>
  </g>
  <g class="f f-limp">
    <path d="M86 110Q95 120 104 110M136 110Q145 120 154 110" stroke="#4B4453" stroke-linecap="round" fill="none" stroke-width="3.4"/>
    <ellipse cx="120" cy="130" rx="3.6" ry="4.6" fill="#4B4453"/>
  </g>
  <g class="h-nose">
    <path class="h-nose-line" d="M120 121C119.5 128 118.2 134 117.8 141" stroke="#E3002B" stroke-width="3.4" stroke-linecap="round" fill="none"/>
    <path class="h-nose-drop" d="M117.8 141c2.4 3 3.6 5 3.6 6.6a3.6 3.6 0 0 1-7.2 0c0-1.6 1.2-3.6 3.6-6.6z" fill="#E3002B"/>
  </g>
  <g class="h-sweat" transform="translate(205 60) rotate(22)">
    <path d="M0-17C7-7 11-1 11 5A11 11 0 0 1-11 5C-11-1-7-7 0-17Z" fill="#D5F6F8" stroke="${INK}" stroke-width="2.6" stroke-linejoin="round"/>
    <path d="M-5 4q0-5 3-8" stroke="#fff" stroke-width="2.4" stroke-linecap="round" fill="none"/>
  </g>`;

const heartClip = (id: string) => `<clipPath id="${id}"><path d="${HEART_D}"/></clipPath>`;
const blur = (id: string, deviation: number) =>
  `<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${deviation}"/></filter>`;

function heartLayer(name: string, content: string, attributes = ""): string {
  return `<svg ${XMLNS} class="h-${name}" viewBox="0 0 ${HEART_VIEWBOX.width} ${HEART_VIEWBOX.height}" aria-hidden="true"${attributes}>${content}</svg>`;
}

/**
 * The big heart in layers, so a face change or a fading layer never redraws another layer's blur.
 * `uid` keeps this heart's ids unique on the page.
 */
export function bigHeartLayers(uid: string): HeartLayers {
  const id = (def: string, layer: string) => `gr-${def}-${uid}-${layer}`;
  const outline = heartOutline(72);
  return {
    body: heartLayer(
      "body",
      `
  <defs>
    <radialGradient id="${id("fill", "body")}" cx=".34" cy=".26" r=".9"><stop offset="0" stop-color="#FF93C3"/><stop offset=".46" stop-color="#FF4F9A"/><stop offset="1" stop-color="#D92A77"/></radialGradient>
    ${heartClip(id("clip", "body"))}
    ${blur(id("blur", "body"), 5)}
    ${blur(id("soft-blur", "body"), 2.2)}
  </defs>
  <path d="${HEART_D}" fill="url(#${id("fill", "body")})"/>
  <g clip-path="url(#${id("clip", "body")})">
    <path d="${HEART_D}" fill="none" stroke="#A3155A" stroke-width="18" opacity=".30" filter="url(#${id("blur", "body")})"/>
    <path d="M198 118C190 154 152 184 126 199" fill="none" stroke="#FFD3E7" stroke-width="7" stroke-linecap="round" opacity=".6" filter="url(#${id("soft-blur", "body")})"/>
  </g>`,
    ),
    flush: heartLayer(
      "flush",
      `
  <defs>${heartClip(id("clip", "flush"))}${blur(id("blur", "flush"), 5)}</defs>
  <g clip-path="url(#${id("clip", "flush")})"><ellipse cx="120" cy="126" rx="90" ry="50" fill="#FF1C5E" opacity=".5" filter="url(#${id("blur", "flush")})"/></g>`,
    ),
    pale: heartLayer(
      "pale",
      `
  <defs><radialGradient id="${id("fill", "pale")}" cx=".34" cy=".26" r=".9"><stop offset="0" stop-color="#FFF6FA"/><stop offset=".55" stop-color="#F6D9E6"/><stop offset="1" stop-color="#E8BFD2"/></radialGradient></defs>
  <path d="${HEART_D}" fill="url(#${id("fill", "pale")})"/>`,
    ),
    gloss: heartLayer(
      "gloss",
      `
  <defs>${blur(id("soft-blur", "gloss"), 2.2)}</defs>
  <ellipse cx="78" cy="61" rx="32" ry="15" transform="rotate(-34 78 61)" fill="#fff" opacity=".78" filter="url(#${id("soft-blur", "gloss")})"/>
  <ellipse cx="59" cy="88" rx="4.6" ry="7" transform="rotate(-18 59 88)" fill="#fff" opacity=".92"/>
  <ellipse cx="168" cy="50" rx="13" ry="6" transform="rotate(26 168 50)" fill="#fff" opacity=".42" filter="url(#${id("soft-blur", "gloss")})"/>`,
    ),
    // The boiling line shows one outline at a time, picked by data-v.
    ink: heartLayer(
      "ink",
      [3.8, 4.3, 4.8]
        .map((width, v) => boilingOutline(outline, seededRandom(911 * (v + 1)), width))
        .join(""),
      ' data-v="0"',
    ),
    face: heartLayer("face", FACES),
  };
}

export function miniHeartSvg(fill: string): string {
  return `<svg ${XMLNS} viewBox="0 0 40 40"><path d="${MINI_D}" fill="${fill}" stroke="${INK}" stroke-width="2.4" stroke-linejoin="round"/><ellipse cx="13" cy="13" rx="3.4" ry="2.4" fill="#fff" opacity=".7"/></svg>`;
}

/** A finger stamp. Its shadow is drawn in because art that repeats carries no CSS filter. */
export function stampHeartSvg(): string {
  return `<svg ${XMLNS} viewBox="-4 -4 48 48"><path d="${MINI_D}" transform="translate(1 2)" fill="${INK}" stroke="${INK}" stroke-width="8" stroke-linejoin="round" opacity=".16"/><path d="${MINI_D}" fill="#fff" stroke="#fff" stroke-width="8" stroke-linejoin="round"/><path d="${MINI_D}" fill="${PINK}"/><ellipse cx="13" cy="12.5" rx="4.2" ry="2.8" transform="rotate(-30 13 12.5)" fill="#fff" opacity=".75"/></svg>`;
}

export const GLINT_SVG: string = `<svg ${XMLNS} viewBox="0 0 40 40"><path d="M20 2C21.6 14 26 18.4 38 20C26 21.6 21.6 26 20 38C18.4 26 14 21.6 2 20C14 18.4 18.4 14 20 2Z" fill="#fff" stroke="${INK}" stroke-width="2.2" stroke-linejoin="round"/></svg>`;

export const PUFF_SVG: string = `<svg ${XMLNS} viewBox="0 0 44 36"><path d="M11 31C4.6 31 2.4 24.4 6.6 21.4C4.6 15 10.6 10.6 15.8 13.6C17.8 6.8 27.6 6.4 29.8 13C35 11 40.4 15.6 38.2 21C42.4 23.6 39.6 31 33.6 31Z" fill="#fff" stroke="rgba(110,104,120,.55)" stroke-width="2" stroke-linejoin="round"/></svg>`;

export const BEAD_SVG: string = `<svg ${XMLNS} viewBox="0 0 24 30"><path d="M12 2C17 9 20 13.6 20 18A8 8 0 0 1 4 18C4 13.6 7 9 12 2Z" fill="#D5F6F8" stroke="${INK}" stroke-width="2" stroke-linejoin="round"/></svg>`;

export const SOUL_SVG: string = `<svg ${XMLNS} viewBox="0 0 74 92" aria-hidden="true">
  <circle cx="37" cy="56" r="30" fill="#fff" opacity=".5"/>
  <ellipse cx="37" cy="13" rx="21" ry="6.5" fill="none" stroke="#FFD93B" stroke-width="4.2"/>
  <ellipse cx="37" cy="13" rx="21" ry="6.5" fill="none" stroke="#fff" stroke-width="1.2" opacity=".9"/>
  <g transform="translate(7 28) scale(1.5)"><path d="${MINI_D}" fill="rgba(255,236,245,.82)" stroke="rgba(255,79,154,.85)" stroke-width="1.6" stroke-linejoin="round"/>
  <path d="M13 17.6q2.4-2.8 4.8 0M22.2 17.6q2.4-2.8 4.8 0" stroke="#4B4453" stroke-width="1.2" stroke-linecap="round" fill="none"/></g>
</svg>`;

export const HAZE_WAVE_SVG: string = `<svg ${XMLNS} viewBox="0 0 390 40" preserveAspectRatio="none" aria-hidden="true" fill="none" stroke="rgba(255,255,255,.75)" stroke-width="2.2" stroke-linecap="round"><path d="M-10 22c26-14 52 14 78 0s52-14 78 0 52 14 78 0 52-14 78 0 52 14 78 0 52-14 78 0"/></svg>`;

/** Phosphor's hand-swipe-right (bold): the stroke tip. */
export const HAND_SWIPE_SVG: string = `<svg ${XMLNS} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M220,148v36c0,13.85-1.63,26.52-4.58,35.68a12,12,0,0,1-22.84-7.36c2.14-6.65,3.42-17.24,3.42-28.32V148a8,8,0,0,0-16,0v4a12,12,0,0,1-24,0V132a8,8,0,0,0-16,0v12a12,12,0,0,1-24,0V76a8,8,0,0,0-16,0V184a12,12,0,0,1-22.18,6.34l-18.68-30-.21-.34A8,8,0,0,0,45,167.92L70.27,209.8a12,12,0,0,1-20.56,12.39l-25.31-42-.12-.2A32,32,0,0,1,76,142.83V76a32,32,0,0,1,64,0v25a32,32,0,0,1,36.78,17A32,32,0,0,1,220,148ZM252.48,47.51l-32-32a12,12,0,0,0-17,17L215,44H172a12,12,0,0,0,0,24h43L203.51,79.51a12,12,0,1,0,17,17l32-32A12,12,0,0,0,252.48,47.51Z"/></svg>`;

/** Phosphor's vibrate (fill): the shake tip and the shake marks. */
export const VIBRATE_SVG: string = `<svg ${XMLNS} viewBox="0 0 256 256" fill="currentColor" aria-hidden="true" focusable="false"><path d="M184,56V200a24,24,0,0,1-24,24H96a24,24,0,0,1-24-24V56A24,24,0,0,1,96,32h64A24,24,0,0,1,184,56Zm24,24a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,208,80Zm32,16a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V104A8,8,0,0,0,240,96ZM48,80a8,8,0,0,0-8,8v80a8,8,0,0,0,16,0V88A8,8,0,0,0,48,80ZM16,96a8,8,0,0,0-8,8v48a8,8,0,0,0,16,0V104A8,8,0,0,0,16,96Z"/></svg>`;

/** A dent where the loose heart hit an edge of the screen, drawn for the top edge. */
export const DENT_SVG: string = `<svg ${XMLNS} viewBox="0 0 84 22" aria-hidden="true"><path d="M0 0Q42 30 84 0Z" fill="#C9C4D6"/><path d="M4 0Q42 22 80 0" fill="rgba(28,24,36,.10)"/><path d="M0 0Q42 30 84 0" fill="none" stroke="rgba(28,24,36,.55)" stroke-width="1.6"/><path d="M7 1.5Q42 23 77 1.5" fill="none" stroke="rgba(255,255,255,.95)" stroke-width="1.3"/><path d="M26 12L19 22M58 12L65 22M42 15.5L42 24" stroke="rgba(28,24,36,.16)" stroke-width="1"/></svg>`;

/** Speed lines for the stroke's ground, drawn along x; the ground turns them to the stroke's axis. */
export function speedFieldSvg(seed: number): string {
  const random = seededRandom(seed);
  let d = "";
  for (let i = 0; i < 84; i++) {
    const y = random() * 1100;
    const x = random() * 1100 - 250;
    const length = 140 + random() * 460;
    const half = (0.8 + random() * 2.8) / 2;
    const mid = (x + length / 2).toFixed(0);
    d += `M${x.toFixed(0)} ${y.toFixed(1)}L${mid} ${(y - half).toFixed(1)}L${(x + length).toFixed(0)} ${y.toFixed(1)}L${mid} ${(y + half).toFixed(1)}Z`;
  }
  return `<svg ${XMLNS} viewBox="0 0 1100 1100" aria-hidden="true"><path d="${d}" fill="${INK}"/></svg>`;
}

/** Manga focus lines (集中線) closing in on (cx, cy), past the corners of a width × height screen. */
export function focusLinesSvg(
  width: number,
  height: number,
  cx: number,
  cy: number,
  seed: number,
): string {
  const random = seededRandom(seed);
  const outer = Math.hypot(width, height) * 1.1;
  const at = (r: number, angle: number) =>
    `${(cx + Math.cos(angle) * r).toFixed(1)} ${(cy + Math.sin(angle) * r).toFixed(1)}`;
  let d = "";
  for (let i = 0; i < 128; i++) {
    const angle = random() * Math.PI * 2;
    const inner = 128 + random() * 120;
    const spread = ((0.12 + random() * 0.8) * Math.PI) / 180;
    d += `M${at(inner, angle)}L${at(outer, angle - spread)}L${at(outer, angle + spread)}Z`;
  }
  return `<svg ${XMLNS} viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" style="left:0;top:0"><path d="${d}" fill="${INK}"/></svg>`;
}

export function svgDataUrl(svg: string): string {
  return "data:image/svg+xml," + encodeURIComponent(svg);
}
