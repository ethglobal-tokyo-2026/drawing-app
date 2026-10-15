import { expect, test } from "@playwright/test";
import { emptyLaminatePage } from "./stickerMaterialFixture";

/** The fractional cut's levels, one per column from left to right. */
const cutLevels = [0, 3, 26, 94, 204, 252, 255];
const cases = [
  { print: "white", finish: "gloss", normal: false, turn: 0, tiltX: 0, tiltY: 0 },
  { print: "line art", finish: "gloss", normal: true, turn: 27, tiltX: 12, tiltY: -8 },
  { print: "gray", finish: "gloss", normal: true, turn: -31, tiltX: -9, tiltY: 14 },
  { print: "saturated ink", finish: "gloss", normal: false, turn: 113, tiltX: 8, tiltY: 5 },
  { print: "line art", finish: "matte", normal: true, turn: 43, tiltX: -12, tiltY: 7 },
  { print: "saturated ink", finish: "matte", normal: true, turn: -73, tiltX: 5, tiltY: -11 },
] as const;

test.use({ viewport: { width: 1032, height: 768 }, deviceScaleFactor: 2 });

// The app is its own reference: the light depends on where a sticker sits and the device's pose, so
// each material is drawn in one place twice, with an opaque cut and then a fractional one.
test("premultiplied laminate keeps its opaque color and fractional cut over light and dark backgrounds", async ({
  page,
}, info) => {
  await emptyLaminatePage(page);
  await page.goto("/e2e/stickerLaminate.html");
  const reports = await page.evaluate(
    async ({ cutLevels, cases }) => {
      const { mountSticker, updateSticker, turnSticker, whenStickerSettled } =
        await import("../src/stickers/stickerRenderer.ts");
      const { required, solidPng } = await import("./stickerMaterialFixture.ts");
      const width = 140;
      const height = 112;
      const png = (w: number, h: number, pixel: (x: number, y: number) => readonly number[]) => {
        const source = document.createElement("canvas");
        source.width = w;
        source.height = h;
        const context = required(source.getContext("2d"));
        const pixels = context.createImageData(w, h);
        for (let y = 0; y < h; y++)
          for (let x = 0; x < w; x++) pixels.data.set(pixel(x, y), (y * w + x) * 4);
        context.putImageData(pixels, 0, 0);
        const url = source.toDataURL("image/png");
        source.width = source.height = 0;
        return url;
      };
      const normal = png(width, height, (x, y) => [
        128 + Math.round(18 * Math.sin(x / 9)),
        128 + Math.round(12 * Math.cos(y / 13)),
        253,
        255,
      ]);
      const prints = new Map(
        cases.map(({ print }) => [
          print,
          png(width, height, (x, y) => {
            if (print === "gray") return [128, 128, 128, 255];
            if (print === "saturated ink")
              return y < height / 2 ? [220, 24, 100, 255] : [17, 89, 231, 127];
            if (print === "line art" && (x % 23 < 3 || y % 29 < 2)) return [18, 18, 18, 255];
            return [255, 255, 255, 255];
          }),
        ]),
      );
      const opaqueCut = solidPng(width, height, "white");
      const pixelsOf = (source: HTMLCanvasElement) =>
        required(source.getContext("2d")).getImageData(0, 0, source.width, source.height).data;
      const over = (source: HTMLCanvasElement, fill: string) => {
        const result = document.createElement("canvas");
        result.width = source.width;
        result.height = source.height;
        const context = required(result.getContext("2d"));
        context.fillStyle = fill;
        context.fillRect(0, 0, result.width, result.height);
        context.drawImage(source, 0, 0);
        const pixels = context.getImageData(0, 0, result.width, result.height).data;
        result.width = result.height = 0;
        return pixels;
      };
      const canvas = document.createElement("canvas");
      canvas.style.cssText = `position:absolute;left:20px;top:20px;width:${width}px;height:${height}px`;
      document.body.append(canvas);
      const settle = async (what: string) => {
        const signal = AbortSignal.timeout(20_000);
        await whenStickerSettled(canvas, undefined, signal);
        if (signal.aborted || canvas.dataset.state !== "ready")
          throw new Error(`The laminate snapshot ${what} was not ready within 20 seconds`);
      };
      const first = required(cases[0]);
      const release = mountSticker(canvas, {
        print: required(prints.get(first.print)),
        cut: opaqueCut,
        turn: first.turn,
        finish: first.finish,
      });
      const expected = document.createElement("canvas");
      try {
        await settle("with the opaque cut");
        // The fractional cut has the snapshot's own pixels, so every pixel samples exactly its level.
        const columns = Array.from({ length: canvas.width }, (_, x) =>
          required(cutLevels[Math.floor((x * cutLevels.length) / canvas.width)]),
        );
        const levelAt = (pixel: number) => required(columns[(pixel / 4) % canvas.width]);
        const fractionalCut = png(canvas.width, canvas.height, (x) => [
          255,
          255,
          255,
          required(columns[x]),
        ]);
        const reports = [];
        for (const material of cases) {
          const shown = {
            print: required(prints.get(material.print)),
            normal: material.normal ? normal : undefined,
            finish: material.finish,
          };
          updateSticker(canvas, { ...shown, cut: opaqueCut });
          turnSticker(canvas, material.turn, material.tiltX, material.tiltY);
          await settle(`of ${material.print} with the opaque cut`);
          const opaque = pixelsOf(canvas);
          updateSticker(canvas, { ...shown, cut: fractionalCut });
          await settle(`of ${material.print} with the fractional cut`);
          const fractional = pixelsOf(canvas);
          // What a straight-alpha laminate shows: the opaque snapshot's color under the cut's alpha.
          const straight = new ImageData(
            new Uint8ClampedArray(opaque),
            canvas.width,
            canvas.height,
          );
          let alphaMaximumDifference = 0;
          let opaqueMaximumDifference = 0;
          for (let pixel = 0; pixel < fractional.length; pixel += 4) {
            const level = levelAt(pixel);
            straight.data[pixel + 3] = level;
            alphaMaximumDifference = Math.max(
              alphaMaximumDifference,
              255 - opaque[pixel + 3],
              Math.abs(fractional[pixel + 3] - level),
            );
            if (level === 255)
              for (let channel = 0; channel < 3; channel++)
                opaqueMaximumDifference = Math.max(
                  opaqueMaximumDifference,
                  Math.abs(fractional[pixel + channel] - opaque[pixel + channel]),
                );
          }
          expected.width = canvas.width;
          expected.height = canvas.height;
          required(expected.getContext("2d")).putImageData(straight, 0, 0);
          const backgrounds = [
            { background: "light", fill: "white" },
            { background: "dark", fill: "#181818" },
          ].map(({ background, fill }) => {
            const actual = over(canvas, fill);
            const wanted = over(expected, fill);
            let fractionalMaximumDifference = 0;
            let nonFractionalMaximumDifference = 0;
            for (let pixel = 0; pixel < actual.length; pixel += 4) {
              const level = levelAt(pixel);
              for (let channel = 0; channel < 3; channel++) {
                const difference = Math.abs(actual[pixel + channel] - wanted[pixel + channel]);
                if (level > 0 && level < 255)
                  fractionalMaximumDifference = Math.max(fractionalMaximumDifference, difference);
                else
                  nonFractionalMaximumDifference = Math.max(
                    nonFractionalMaximumDifference,
                    difference,
                  );
              }
            }
            return { background, fractionalMaximumDifference, nonFractionalMaximumDifference };
          });
          reports.push({ material, alphaMaximumDifference, opaqueMaximumDifference, backgrounds });
        }
        return reports;
      } finally {
        release();
        canvas.remove();
        expected.width = expected.height = 0;
      }
    },
    { cutLevels, cases },
  );
  await info.attach("laminate-alpha", {
    body: JSON.stringify(reports),
    contentType: "application/json",
  });
  for (const report of reports) {
    const material = JSON.stringify(report.material);
    expect(report.alphaMaximumDifference, material).toBe(0);
    expect(report.opaqueMaximumDifference, material).toBe(0);
    for (const background of report.backgrounds) {
      expect(
        background.nonFractionalMaximumDifference,
        `${material} clear and opaque over ${background.background}`,
      ).toBe(0);
      // The app rounds its color once, after premultiplying; the straight reference rounds the
      // opaque color, then premultiplies it. Each order can move a level, before and after compositing.
      expect(
        background.fractionalMaximumDifference,
        `${material} over ${background.background}`,
      ).toBeLessThanOrEqual(2);
    }
  }
});

test("complete material covers fractional paper edges and independent sealing amounts", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?board=1");
  const result = await page.evaluate(async () => {
    const { required, solidPng } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const png = (alpha: number) => solidPng(32, 32, `rgba(255,255,255,${alpha / 255})`);
    const c = document.createElement("canvas");
    c.style.cssText = "position:absolute;left:20px;top:20px;width:32px;height:32px";
    document.body.append(c);
    const foil = { style: "silver" as const, size: "board" as const, mask: png(128) };
    const material = { print: png(255), cut: png(128), finish: "gloss" as const, foil };
    const release = api.mountSticker(c, { ...material, turn: 0 });
    const pixel = () =>
      Array.from(required(c.getContext("2d")).getImageData(c.width / 2, c.height / 2, 1, 1).data);
    try {
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const combined = pixel();
      api.setStickerAmounts(c, 0, 1);
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const foilOnly = pixel();
      api.setStickerAmounts(c, 1, 0);
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const paperOnly = pixel();
      api.setStickerAmounts(c, 1, 1);
      api.updateSticker(c, { ...material, cut: png(255) });
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const opaque = pixel();
      api.setStickerAmounts(c, 0, 1);
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const occluded = pixel();
      api.setStickerAmounts(c, 1, 1);
      api.updateSticker(c, { ...material, cut: png(255), foil: undefined });
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      return { combined, foilOnly, paperOnly, opaque, occluded, paper: pixel() };
    } finally {
      release();
      c.remove();
    }
  });
  expect(result.combined[3]).toBeCloseTo(192, -0.3);
  expect(result.opaque).toEqual(result.paper);
  expect(result.occluded).toEqual([0, 0, 0, 0]);
  expect(result.foilOnly[3]).toBeCloseTo(64, -0.3);
  expect(result.paperOnly[3]).toBe(128);
  for (let channel = 0; channel < 3; channel++) {
    const expected =
      (result.paperOnly[channel] * result.paperOnly[3]) / 255 +
      (result.foilOnly[channel] * result.foilOnly[3]) / 255;
    expect(
      Math.abs((result.combined[channel] * result.combined[3]) / 255 - expected),
    ).toBeLessThanOrEqual(2);
  }
});
