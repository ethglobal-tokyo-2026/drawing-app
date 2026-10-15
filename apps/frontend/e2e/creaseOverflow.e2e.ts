import { expect, test, type Page } from "@playwright/test";
import type { CreaseJob, CreaseReply } from "../src/stickers/creaseWorker";

for (const scenario of ["overflow", "normal-only", "ordinary", "empty"] as const) {
  test(`real worker registers ${scenario} coverage and its painted source frame`, async ({
    page,
  }) => {
    await page.goto("/e2e/stickerLaminate.html?board=1");
    const result = await page.evaluate(async (scenario) => {
      const { required } = await import("./stickerMaterialFixture.ts");
      const { CREASE_SIDES, creasePixels, stackedSurface } =
        await import("../src/stickers/crease.ts");
      const { foilCoverage } = await import("../src/stickers/foilCoverage.ts");
      const { mountSticker, whenStickerSettled } =
        await import("../src/stickers/stickerRenderer.ts");
      const side = 600,
        size = 120,
        grow = scenario === "normal-only" ? 24 : 2.88;
      const make = (paint: (g: CanvasRenderingContext2D) => void) => {
        const c = document.createElement("canvas");
        c.width = c.height = side;
        const g = required(c.getContext("2d"));
        g.fillStyle = "white";
        paint(g);
        return c;
      };
      // The board fixture has 600px sources and a 3px margin. A 30px ordinary margin
      // exceeds the actual 14.4px source growth at this display size.
      const cut = make((g) => {
        if (scenario !== "empty")
          g.fillRect(
            scenario === "ordinary" ? 30 : 3,
            30,
            scenario === "ordinary" ? 540 : 567,
            540,
          );
      });
      const lower = make((g) => g.fillRect(0, 0, side, side));
      const raw = required(cut.getContext("2d")).getImageData(0, 0, side, side).data;
      const alpha = new Uint8ClampedArray(side * side);
      for (let i = 0; i < alpha.length; i++) alpha[i] = raw[i * 4 + 3];
      const coverage = foilCoverage(alpha, side, side, (grow * side) / size, 8);
      const job: CreaseJob = {
        id: "overflow",
        key: scenario,
        width: size,
        height: size,
        scale: 1,
        own: { url: cut.toDataURL(), grow },
        lights: {
          topLeft: [...CREASE_SIDES.topLeft],
          bottomRight: [...CREASE_SIDES.bottomRight],
          topRight: [...CREASE_SIDES.topRight],
          bottomLeft: [...CREASE_SIDES.bottomLeft],
        },
        under: [
          {
            url: lower.toDataURL(),
            grow: 0,
            w: 200,
            h: 200,
            at: [Math.cos(0.2), Math.sin(0.2), -Math.sin(0.2), Math.cos(0.2), -184, -80],
          },
        ],
      };
      if (scenario === "normal-only") {
        job.under[0].at = [1, 0, 0, 1, -218, -80];
        job.under.unshift({ ...job.under[0], url: make(() => {}).toDataURL() });
      }
      const worker = new Worker("/src/stickers/creaseWorker.ts?worker_file&type=module", {
        type: "module",
      });
      const reply = await new Promise<CreaseReply>((resolve, reject) => {
        const timer = setTimeout(() => {
          worker.terminate();
          reject(new Error("Overflow bake exceeded 25 seconds"));
        }, 25000);
        worker.onerror = (e) => {
          clearTimeout(timer);
          worker.terminate();
          reject(new Error(e.message));
        };
        worker.onmessage = (e: MessageEvent<CreaseReply>) => {
          clearTimeout(timer);
          worker.terminate();
          resolve(e.data);
        };
        worker.postMessage({ board: "overflow", batch: 1, start: true, jobs: [job] });
      });
      if (!reply.ok) throw new Error(reply.error);
      const images: Record<string, { width: number; height: number; data: Uint8ClampedArray }> = {};
      if (reply.crease)
        for (const name of [
          "normal",
          "base",
          "topLeft",
          "bottomRight",
          "topRight",
          "bottomLeft",
        ] as const) {
          const bitmap = await createImageBitmap(reply.crease[name]);
          const c = document.createElement("canvas");
          c.width = bitmap.width;
          c.height = bitmap.height;
          const g = required(c.getContext("2d"));
          g.drawImage(bitmap, 0, 0);
          bitmap.close();
          images[name] = {
            width: c.width,
            height: c.height,
            data: g.getImageData(0, 0, c.width, c.height).data,
          };
        }
      const bounds = reply.normalBounds;
      let outside = 0;
      if (bounds && images.normal) {
        const n = images.normal;
        for (let y = 0; y < n.height; y++)
          for (let x = 0; x < n.width; x++) {
            const sx = bounds.x * size + x,
              sy = bounds.y * size + y,
              q = (y * n.width + x) * 4;
            if (sx < 0 && sy > 20 && sy < 100 && (n.data[q] !== 128 || n.data[q + 1] !== 128))
              outside++;
          }
      }
      let ordinaryEqual = true;
      if (scenario === "ordinary") {
        if (!reply.crease) throw new Error("The ordinary worker must return its six crease images");
        const c = new OffscreenCanvas(size, size),
          g = required(c.getContext("2d"));
        const downsample = (source: HTMLCanvasElement) => {
          const d = new OffscreenCanvas(320, 320);
          required(d.getContext("2d")).drawImage(source, 0, 0, 320, 320);
          return d;
        };
        const a = () => {
          const rgba = g.getImageData(0, 0, size, size).data;
          return Float32Array.from({ length: size * size }, (_, i) => rgba[i * 4 + 3] / 255);
        };
        g.setTransform(...job.under[0].at);
        g.drawImage(downsample(lower), 0, 0, 200, 200);
        const support = a();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, size, size);
        for (const [x, y] of [
          [0, 0],
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [Math.SQRT1_2, Math.SQRT1_2],
          [Math.SQRT1_2, -Math.SQRT1_2],
          [-Math.SQRT1_2, Math.SQRT1_2],
          [-Math.SQRT1_2, -Math.SQRT1_2],
        ])
          g.drawImage(downsample(cut), x * grow, y * grow, size, size);
        const baseline = creasePixels({
          width: size,
          height: size,
          scale: 1,
          lights: job.lights,
          own: a(),
          surface: stackedSurface([support], size, size),
        });
        ordinaryEqual = !!baseline;
        if (baseline && reply.crease)
          for (const k of [
            "normal",
            "base",
            "topLeft",
            "bottomRight",
            "topRight",
            "bottomLeft",
          ] as const) {
            g.putImageData(new ImageData(baseline[k], size, size), 0, 0);
            const expected = new Uint8Array(
              await (await c.convertToBlob({ type: "image/png" })).arrayBuffer(),
            );
            const actual = new Uint8Array(await reply.crease[k].arrayBuffer());
            ordinaryEqual &&=
              expected.length === actual.length && expected.every((v, i) => v === actual[i]);
          }
      }
      let registrationEqual = true;
      let paintPeak = 0;
      for (const name of ["base", "topLeft", "bottomRight", "topRight", "bottomLeft"])
        for (let q = 3; q < (images[name]?.data.length ?? 0); q += 4)
          paintPeak = Math.max(paintPeak, images[name].data[q]);
      if (scenario === "overflow" && bounds) {
        // An independently larger support canvas is a reference for both registered normals
        // and source-frame paint. Its real support edge continues through the added region.
        const padding = 110,
          w = size + 2 * padding,
          c = new OffscreenCanvas(w, w),
          // Match the worker's readback rasterization before comparing geometry exactly.
          g = required(c.getContext("2d", { willReadFrequently: true }));
        const downsample = (source: HTMLCanvasElement) => {
          const d = new OffscreenCanvas(320, 320);
          required(d.getContext("2d")).drawImage(source, 0, 0, 320, 320);
          return d;
        };
        const a = () => {
          const rgba = g.getImageData(0, 0, w, w).data;
          return Float32Array.from({ length: w * w }, (_, i) => rgba[i * 4 + 3] / 255);
        };
        const at = job.under[0].at;
        g.setTransform(at[0], at[1], at[2], at[3], at[4] + padding, at[5] + padding);
        g.drawImage(downsample(lower), 0, 0, 200, 200);
        const surface = a();
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.clearRect(0, 0, w, w);
        g.translate(padding, padding);
        for (const [x, y] of [
          [0, 0],
          [1, 0],
          [-1, 0],
          [0, 1],
          [0, -1],
          [Math.SQRT1_2, Math.SQRT1_2],
          [Math.SQRT1_2, -Math.SQRT1_2],
          [-Math.SQRT1_2, Math.SQRT1_2],
          [-Math.SQRT1_2, -Math.SQRT1_2],
        ])
          g.drawImage(downsample(cut), x * grow, y * grow, size, size);
        const reference = creasePixels({
          width: w,
          height: w,
          scale: 1,
          lights: job.lights,
          own: a(),
          surface,
        });
        if (!reference) throw new Error("Reference geometry has no support");
        for (const name of [
          "normal",
          "base",
          "topLeft",
          "bottomRight",
          "topRight",
          "bottomLeft",
        ] as const) {
          const image = images[name],
            ox = padding + (name === "normal" ? Math.round(bounds.x * size) : 0),
            oy = padding + (name === "normal" ? Math.round(bounds.y * size) : 0);
          for (let y = 0; y < image.height; y++)
            for (let x = 0; x < image.width; x++) {
              const q = (y * image.width + x) * 4,
                r = ((y + oy) * w + x + ox) * 4;
              if (name === "normal")
                for (let channel = 0; channel < 4; channel++)
                  registrationEqual &&= image.data[q + channel] === reference[name][r + channel];
              else registrationEqual &&= image.data[q + 3] === reference[name][r + 3];
            }
        }
      }
      let state = "empty",
        diagnostic = "";
      if (reply.crease && bounds) {
        const c = document.createElement("canvas");
        c.style.cssText = `width:${size}px;height:${size}px`;
        document.body.append(c);
        const dispose = mountSticker(c, {
          print: cut.toDataURL(),
          cut: cut.toDataURL(),
          normal: URL.createObjectURL(reply.crease.normal),
          normalBounds: bounds,
          turn: 23,
          finish: "gloss",
          foil: { style: "kyoto-seika", size: "board" },
        });
        const signal = AbortSignal.timeout(20000);
        await whenStickerSettled(c, undefined, signal);
        state = c.dataset.state ?? "";
        diagnostic = c.dataset.error ?? "";
        dispose();
        c.remove();
      }
      return {
        bounds,
        outside,
        ordinaryEqual,
        registrationEqual,
        paintPeak,
        state,
        diagnostic,
        empty: reply.crease === null,
        coverage: { x: coverage.x, y: coverage.y, width: coverage.width, height: coverage.height },
        images: Object.fromEntries(
          Object.entries(images).map(([k, v]) => [k, { width: v.width, height: v.height }]),
        ),
      };
    }, scenario);
    if (scenario === "overflow" || scenario === "normal-only") {
      expect(result.bounds).toBeDefined();
      if (!result.bounds) throw new Error("The worker omitted normal bounds");
      expect(result.bounds.x).toBeLessThanOrEqual(result.coverage.x / 600);
      expect(result.outside).toBeGreaterThan(0);
      expect(result.registrationEqual).toBe(true);
      if (scenario === "normal-only") expect(result.paintPeak).toBe(0);
      expect(result.state).toBe("ready");
      expect(result.diagnostic).toBe("");
      for (const name of ["base", "topLeft", "bottomRight", "topRight", "bottomLeft"])
        expect(result.images[name]).toEqual({ width: 120, height: 120 });
    } else {
      expect(result.bounds).toBeUndefined();
      if (scenario === "ordinary") expect(result.ordinaryEqual).toBe(true);
      else expect(result.empty).toBe(true);
    }
    console.log(scenario, JSON.stringify(result));
  });
}

test("board figures accept real asymmetric overflow bounds with ordinary controls", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (e) => {
    if (e.type() === "error") errors.push(e.text());
  });
  await page.setViewportSize({ width: 1032, height: 1376 });
  await page.goto("/e2e/stickerBoardDrag.html?variant=crease-overflow");
  await expect(page.locator(".placed-sticker canvas.sticker-material")).toHaveCount(3);
  await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
  const result = await page.evaluate(async () => {
    const { required } = await import("./stickerMaterialFixture.ts");
    const { foilCoverage } = await import("../src/stickers/foilCoverage.ts");
    const { kyotoSeikaBandWidth } = await import("../src/stickers/foilBand.ts");
    const fixture = window.stickerBoardDragFixture;
    const crease = fixture.acceptedCreases()["large-drag-1"];
    if (!crease?.normalBounds) throw new Error("The board did not accept expanded normal bounds");
    const el = required(
      document.querySelector<HTMLElement>('[data-sticker-id="large-drag-1"] .sticker-figure'),
    );
    const cut = await createImageBitmap(await (await fetch(fixture.assets()[1].urls.mask)).blob());
    const c = new OffscreenCanvas(cut.width, cut.height),
      g = required(c.getContext("2d"));
    g.drawImage(cut, 0, 0);
    const rgba = g.getImageData(0, 0, c.width, c.height).data;
    const alpha = Uint8ClampedArray.from({ length: c.width * c.height }, (_, i) => rgba[i * 4 + 3]);
    const style = getComputedStyle(el),
      width = parseFloat(style.width),
      height = parseFloat(style.height);
    const coverage = foilCoverage(
      alpha,
      c.width,
      c.height,
      (kyotoSeikaBandWidth(width, height) * c.width) / width,
      8,
    );
    const normal = await createImageBitmap(await (await fetch(crease.normal)).blob());
    const nc = new OffscreenCanvas(normal.width, normal.height),
      ng = required(nc.getContext("2d"));
    ng.drawImage(normal, 0, 0);
    const pixels = ng.getImageData(0, 0, nc.width, nc.height).data;
    let outside = 0;
    for (let y = 1; y < nc.height - 1; y++)
      for (let x = 0; x < nc.width; x++) {
        const sx = crease.normalBounds.x + ((x + 0.5) * crease.normalBounds.width) / nc.width,
          q = (y * nc.width + x) * 4;
        if (sx < 0 && (pixels[q] !== 128 || pixels[q + 1] !== 128)) outside++;
      }
    const base = await createImageBitmap(await (await fetch(crease.base)).blob());
    return {
      bounds: crease.normalBounds,
      coverageX: coverage.x / c.width,
      outside,
      normal: [normal.width, normal.height],
      paint: [base.width, base.height],
      ordinaryBounds: fixture.acceptedCreases()["large-drag-2"]?.normalBounds,
      ready: [...document.querySelectorAll<HTMLCanvasElement>("canvas.sticker-material")].map(
        (c) => ({ state: c.dataset.state, error: c.dataset.error }),
      ),
      layers: document.querySelectorAll('[data-sticker-id="large-drag-1"] .sticker-crease > i')
        .length,
    };
  });
  expect(result.bounds.x).toBeLessThanOrEqual(result.coverageX);
  expect(result.outside).toBeGreaterThan(0);
  expect(result.normal[0]).toBeGreaterThan(result.paint[0]);
  expect(result.normal[1]).toBe(result.paint[1]);
  expect(result.ordinaryBounds).toBeUndefined();
  expect(result.layers).toBe(5);
  expect(result.ready).toHaveLength(3);
  for (const canvas of result.ready) {
    expect(canvas.state).toBe("ready");
    expect(canvas.error).toBeUndefined();
  }
  expect(errors).toEqual([]);
  console.log("board overflow", JSON.stringify(result));
});

async function openContinuousBoard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      value: "Mozilla/5.0 CriOS/140.0.0.0 Mobile/15E148",
      configurable: true,
    });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    if (window.screen.orientation)
      Object.defineProperty(window.screen.orientation, "angle", { value: 0, configurable: true });
    Object.defineProperty(window, "orientation", { value: 0, configurable: true });
    Object.defineProperty(window.DeviceMotionEvent, "requestPermission", {
      value: async () => "granted",
      configurable: true,
    });
  });
  await page.setViewportSize({ width: 1200, height: 1454 });
  await page.goto("/e2e/stickerBoardDrag.html?variant=mixed-21");
  await expect(
    page.locator(".placed-sticker canvas.sticker-material[data-state=ready]"),
  ).toHaveCount(21);
  await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
  await page.evaluate(() => {
    console.log(
      "Registered band input frame",
      JSON.stringify({ priorScreenAngle: screen.orientation?.angle, requestedScreenAngle: 0 }),
    );
    // WebKit can replace its orientation object after viewport setup. Pin the declared fixture frame
    // on the prototype, so the renderer can still listen for orientation changes.
    Object.defineProperty(ScreenOrientation.prototype, "angle", {
      configurable: true,
      get: () => 0,
    });
  });
}

test("actual outside-source bends retain continuous narrow bands through tilt, turn, lift and return", async ({
  page,
}, info) => {
  await openContinuousBoard(page);
  const report = await page.evaluate(async () => {
    const { turnSticker, stickerTurn, stickerFoilCoverage } =
      await import("../src/stickers/stickerRenderer.ts");
    const { registeredPaperAlpha } = await import("./stickerMaterialFixture.ts");
    const { actualFoilTargets } = await import("./foilBandSamples.ts");
    const canvases = actualFoilTargets();
    const rows = [];
    for (const canvas of canvases) {
      if (!canvas) throw new Error("The foil target disappeared");
      const context = canvas.getContext("2d");
      const originalTurn = stickerTurn(canvas);
      const registered = stickerFoilCoverage(canvas);
      if (!context || originalTurn === undefined || !registered)
        throw new Error("The complete foil target is not committed");
      const read = () => context.getImageData(0, 0, canvas.width, canvas.height).data;
      const initial = read();
      const cut = await registeredPaperAlpha(canvas);
      const frames = [{ name: "initial", image: canvas.toDataURL() }];
      let prior = initial;
      const changes = [];
      for (const axis of ["x", "y", "turn"] as const) {
        for (let step = 0; step <= 8; step++) {
          const pose = 8 * Math.sin((step / 8) * Math.PI * 2);
          turnSticker(
            canvas,
            originalTurn + (axis === "turn" ? pose * 4 : 0),
            axis === "x" ? pose : 0,
            axis === "y" ? pose : 0,
          );
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          );
          const current = read();
          if (current.length !== initial.length)
            throw new Error("Continuous reflection changed registered dimensions");
          let difference = 0,
            alphaDifference = 0;
          for (let i = 0; i < current.length; i++) {
            if (i % 4 === 3)
              alphaDifference = Math.max(alphaDifference, Math.abs(current[i] - initial[i]));
            else if (cut[Math.floor(i / 4) * 4 + 3] === 0)
              difference += Math.abs(current[i] - prior[i]);
          }
          if (step === 2) frames.push({ name: axis, image: canvas.toDataURL() });
          changes.push({
            axis,
            step,
            meanChannelDifference: difference / ((current.length / 4) * 3),
            alphaDifference,
          });
          prior = current;
        }
      }
      turnSticker(canvas, originalTurn, 0, 0);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const returned = read();
      frames.push({ name: "returned", image: canvas.toDataURL() });
      rows.push({
        id: canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId,
        style: canvas.dataset.foilStyle,
        frames,
        bounds: registered.coverage.x,
        returned: returned.every((value, index) => value === initial[index]),
        changes,
      });
    }
    return rows;
  });
  await info.attach("continuous-narrow-band-measurements", {
    body: JSON.stringify(
      report.map(({ frames, ...measurements }) => ({
        ...measurements,
        frames: frames.map(({ name }) => name),
      })),
    ),
    contentType: "application/json",
  });
  for (const row of report) {
    expect(row.returned).toBe(true);
    for (const frame of row.frames) {
      const body = Buffer.from(frame.image.split(",")[1], "base64");
      await info.attach(`${row.style}-${frame.name}`, { body, contentType: "image/png" });
    }
    expect(row.changes.every((frame) => frame.alphaDifference === 0)).toBe(true);
    for (const axis of ["x", "y", "turn"])
      expect(
        row.changes
          .filter((frame) => frame.axis === axis)
          .some((frame) => frame.meanChannelDifference > 0),
      ).toBe(true);
  }
  await info.attach("actual-worker-returned-board", {
    body: await page.screenshot(),
    contentType: "image/png",
  });
  expect(report).toHaveLength(3);
});

test("actual worker registered narrow bands show color without green through the shared pose", async ({
  page,
}, info) => {
  await openContinuousBoard(page);
  const bands = await page.evaluate(async () => {
    const { sampleFoilBands } = await import("./foilBandSamples.ts");
    return sampleFoilBands();
  });
  await info.attach("registered-band-color", {
    body: JSON.stringify(
      bands.map(({ returnedImage: _image, ...row }) => row),
      null,
      2,
    ),
    contentType: "application/json",
  });
  for (const row of bands) {
    await info.attach(`${row.style}-shared-returned`, {
      body: Buffer.from(row.returnedImage.split(",")[1], "base64"),
      contentType: "image/png",
    });
    expect(row.returned).toBe(true);
    expect(row.samples.every((sample) => sample.eligible > 0 && sample.green === 0)).toBe(true);
    if (row.style === "holo") {
      // Holo reads as holo before any motion: the held pose already shows color on the band.
      expect(row.samples[0].chromatic).toBeGreaterThan(0);
      expect(row.coverage.x).toBeLessThan(0);
      expect(row.samples.every((sample) => sample.outside > 0 && sample.outsideBent > 0)).toBe(
        true,
      );
      for (const axis of ["beta", "gamma"])
        expect(
          row.samples.some((sample) => sample.axis === axis && sample.outsideDifference > 0),
        ).toBe(true);
    }
  }
});
