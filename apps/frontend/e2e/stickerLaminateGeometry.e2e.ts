import { expect, test } from "@playwright/test";
import {
  coatField,
  compositePrint,
  MATERIAL_GLOSS,
  MATERIAL_MATTE,
  normalFromHeight,
  orientNormal,
  screenPoint,
} from "../../../docs/research/sticker-laminate/material-reference.ts";
import { holdRoute, solidSvg, waitTwoFrames } from "./stickerMaterialFixture";

test("a turn-only React update redraws the held reflection in the sticker's new axes", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-material");
  await expect(coat).toHaveAttribute("data-state", "ready");
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  const before = await coat.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement))
      throw new Error("The material snapshot is not a canvas");
    return el.toDataURL();
  });
  await page.evaluate(() => window.laminateFixture.update({ turn: 90 }));
  await expect(coat).toHaveAttribute("data-state", "ready");
  // A retained ready snapshot redraws on the shared frame queue; readiness alone is not a new frame.
  await expect
    .poll(() =>
      coat.evaluate((el) => {
        if (!(el instanceof HTMLCanvasElement))
          throw new Error("The material snapshot is not a canvas");
        return el.toDataURL();
      }),
    )
    .not.toBe(before);
  const sample = await coat.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement))
      throw new Error("The material snapshot is not a canvas");
    const context = el.getContext("2d");
    if (!context) throw new Error("The material snapshot context is missing");
    return {
      image: el.toDataURL(),
      points: [0.1, 0.5, 0.9].map((u) => {
        const x = Math.floor(u * el.width),
          y = Math.floor(0.58 * el.height);
        return {
          uv: [(x + 0.5) / el.width, (y + 0.5) / el.height],
          rgba: [...context.getImageData(x, y, 1, 1).data],
        };
      }),
    };
  });
  expect(sample.image).not.toBe(before);
  expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(pose);
  for (const point of sample.points) {
    // These sample positions fall on white paper or the gray ash region in the diagnostic print.
    const print =
      point.uv[0] > 0.14 && point.uv[0] < 0.86
        ? ([136 / 255, 136 / 255, 136 / 255] as const)
        : ([1, 1, 1] as const);
    const expected = compositePrint(
      print,
      coatField({
        point: screenPoint(point.uv[0], point.uv[1], 240, 240, 90 + pose.rotationDegrees),
        normal: orientNormal([0, 0, 1], 90, pose),
        material: MATERIAL_GLOSS,
      }),
    );
    for (let c = 0; c < 3; c++)
      expect(Math.abs(point.rgba[c] - expected[c] * 255)).toBeLessThanOrEqual(2);
  }
});

test("a tilted flight reflects in the same axes as its turned sticker", async ({ page }) => {
  await page.goto("/e2e/stickerLaminate.html?turn=90");
  const coat = page.locator('[data-sticker="0"] canvas.sticker-material');
  await expect(coat).toHaveAttribute("data-state", "ready");
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  await page.evaluate(() => window.laminateFixture.flight(30, 12));
  await waitTwoFrames(page);
  const points = await coat.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement)) throw new Error("The flight snapshot is not a canvas");
    const context = el.getContext("2d");
    if (!context) throw new Error("The flight snapshot context is missing");
    return [
      [0.1, 0.5],
      [0.5, 0.55],
      [0.2, 0.825],
    ].map(([u, v]) => {
      const x = Math.floor(u * el.width),
        y = Math.floor(v * el.height);
      return {
        uv: [(x + 0.5) / el.width, (y + 0.5) / el.height],
        rgba: [...context.getImageData(x, y, 1, 1).data],
      };
    });
  });
  const print = [
    [1, 1, 1],
    [136 / 255, 136 / 255, 136 / 255],
    [0, 0, 0],
  ] as const;
  for (let i = 0; i < points.length; i++) {
    const reference = compositePrint(
      print[i],
      coatField({
        point: screenPoint(points[i].uv[0], points[i].uv[1], 240, 240, 90 + pose.rotationDegrees),
        normal: orientNormal([0, 0, 1], 90, pose, { x: 30, y: 12 }),
        material: MATERIAL_GLOSS,
      }),
    );
    for (let c = 0; c < 3; c++)
      expect(Math.abs(points[i].rgba[c] - reference[c] * 255)).toBeLessThanOrEqual(2);
  }
});

test("the draped ramp changes reflection by slope while raised plateaus stay flat", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?ramp=1");
  const ramp = page.locator("[data-ramp] canvas.sticker-material");
  await expect(ramp).toHaveAttribute("data-state", "ready");
  await expect(page.locator("[data-white] canvas.sticker-material")).toHaveAttribute(
    "data-state",
    "ready",
  );
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  // Keep the localized source edge over the diagnostic ramp rather than outside the cut.
  await page.evaluate(() => window.laminateFixture.tilt(40, 2));
  await page.waitForTimeout(1000);
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  const sample = await ramp.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement)) throw new Error("The ramp snapshot is not a canvas");
    const context = el.getContext("2d");
    const flat = document.querySelector("[data-white] canvas");
    if (!context || !(flat instanceof HTMLCanvasElement))
      throw new Error("The ramp comparison is missing");
    const paper = flat.getContext("2d");
    if (!paper) throw new Error("The flat comparison context is missing");
    const points = [40, 110, 114, 118, 122, 126, 200].map((x) => {
      const u = (x + 0.5) / 240,
        v = 100.5 / 240;
      const px = Math.floor(u * el.width),
        py = Math.floor(v * el.height);
      return {
        x,
        uv: [(px + 0.5) / el.width, (py + 0.5) / el.height],
        color: context.getImageData(px, py, 1, 1).data[0],
        flat: paper.getImageData(px, py, 1, 1).data[0],
      };
    });
    return { points, height: window.laminateFixture.rampHeight };
  });
  for (const point of sample.points) {
    const reference = compositePrint(
      [1, 1, 1],
      coatField({
        point: screenPoint(point.uv[0], point.uv[1], 240, 240, pose.rotationDegrees),
        normal: orientNormal(
          normalFromHeight(new Float32Array(sample.height), 240, 240, point.x, 100),
          0,
          pose,
        ),
        material: MATERIAL_GLOSS,
      }),
    );
    expect(Math.abs(point.color - reference[0] * 255)).toBeLessThanOrEqual(3);
  }
  expect(sample.points[0].color).toBe(sample.points[0].flat);
  expect(sample.points[sample.points.length - 1].color).toBe(
    sample.points[sample.points.length - 1].flat,
  );
  expect(
    sample.points.some((p) => Math.abs(p.color - p.flat) > 2),
    JSON.stringify(sample.points),
  ).toBe(true);
});

test("Shop matte uses the same held light and broadens the white-paper reflection", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html");
  const matte = page.locator("[data-matte] canvas.sticker-material");
  await expect(matte).toHaveAttribute("data-state", "ready");
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  const points = await matte.evaluate((el) => {
    if (!(el instanceof HTMLCanvasElement)) throw new Error("The matte snapshot is not a canvas");
    const context = el.getContext("2d");
    if (!context) throw new Error("The matte snapshot context is missing");
    return [0.2, 0.5, 0.8].map((u) => {
      const x = Math.floor(u * el.width),
        y = Math.floor(0.1 * el.height);
      return {
        uv: [(x + 0.5) / el.width, (y + 0.5) / el.height],
        rgba: [...context.getImageData(x, y, 1, 1).data],
      };
    });
  });
  let differs = false;
  for (const point of points) {
    const input = {
      point: screenPoint(point.uv[0], point.uv[1], 240, 240, -4 + pose.rotationDegrees),
      normal: orientNormal([0, 0, 1], -4, pose),
    };
    const expected = compositePrint([1, 1, 1], coatField({ ...input, material: MATERIAL_MATTE }));
    const gloss = compositePrint([1, 1, 1], coatField({ ...input, material: MATERIAL_GLOSS }));
    expect(Math.abs(point.rgba[0] - expected[0] * 255)).toBeLessThanOrEqual(2);
    if (Math.abs(expected[0] - gloss[0]) * 255 > 1) differs = true;
  }
  expect(differs).toBe(true);
  const image = () =>
    matte.evaluate((el) => {
      if (!(el instanceof HTMLCanvasElement)) throw new Error("The matte snapshot is not a canvas");
      return el.toDataURL();
    });
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  await page.evaluate(() => window.laminateFixture.tilt(40, 28));
  await page.waitForTimeout(1200);
  const held = await image();
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.evaluate(() => window.laminateFixture.tilt(10, -28));
  await page.waitForTimeout(1100);
  expect(await image()).toBe(held);
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.waitForTimeout(1100);
  expect(await image()).toBe(held);
  await page.evaluate(() => window.laminateFixture.tilt(10, -28));
  await expect.poll(image).not.toBe(held);
});

test("expanded complete materials preserve source paper and reject unregistered creased overflow", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?board=1");
  const result = await page.evaluate(async () => {
    const { required, solidPng: png } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const host = document.createElement("div");
    host.style.cssText = "position:absolute;left:30px;top:30px;width:120px;height:60px";
    host.className = "sticker-material-surface";
    const c = document.createElement("canvas");
    c.className = "sticker-material";
    host.append(c);
    document.body.append(host);
    const material = {
      print: png(120, 60, "#ab3764"),
      cut: png(120, 60, "white"),
      finish: "gloss" as const,
    };
    const release = api.mountSticker(c, { ...material, turn: 0 });
    const pixels = () =>
      Array.from(required(c.getContext("2d")).getImageData(0, 0, c.width, c.height).data);
    try {
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const paper = pixels(),
        initial = { width: c.width, height: c.height };
      api.updateSticker(c, { ...material, foil: { style: "silver", size: "board" } });
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const expanded = pixels(),
        expandedWidth = c.width,
        expandedHeight = c.height;
      let max = 0;
      const dx = (expandedWidth - initial.width) / 2,
        dy = (expandedHeight - initial.height) / 2;
      for (let y = 2; y < initial.height - 2; y++)
        for (let x = 2; x < initial.width - 2; x++)
          for (let channel = 0; channel < 4; channel++)
            max = Math.max(
              max,
              Math.abs(
                paper[(y * initial.width + x) * 4 + channel] -
                  expanded[((y + dy) * expandedWidth + x + dx) * 4 + channel],
              ),
            );
      api.updateSticker(c, {
        ...material,
        normal: png(120, 60, "rgb(128,128,255)"),
        foil: { style: "silver", size: "board" },
      });
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const diagnostic = c.dataset.error ?? "";
      const retained = pixels().every((v, i) => v === expanded[i]);
      api.updateSticker(c, {
        ...material,
        normal: png(130, 70, "rgb(128,128,255)"),
        normalBounds: { x: -5 / 120, y: -5 / 60, width: 130 / 120, height: 70 / 60 },
        foil: { style: "silver", size: "board" },
      });
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      return {
        max,
        initial,
        expandedWidth,
        expandedHeight,
        diagnostic,
        retained,
        ready: c.dataset.state,
        error: c.dataset.error ?? "",
      };
    } finally {
      release();
      host.remove();
    }
  });
  expect(result.max).toBe(0);
  expect(result.expandedWidth).toBeGreaterThan(result.initial.width);
  expect(result.expandedHeight).toBeGreaterThan(result.initial.height);
  expect(result.diagnostic).toContain("Creased foil overflow");
  expect(result.retained).toBe(true);
  expect(result.ready).toBe("ready");
  expect(result.error).toBe("");
});

test("a standalone expanded finish keeps its source size through repeated held-pose refreshes", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?board=1");
  const result = await page.evaluate(async () => {
    const { solidPng, twoFrames } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const cut = solidPng(120, 60, "black");
    const c = document.createElement("canvas");
    c.style.cssText = "position:absolute;left:30px;top:30px;width:120.5px;height:60.5px";
    document.body.append(c);
    const release = api.mountSticker(c, {
      print: cut,
      cut,
      finish: "gloss",
      turn: 0,
      foil: { style: "silver", size: "board" },
    });
    try {
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const before = {
        width: c.width,
        height: c.height,
        pixels: c.toDataURL(),
        style: c.style.width,
      };
      for (let i = 0; i < 4; i++) {
        api.refreshSticker(c);
        await twoFrames();
      }
      return {
        before,
        after: { width: c.width, height: c.height, pixels: c.toDataURL(), style: c.style.width },
      };
    } finally {
      release();
      c.remove();
    }
  });
  expect(result.after).toEqual(result.before);
});

test("a live copy retains the source's normalized outer coverage at its independent size", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?board=1");
  const result = await page.evaluate(async () => {
    const { solidPng } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const cut = solidPng(80, 80, "black");
    const source = document.createElement("canvas"),
      copy = document.createElement("canvas");
    source.style.cssText = "position:absolute;left:20px;top:20px;width:80px;height:80px";
    copy.style.cssText = "position:absolute;left:130px;top:20px;width:40px;height:40px";
    document.body.append(source, copy);
    const stop = api.mountSticker(source, {
      print: cut,
      cut,
      turn: 0,
      finish: "gloss",
      foil: { style: "silver", size: "board" },
    });
    await api.whenStickerSettled(source, undefined, AbortSignal.timeout(5000));
    const stopCopy = api.mountStickerCopy(copy, source, () => true);
    try {
      await api.whenStickerSettled(copy, undefined, AbortSignal.timeout(5000));
      return {
        source: [source.width, source.height],
        copy: [copy.width, copy.height],
        sourceScale: source.style.scale,
        copyScale: copy.style.scale,
      };
    } finally {
      stopCopy();
      stop();
      source.remove();
      copy.remove();
    }
  });
  expect(result.copy).toEqual(result.source.map((v) => Math.round(v / 2)));
  expect(result.copyScale).toBe(result.sourceScale);
});

for (const held of ["normal", "outer coverage"] as const) {
  // A delayed registered normal commits; a delayed outer coverage fails after the normal was ready.
  test(`registered overflow retains the complete generation while its ${held} is pending, then ${held === "normal" ? "commits" : "fails"}`, async ({
    page,
  }) => {
    const resource = await holdRoute(
      page,
      held === "normal" ? "**/registered-normal.svg" : "**/registered-outer.svg",
      () =>
        held === "normal"
          ? solidSvg("rgb(158,128,249)", 100)
          : { status: 503, body: "registered resource unavailable" },
    );
    await page.goto("/e2e/stickerLaminate.html?board=1");
    await page.evaluate(async (held) => {
      const { solidPng, twoFrames } = await import("./stickerMaterialFixture.ts");
      const api = await import("../src/stickers/stickerRenderer.ts");
      const png = (color: string) => solidPng(80, 80, color);
      const place = (left: number) => {
        const canvas = document.createElement("canvas");
        canvas.style.cssText = `position:absolute;left:${left}px;top:20px;width:80px;height:80px`;
        document.body.append(canvas);
        return canvas;
      };
      const c = place(20);
      c.id = "registered-finish";
      const material = { print: png("#ab3764"), cut: png("white"), finish: "gloss" as const };
      const bounds = { x: -0.125, y: -0.125, width: 1.25, height: 1.25 };
      const foil = { style: "silver" as const, size: "board" as const };
      api.mountSticker(c, {
        ...material,
        turn: 0,
        normal: png("rgb(128,150,253)"),
        ...(held === "outer coverage" ? { normalBounds: bounds, foil } : {}),
      });
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      c.dataset.before = c.toDataURL();
      c.dataset.beforeWidth = String(c.width);
      const normal = png("rgb(158,128,249)");
      const update =
        held === "normal"
          ? { ...material, normal: "/registered-normal.svg", normalBounds: bounds, foil }
          : { ...material, normal, foil: { ...foil, mask: "/registered-outer.svg" } };
      api.updateSticker(c, update);
      const deadline = AbortSignal.timeout(5000);
      void api.whenStickerSettled(c, undefined, deadline).then(() => {
        c.dataset.settled = deadline.aborted ? "aborted" : "true";
      });
      // The same update with the held resource at hand: once it settles, the resources the two
      // share are ready, so the held sticker has had every chance to commit early.
      const reference = place(140);
      const stopReference = api.mountSticker(reference, {
        ...update,
        turn: 0,
        ...(held === "normal" ? { normal } : { foil: { ...foil, mask: material.cut } }),
      });
      try {
        await api.whenStickerSettled(reference, undefined, AbortSignal.timeout(5000));
      } finally {
        stopReference();
        reference.remove();
      }
      api.refreshSticker(c);
      await twoFrames();
    }, held);
    await resource.requested;
    const c = page.locator("#registered-finish");
    const retained = () =>
      c.evaluate((el) => el instanceof HTMLCanvasElement && el.toDataURL() === el.dataset.before);
    expect(await retained()).toBe(true);
    await expect(c).not.toHaveAttribute("data-settled", "true");
    await expect(c).not.toHaveAttribute("data-error", /.+/);
    resource.release();
    await expect(c).toHaveAttribute("data-settled", "true");
    if (held === "outer coverage") {
      await expect(c).toHaveAttribute("data-error", /outer coverage/);
      expect(await retained()).toBe(true);
    } else {
      await expect(c).not.toHaveAttribute("data-error", /.+/);
      const size = await c.evaluate((el) => {
        if (!(el instanceof HTMLCanvasElement)) throw new Error("Missing registered finish");
        return { before: Number(el.dataset.beforeWidth), after: el.width };
      });
      expect(size.after).toBeGreaterThan(size.before);
    }
  });
}

test("zero-size materials retain coverage without work until nonzero re-exposure", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?board=1");
  const result = await page.evaluate(async () => {
    const { solidPng, twoFrames, watchCoverageJobs } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const cut = solidPng(80, 80, "black");
    const c = document.createElement("canvas"),
      other = document.createElement("canvas");
    c.style.cssText = "position:absolute;left:20px;top:20px;width:80px;height:80px";
    other.style.cssText = "position:absolute;left:160px;top:20px;width:80px;height:80px";
    document.body.append(c, other);
    const material = { print: cut, cut, turn: 0, finish: "gloss" as const };
    const stop = api.mountSticker(c, { ...material, foil: { style: "silver", size: "board" } });
    const stopOther = api.mountSticker(other, material);
    await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
    await api.whenStickerSettled(other, undefined, AbortSignal.timeout(5000));
    const before = c.toDataURL();
    const jobs = watchCoverageJobs(cut);
    try {
      c.style.display = "none";
      api.refreshSticker(other);
      await twoFrames();
      const hidden = {
        requests: jobs.jobs,
        error: c.dataset.error ?? "",
        retained: c.toDataURL() === before,
      };
      c.style.width = "100px";
      c.style.display = "block";
      api.refreshSticker(c);
      await twoFrames();
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      return {
        hidden,
        requests: jobs.jobs,
        error: c.dataset.error ?? "",
        width: c.width,
        changed: c.toDataURL() !== before,
      };
    } finally {
      jobs.restore();
      stop();
      stopOther();
      c.remove();
      other.remove();
    }
  });
  expect(result.hidden).toEqual({ requests: 0, error: "", retained: true });
  expect(result.requests).toBeGreaterThan(0);
  expect(result.error).toBe("");
  expect(result.changed).toBe(true);
  expect(result.width).toBeGreaterThan(100);
});
