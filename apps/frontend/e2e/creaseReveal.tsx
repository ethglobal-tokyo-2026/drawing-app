import { createRoot } from "react-dom/client";
import { StickerFigure, type Crease } from "../src/stickers/StickerFigure";
import { creasePixels, CREASE_SIDES, type CreaseImage } from "../src/stickers/crease";
import { acquireLight, currentLight, installLight } from "../src/stickers/light";
import { refreshLaminate } from "../src/stickers/laminateRenderer";
import "../src/styles/tokens.css";

const side = 240;
const width = Number(new URLSearchParams(location.search).get("width") ?? side);
const height = Number(new URLSearchParams(location.search).get("height") ?? side);
const softCut = new URLSearchParams(location.search).has("softcut");
const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${side}" height="${side}">${body}</svg>`)}`;
const print = svg(
  '<rect width="240" height="240" fill="white"/>' +
    (softCut ? '<rect width="12" height="240" fill="black"/>' : "") +
    '<circle cx="120" cy="120" r="16" fill="#d03771"/><path d="M110 116h20m-10-6v20" stroke="#182536" stroke-width="3"/>',
);
const mask = svg(
  softCut
    ? '<rect x="12" width="228" height="240" fill="white"/><rect width="12" height="240" fill="white" fill-opacity=".5"/>'
    : '<rect width="240" height="240" fill="white"/>',
);
const surface = new Float32Array(side * side);
const own = new Float32Array(side * side).fill(1);
if (softCut) for (let y = 0; y < side; y++) own.fill(0.5, y * side, y * side + 12);
for (const [left, top] of [
  [32, 32],
  [160, 160],
])
  for (let y = top; y < top + 48; y++) surface.fill(3, y * side + left, y * side + left + 48);
const pixels = creasePixels({
  width: side,
  height: side,
  surface,
  own,
  scale: 1,
  lights: CREASE_SIDES,
});
if (!pixels) throw new Error("The finite supports did not produce crease geometry");
const image = (name: CreaseImage) => {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = side;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("The crease reveal image context is missing");
  context.putImageData(new ImageData(pixels[name], side, side), 0, 0);
  return canvas.toDataURL();
};
const images: Crease = {
  base: image("base"),
  normal: image("normal"),
  topLeft: image("topLeft"),
  bottomRight: image("bottomRight"),
  topRight: image("topRight"),
  bottomLeft: image("bottomLeft"),
};
document.body.style.cssText = "margin:0;padding:20px;background:#ddd";
const uninstall = installLight(document.documentElement);
const release = acquireLight();
window.addEventListener("pagehide", () => {
  release();
  uninstall();
});
const element = document.getElementById("root");
if (!element) throw new Error("The crease reveal fixture root is missing");
const root = createRoot(element);
let crease: Crease | undefined;
let shownPrint = print;
let generation = 0;
const render = () =>
  root.render(
    <div
      data-reveal
      className={`placed-sticker${crease ? "" : " is-dragging"}`}
      style={{ position: "relative", width, height }}
    >
      <StickerFigure
        urls={{ png: shownPrint, mask }}
        width={width}
        height={height}
        stuck
        crease={crease}
      />
    </div>,
  );
declare global {
  interface Window {
    creaseRevealFixture: {
      imageData: Crease;
      drop: () => number;
      lift: () => void;
      replacePrint: (url: string) => void;
      refresh: () => void;
      tilt: (beta: number, gamma: number) => void;
      pose: typeof currentLight;
    };
  }
}
window.creaseRevealFixture = {
  imageData: images,
  drop: () => {
    ++generation;
    const url = (name: CreaseImage) => `/e2e/crease-reveal-${name}.png?bake=${generation}`;
    crease = {
      base: url("base"),
      topLeft: url("topLeft"),
      bottomRight: url("bottomRight"),
      topRight: url("topRight"),
      bottomLeft: url("bottomLeft"),
      normal: url("normal"),
    };
    render();
    return generation;
  },
  lift: () => {
    crease = undefined;
    render();
  },
  replacePrint: (url) => {
    shownPrint = url;
    render();
  },
  refresh: () => {
    const canvas = document.querySelector("[data-reveal] canvas.sticker-laminate");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The fixture laminate is missing");
    refreshLaminate(canvas);
  },
  tilt: (beta, gamma) =>
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), { alpha: 0, beta, gamma })),
  pose: currentLight,
};
render();
