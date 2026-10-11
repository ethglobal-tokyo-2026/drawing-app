import {
  chromium,
  webkit,
} from "../../../../apps/frontend/node_modules/@playwright/test/index.mjs";
import {
  StrokeBuilder,
  sizePx,
} from "../../../../apps/frontend/src/sticker-creation/canvas/brush.ts";
import { dieCut } from "../../../../apps/frontend/src/sticker-creation/sealing/dieCut.ts";

// Run from the repository root:
// node --import ./apps/frontend/node_modules/tsx/dist/loader.mjs docs/reviews/2026-10-10-functional-frontend/evidence/creation-native-dot.mts
// This checks native Canvas pixels in Chromium and WebKit, not a full UI/Pencil gesture.
// A 374 × 748 sheet at density 3 matches the drawing surface dimensions used here.
for (const [name, browserType] of [
  ["chromium", chromium],
  ["webkit", webkit],
] as const) {
  const browser = await browserType.launch({ headless: true, timeout: 10_000 });
  try {
    const page = await browser.newPage();
    const step = 2244 / 512;
    const dot = new StrokeBuilder({
      tool: "brush",
      color: "#000000",
      size: sizePx(0),
      x: (40 * step) / 3,
      y: (40 * step) / 3,
      t: 0,
      T: 0,
      pressure: 0.5,
      pointerType: "pen",
      pressureVaries: false,
      response: "normal",
    }).op;
    for (const large of [false, true]) {
      const pixels = await page.evaluate(
        ({ dot, large }) => {
          const canvas = document.createElement("canvas");
          canvas.width = 1122;
          canvas.height = 2244;
          const g = canvas.getContext("2d")!;
          g.scale(3, 3);
          g.fillStyle = "#000";
          // The single-point circle painted by paintStroke.ts:38,58–60.
          g.beginPath();
          g.arc(dot.pts[0], dot.pts[1], Math.max(dot.pts[2] / 2, 0.3), 0, Math.PI * 2);
          g.fill();
          const dotPixels = g.getImageData(0, 0, canvas.width, canvas.height).data;
          let peakDotAlpha = 0;
          for (let i = 3; i < dotPixels.length; i += 4)
            peakDotAlpha = Math.max(peakDotAlpha, dotPixels[i]);
          if (large) g.fillRect(200, 300, 33.333, 33.333);
          const image = g.getImageData(0, 0, canvas.width, canvas.height);
          return {
            width: canvas.width,
            height: canvas.height,
            peakDotAlpha,
            nonzero: Array.from(image.data).flatMap((a, i) => (i % 4 === 3 && a ? [i, a] : [])),
          };
        },
        { dot, large },
      );
      const data = new Uint8ClampedArray(pixels.width * pixels.height * 4);
      for (let i = 0; i < pixels.nonzero.length; i += 2)
        data[pixels.nonzero[i]] = pixels.nonzero[i + 1];
      const cut = dieCut({ ...pixels, data }, 69);
      const included = cut
        ? !!cut.mask[
            (Math.floor(dot.pts[1] * 3 * cut.scale) + cut.pad) * cut.width +
              Math.floor(dot.pts[0] * 3 * cut.scale) +
              cut.pad
          ]
        : false;
      console.log(
        JSON.stringify({
          browser: name,
          withLargeShape: large,
          brushWidth: dot.pts[2],
          peakDotAlpha: pixels.peakDotAlpha,
          nonzeroAlphaPixels: pixels.nonzero.length / 2,
          cutFound: !!cut,
          dotIncluded: included,
        }),
      );
    }
  } finally {
    await browser.close();
  }
}
