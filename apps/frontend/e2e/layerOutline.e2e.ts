import { expect, test } from "@playwright/test";

test("cropped outlines follow the rounded sheet boundary at fractional sizes", async ({
  browser,
  baseURL,
}) => {
  const context = await browser.newContext({
    baseURL,
    viewport: { width: 700, height: 640 },
    deviceScaleFactor: 3,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.route("**/e2e-layer-outline", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>",
    }),
  );
  await page.goto("/e2e-layer-outline");
  const clockStart = new Date();
  await page.clock.install({ time: clockStart });
  await page.clock.pauseAt(new Date(clockStart.getTime() + 10_000));
  await page.evaluate(async () => {
    const { flashLayer } = await import("../src/sticker-creation/layers/layerFlash.ts");
    await import("../src/sticker-creation/layers/layerDisplay.css");
    document.body.style.cssText = "margin:0;background:#122232";
    for (const [i, edge] of ["interior", "top", "corners"].entries()) {
      const sheet = document.createElement("div");
      sheet.style.cssText = `position:absolute;left:20px;top:${20 + i * 190}px;width:200.25px;height:160.25px;border-radius:4px`;
      document.body.append(sheet);
      const layer = document.createElement("canvas");
      layer.width = 601;
      layer.height = 481;
      const g = layer.getContext("2d");
      if (!g) throw new Error("No artwork context");
      if (edge === "corners") {
        for (const [x, y] of [
          [6, 6],
          [583, 6],
          [6, 463],
          [583, 463],
        ])
          g.fillRect(x, y, 12, 12);
        g.fillRect(594, 210, 3, 60);
        g.fillRect(210, 474, 60, 3);
      } else g.fillRect(301, edge === "top" ? 0 : 211, 150, 120);
      const above = document.createElement("canvas");
      above.width = above.height = 0;
      const flash = flashLayer({
        layer,
        above,
        inked:
          edge === "corners"
            ? { x: 6, y: 6, w: 591, h: 471 }
            : { x: 301, y: edge === "top" ? 0 : 211, w: 150, h: 120 },
        opacity: 100,
        sheet,
        onEnd() {},
      });
      const outline = sheet.querySelector<HTMLCanvasElement>(".layer-flash__outline");
      const pulse = sheet.querySelector<HTMLCanvasElement>(".layer-flash__pulse");
      if (!outline || !pulse || !flash) throw new Error("No outline feedback");
      pulse.style.visibility = "hidden";
      outline.style.opacity = "1";

      // A full-sheet reference clips only physical sheet corners, independent of crop layout.
      const reference = document.createElement("div");
      reference.style.cssText = `${sheet.style.cssText};left:340px;overflow:hidden`;
      const expected = document.createElement("canvas");
      expected.width = outline.width;
      expected.height = outline.height;
      expected.style.cssText = outline.style.cssText;
      expected.style.position = "absolute";
      expected.style.borderRadius = "0";
      expected.style.clipPath = "none";
      const eg = expected.getContext("2d");
      if (!eg) throw new Error("No reference context");
      eg.drawImage(outline, 0, 0);
      reference.append(expected);
      document.body.append(reference);
    }
  });
  const rendered = await page.screenshot({ scale: "device" });
  const samples = await page.evaluate(async (png) => {
    const picture = new Image();
    picture.src = `data:image/png;base64,${png}`;
    await picture.decode();
    const pixels = document.createElement("canvas");
    pixels.width = picture.width;
    pixels.height = picture.height;
    const g = pixels.getContext("2d");
    if (!g) throw new Error("No screenshot context");
    g.drawImage(picture, 0, 0);
    const at = (x: number, y: number) => [
      ...g.getImageData(Math.floor((x + 0.5) * 3), Math.floor((y + 0.5) * 3), 1, 1).data,
    ];
    return [
      [
        [98, 68],
        [98, 69],
        [99, 68],
      ],
      [
        [97, 0],
        [97, 1],
        [98, 0],
        [98, 1],
        [99, 0],
      ],
      [
        [0, 0],
        [1, 0],
        [0, 1],
        [199, 159],
        [200, 160],
        [200 - 1 / 3, 80],
        [80, 160 - 1 / 3],
      ],
    ].flatMap((points, i) =>
      points.map(([x, y]) => ({
        at: [i, x, y],
        actual: at(20 + x, 20 + i * 190 + y),
        expected: at(340 + x, 20 + i * 190 + y),
      })),
    );
  }, rendered.toString("base64"));
  expect(samples.find(({ at }) => at[0] === 1 && at[1] === 98 && at[2] === 0)?.expected).toEqual([
    255, 255, 255, 255,
  ]);
  for (const sample of samples) {
    expect(sample.expected[3]).toBe(255);
    expect(
      Math.max(...sample.actual.map((v, i) => Math.abs(v - sample.expected[i]))),
      JSON.stringify(sample),
    ).toBeLessThanOrEqual(2);
  }
  await context.close();
});

for (const dpr of [1, 2, 3]) {
  test(`cropped circular layer feedback at DPR ${dpr}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: dpr,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.route("**/e2e-layer-outline", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>",
      }),
    );
    await page.goto("/e2e-layer-outline");
    const result = await page.evaluate(async (density) => {
      const { flashLayer } = await import("../src/sticker-creation/layers/layerFlash.ts");
      const sheet = document.createElement("div");
      sheet.style.cssText = "position:relative;width:200px;height:160px";
      document.body.append(sheet);
      const layer = document.createElement("canvas");
      layer.width = 200 * density;
      layer.height = 160 * density;
      const g = layer.getContext("2d");
      if (!g) throw new Error("No artwork context");
      const image = g.createImageData(1, 1);
      image.data.set([255, 79, 154, 1]);
      g.putImageData(image, 100 * density, 80 * density);
      const before = layer.toDataURL();
      const above = document.createElement("canvas");
      above.width = above.height = 0;
      const flash = flashLayer({
        layer,
        above,
        inked: { x: 100 * density, y: 80 * density, w: 1, h: 1 },
        opacity: 100,
        sheet,
        onEnd() {},
      });
      const outline = sheet.querySelector<HTMLCanvasElement>(".layer-flash__outline");
      const og = outline?.getContext("2d");
      if (!outline || !og || !flash) throw new Error("No alpha-1 outline");
      const box = outline.getBoundingClientRect();
      const host = sheet.getBoundingClientRect();
      const data = og.getImageData(0, 0, outline.width, outline.height).data;
      const at = (dx: number, dy: number) => {
        const x = Math.round((100 - (box.left - host.left)) * density + dx);
        const y = Math.round((80 - (box.top - host.top)) * density + dy);
        if (x < 0 || y < 0 || x >= outline.width || y >= outline.height) return 0;
        return data[(y * outline.width + x) * 4 + 3];
      };
      const measured = {
        raster: [outline.width, outline.height],
        density: outline.width / box.width,
        interior: at(0, 0),
        axis: at(2 * density, 0),
        diagonal: at(2 * density, 2 * density),
        outside: at(3 * density, 3 * density),
        feather: [...data].some((v, i) => i % 4 === 3 && v > 0 && v < 255),
        unchanged: before === layer.toDataURL(),
      };
      flash.cancel();
      return measured;
    }, dpr);
    expect(result.raster[0]).toBeLessThan(30);
    expect(result.raster[1]).toBeLessThan(30);
    expect(result.density).toBeCloseTo(dpr, 2);
    expect(result.interior).toBe(0);
    expect(result.axis).toBeGreaterThan(result.diagonal);
    expect(result.outside).toBe(0);
    expect(result.feather).toBe(true);
    expect(result.unchanged).toBe(true);
    await context.close();
  });

  test(`resized curves, translucent fills, holes and clipped ink at DPR ${dpr}`, async ({
    browser,
    baseURL,
  }) => {
    const context = await browser.newContext({
      baseURL,
      viewport: { width: 1024, height: 768 },
      deviceScaleFactor: dpr,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    await page.route("**/e2e-layer-outline", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'>",
      }),
    );
    await page.goto("/e2e-layer-outline");
    const results = await page.evaluate(async () => {
      const { flashLayer } = await import("../src/sticker-creation/layers/layerFlash.ts");
      const layer = document.createElement("canvas");
      layer.width = 600;
      layer.height = 480;
      const g = layer.getContext("2d");
      if (!g) throw new Error("No artwork context");
      g.fillStyle = "#000";
      g.beginPath();
      g.arc(120, 110, 30, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = 3;
      g.strokeStyle = "#ff4f9a";
      g.beginPath();
      g.moveTo(220, 50);
      g.bezierCurveTo(260, 150, 400, 20, 450, 140);
      g.stroke();
      const faint = g.createImageData(1, 1);
      faint.data.set([255, 79, 154, 1]);
      for (let i = 0; i < 100; i++) g.putImageData(faint, 70 + i, 230 + i);
      g.fillStyle = "rgba(41,141,255,0.25)";
      g.fillRect(300, 240, 180, 180);
      g.clearRect(340, 290, 80, 80);
      g.save();
      g.beginPath();
      g.rect(220, 240, 35, 100);
      g.clip();
      g.fillRect(200, 230, 100, 120);
      g.restore();
      const before = layer.toDataURL();
      const above = document.createElement("canvas");
      above.width = above.height = 0;
      const sheet = document.createElement("div");
      document.body.append(sheet);
      const all = [];
      for (const width of [200, 135.5, 360]) {
        sheet.style.cssText = `position:relative;width:${width}px;height:${width * 0.8}px`;
        const flash = flashLayer({
          layer,
          above,
          inked: { x: 60, y: 40, w: 430, h: 390 },
          opacity: 100,
          sheet,
          onEnd() {},
        });
        const outline = sheet.querySelector<HTMLCanvasElement>(".layer-flash__outline");
        const og = outline?.getContext("2d");
        if (!outline || !og || !flash) throw new Error("No resized outline");
        const density = outline.width / Number.parseFloat(outline.style.width);
        const data = og.getImageData(0, 0, outline.width, outline.height).data;
        const at = (x: number, y: number) => {
          const px = Math.floor(
            ((x * width) / 600 - Number.parseFloat(outline.style.left)) * density,
          );
          const py = Math.floor(
            ((y * width) / 600 - Number.parseFloat(outline.style.top)) * density,
          );
          return data[(py * outline.width + px) * 4 + 3];
        };
        all.push({
          width,
          density,
          circleInterior: at(120, 110),
          circleBorder: at(150 + (2 * 600) / width, 110),
          curveBorder: at(331.25, 87.5 - (2 * 600) / width),
          fillInterior: at(325, 270),
          holeInterior: at(380, 330),
          holeBorder: at(340 + (2 * 600) / width, 330),
          clippedInterior: at(237, 280),
          beyondClip: at(275, 280),
          diagonalBorder: at(120 + 600 / width, 280 - 600 / width),
          feather: [...data].some((v, i) => i % 4 === 3 && v > 0 && v < 255),
          unchanged: before === layer.toDataURL(),
        });
        flash.cancel();
      }
      return all;
    });
    for (const result of results) {
      expect(result.density).toBeCloseTo(Math.min(dpr, 600 / result.width), 4);
      expect(result.circleInterior).toBe(0);
      expect(result.circleBorder).toBeGreaterThan(0);
      expect(result.curveBorder, JSON.stringify(result)).toBeGreaterThan(0);
      expect(result.fillInterior).toBe(0);
      expect(result.holeInterior).toBe(0);
      expect(result.holeBorder).toBeGreaterThan(0);
      expect(result.clippedInterior).toBe(0);
      expect(result.beyondClip).toBe(0);
      expect(result.diagonalBorder).toBeGreaterThan(0);
      expect(result.feather).toBe(true);
      expect(result.unchanged).toBe(true);
    }
    await context.close();
  });
}
