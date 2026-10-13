import { createRoot } from "react-dom/client";
import { StickerFigure } from "../src/stickers/StickerFigure";
import { acquireLight, currentLight, installLight, subscribeLight } from "../src/stickers/light";
import { FinishPreview } from "../src/shop/FinishPreview";
import { StickerLaminate } from "../src/stickers/StickerLaminate";
import { turnLaminate } from "../src/stickers/laminateRenderer";
import { creasePixels, CREASE_SIDES, drape } from "../src/stickers/crease";
import "../src/styles/tokens.css";
import "../src/shop/ShopScreen.css";

const svg = (body: string) =>
  `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240">${body}</svg>`)}`;
const mask = svg('<rect x="2" y="2" width="236" height="236" rx="22" fill="white"/>');
const print = svg(
  '<rect width="240" height="240" fill="white"/><path d="M30 75Q120 10 210 75M30 75V160Q120 200 210 160V75" stroke="black" fill="none" stroke-width="3"/><rect x="35" y="120" width="170" height="40" fill="#888"/><rect x="35" y="190" width="45" height="20" fill="black"/><rect x="100" y="190" width="45" height="20" fill="#d03771"/>',
);
const white = svg('<rect width="240" height="240" fill="white"/>');
const urls = { png: print, mask };
const count = Number(new URLSearchParams(location.search).get("count") ?? 1);
const turn = Number(new URLSearchParams(location.search).get("turn") ?? 0);
const side = Number(new URLSearchParams(location.search).get("side") ?? 240);
const tall = Number(new URLSearchParams(location.search).get("height") ?? side);
const foil = new URLSearchParams(location.search).has("foil");
const board = new URLSearchParams(location.search).has("board");
const detail = new URLSearchParams(location.search).has("detail");
document.body.style.cssText = "margin:0;background:#ddd;padding:20px";
const uninstall = installLight(document.documentElement);
const releaseLight = acquireLight();
window.addEventListener(
  "pagehide",
  () => {
    releaseLight();
    uninstall();
  },
  { once: true },
);
const ramp = new URLSearchParams(location.search).has("ramp");
const field = new Float32Array(240 * 240);
for (let y = 0; y < 240; y++) field.fill(2, y * 240, y * 240 + 120);
const rampPixels = creasePixels({
  width: 240,
  height: 240,
  surface: field,
  own: new Float32Array(240 * 240).fill(1),
  scale: 1,
  lights: CREASE_SIDES,
});
const rampCanvas = document.createElement("canvas");
rampCanvas.width = rampCanvas.height = 240;
const rampContext = rampCanvas.getContext("2d");
if (!rampContext || !rampPixels) throw new Error("The diagnostic ramp normal is missing");
rampContext.putImageData(new ImageData(rampPixels.normal, 240, 240), 0, 0);
const rampNormal = rampCanvas.toDataURL();
const reload = new URLSearchParams(location.search).has("reload");
const replacement: { print: string; normal?: string; turn: number; veiled: boolean } = {
  print,
  turn,
  veiled: false,
};
let started = 0;
const costs: number[] = [];
subscribeLight(() => {
  started = performance.now();
});
declare global {
  interface Window {
    laminateFixture: {
      getPose: typeof currentLight;
      tilt: (beta: number, gamma: number, alpha?: number) => void;
      flight: (x: number, y: number) => void;
      update: (options: Partial<typeof replacement>) => void;
      rampHeight: number[];
      costs: number[];
    };
  }
}
window.laminateFixture = {
  getPose: currentLight,
  costs,
  rampHeight: [...drape(field, 240, 240, 1)],
  update: (options) => {
    Object.assign(replacement, options);
    render();
  },
  flight: (x, y) => {
    const figure = document.querySelector('[data-sticker="0"]');
    const canvas = figure?.querySelector("canvas.sticker-laminate");
    if (!(figure instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement))
      throw new Error("The flight diagnostic sticker is missing");
    figure.style.transform = `rotateX(${x}deg) rotateY(${y}deg)`;
    turnLaminate(canvas, turn, x, y);
  },
  tilt: (beta, gamma, alpha = 0) => {
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), { alpha, beta, gamma }));
  },
};
setTimeout(
  () =>
    subscribeLight(() => {
      costs.push(performance.now() - started);
    }),
  500,
);
const root = document.getElementById("root");
if (!root) throw new Error("The laminate fixture root is missing");
const fixtureRoot = createRoot(root);
const render = () =>
  fixtureRoot.render(
    <>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
        {Array.from({ length: count }, (_, i) => (
          <div
            key={i}
            data-sticker={i}
            style={{ position: "relative", width: side, height: tall, rotate: `${turn}deg` }}
          >
            <StickerFigure
              urls={urls}
              width={240}
              height={240}
              turn={turn}
              kyotoSeika={foil}
              stuck={board}
            />
          </div>
        ))}
        {!board && !detail && (
          <>
            <div data-white style={{ position: "relative", width: side, height: side }}>
              <StickerLaminate print={white} cut={mask} />
            </div>
            <div data-reference-matte style={{ position: "relative", width: side, height: side }}>
              <StickerLaminate print={print} cut={mask} finish="matte" />
            </div>
            <div data-matte style={{ width: side, height: side }}>
              <FinishPreview
                sticker={{ urls, width: 240, height: 240 }}
                side={side / 0.74}
                finish={{ laminate: "matte" }}
              />
            </div>
          </>
        )}
        {ramp && (
          <div data-ramp style={{ position: "relative", width: side, height: side }}>
            <StickerLaminate print={white} cut={mask} normal={rampNormal} turn={turn} />
          </div>
        )}
        {reload && (
          <div
            data-reload
            style={{
              position: "relative",
              width: side,
              height: side,
              rotate: `${replacement.turn}deg`,
            }}
          >
            <span className="sticker-figure">
              <img className="sticker-figure__img" src={print} alt="" />
              <StickerLaminate {...replacement} cut={mask} />
            </span>
          </div>
        )}
        {new URLSearchParams(location.search).has("conceal") && (
          <div data-conceal style={{ position: "relative", width: side, height: side }}>
            <StickerFigure
              urls={{ png: replacement.print, mask }}
              width={240}
              height={240}
              veiled={replacement.veiled}
            />
          </div>
        )}
      </div>
    </>,
  );
render();
