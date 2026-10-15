import { expect, test, type JSHandle, type Locator } from "@playwright/test";
import { emptyLaminatePage, holdRoute, solidSvg } from "./stickerMaterialFixture";

/** Plain gray paper the fixture's size: a quarter turn moves no print, only the reflection can change. */
const GRAY_PRINT = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="#888"/></svg>')}`;

/** A square material canvas's pixels. */
const pixelsOf = (canvas: Locator) =>
  canvas.evaluateHandle((el) => {
    if (!(el instanceof HTMLCanvasElement))
      throw new Error("The material snapshot is not a canvas");
    const context = el.getContext("2d");
    if (!context) throw new Error("The material snapshot context is missing");
    if (el.width !== el.height) throw new Error("A quarter turn needs a square material canvas");
    return context.getImageData(0, 0, el.width, el.height);
  });

/**
 * Against `before`, turned a quarter turn clockwise on screen: whether the canvas changed, how far each
 * opaque pixel is from what `before` showed at the same place on screen, and how far `before` is from
 * a quarter turn of itself, which is what a reflection that turned with the sticker would show.
 */
const againstQuarterTurn = (canvas: Locator, before: JSHandle<ImageData>) =>
  canvas.evaluate((el, before) => {
    if (!(el instanceof HTMLCanvasElement))
      throw new Error("The material snapshot is not a canvas");
    const context = el.getContext("2d");
    if (!context) throw new Error("The material snapshot context is missing");
    const side = el.width;
    const now = context.getImageData(0, 0, side, side).data,
      was = before.data;
    let changed = false,
      onScreen = 0,
      turnedWithIt = 0;
    for (let y = 0; y < side; y++)
      for (let x = 0; x < side; x++) {
        const i = (y * side + x) * 4,
          // The pixel a quarter turn clockwise brings to (x, y).
          j = (x * side + side - 1 - y) * 4;
        if (now[i + 3] !== 255 || was[i + 3] !== 255 || was[j + 3] !== 255) continue;
        for (let c = 0; c < 3; c++) {
          if (now[i + c] !== was[i + c]) changed = true;
          onScreen = Math.max(onScreen, Math.abs(now[i + c] - was[j + c]));
          turnedWithIt = Math.max(turnedWithIt, Math.abs(was[i + c] - was[j + c]));
        }
      }
    return { changed, onScreen, turnedWithIt };
  }, before);

test("a turn-only React update redraws the held reflection in the sticker's new axes", async ({
  page,
}) => {
  // Alone at the top of the page, the reload sticker reaches across the still glare's lower edge.
  await page.goto("/e2e/stickerLaminate.html?reload=1&board=1&count=0&side=300");
  const coat = page.locator("[data-reload] canvas.sticker-material");
  await expect(coat).toHaveAttribute("data-state", "ready");
  await page.evaluate((print) => window.laminateFixture.update({ print }), GRAY_PRINT);
  // The diagnostic print's black ink is gone once the gray print has drawn.
  await expect
    .poll(() =>
      coat.evaluate((el) => {
        if (!(el instanceof HTMLCanvasElement))
          throw new Error("The material snapshot is not a canvas");
        const context = el.getContext("2d");
        if (!context) throw new Error("The material snapshot context is missing");
        return context.getImageData(Math.floor(0.24 * el.width), Math.floor(0.83 * el.height), 1, 1)
          .data[0];
      }),
    )
    .toBeGreaterThan(100);
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  const before = await pixelsOf(coat);
  await page.evaluate(() => window.laminateFixture.update({ turn: 90 }));
  await expect(coat).toHaveAttribute("data-state", "ready");
  // A retained ready snapshot redraws on the shared frame queue; readiness alone is not a new frame.
  await expect.poll(async () => (await againstQuarterTurn(coat, before)).changed).toBe(true);
  const turned = await againstQuarterTurn(coat, before);
  expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(pose);
  // The room stays put on screen while the sticker turns under it.
  expect(turned.turnedWithIt, "The held reflection has a direction to turn").toBeGreaterThan(8);
  expect(turned.onScreen).toBeLessThanOrEqual(2);
});

test("a tilted flight reflects in the same axes as its turned sticker", async ({ page }) => {
  await emptyLaminatePage(page);
  await page.goto("/e2e/stickerLaminate.html");
  const result = await page.evaluate(async () => {
    const { required, solidPng, twoFrames } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const host = document.createElement("div");
    host.className = "sticker-material-surface";
    host.style.cssText =
      "position:absolute;left:60px;top:170px;width:240px;height:240px;rotate:90deg";
    const c = document.createElement("canvas");
    c.className = "sticker-material";
    host.append(c);
    document.body.append(host);
    // Gray paper across the still glare's lower edge, which a slight tip moves one way or another.
    const release = api.mountSticker(c, {
      print: solidPng(240, 240, "#888"),
      cut: solidPng(240, 240, "white"),
      finish: "gloss",
      turn: 90,
    });
    const read = () => required(c.getContext("2d")).getImageData(0, 0, c.width, c.height).data;
    try {
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const level = read();
      // Turned a quarter turn and tipped about its own x axis, it faces where an unturned sticker
      // tipped about its y axis faces, from the same box on screen.
      host.style.transform = "rotateX(2deg)";
      api.turnSticker(c, 90, 2, 0);
      await twoFrames();
      const turned = read();
      host.style.rotate = "0deg";
      host.style.transform = "rotateY(2deg)";
      api.turnSticker(c, 0, 0, 2);
      await twoFrames();
      const unturned = read();
      const side = c.width;
      let tipped = 0,
        difference = 0;
      for (let y = 0; y < side; y++)
        for (let x = 0; x < side; x++) {
          const i = (y * side + x) * 4,
            j = (x * side + side - 1 - y) * 4;
          if (turned[i + 3] !== 255 || unturned[j + 3] !== 255) continue;
          for (let channel = 0; channel < 3; channel++) {
            tipped = Math.max(tipped, Math.abs(turned[i + channel] - level[i + channel]));
            difference = Math.max(
              difference,
              Math.abs(turned[i + channel] - unturned[j + channel]),
            );
          }
        }
      return { square: c.width === c.height, tipped, difference };
    } finally {
      release();
      host.remove();
    }
  });
  expect(result.square).toBe(true);
  expect(result.tipped, "The flight's tip turns the reflection").toBeGreaterThan(8);
  expect(result.difference).toBeLessThanOrEqual(2);
});

test("the draped ramp changes reflection by slope while raised plateaus stay flat", async ({
  page,
}) => {
  await emptyLaminatePage(page);
  await page.goto("/e2e/stickerLaminate.html");
  const sample = await page.evaluate(async () => {
    const { required, solidPng, twoFrames } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const { CREASE_LIGHT, creasePixels } = await import("../src/stickers/crease.ts");
    // A step down at the middle, which the drape turns into a ramp between two plateaus.
    const field = new Float32Array(240 * 240);
    for (let y = 0; y < 240; y++) field.fill(2, y * 240, y * 240 + 120);
    const ramp = required(
      creasePixels({
        width: 240,
        height: 240,
        surface: field,
        own: new Float32Array(240 * 240).fill(1),
        scale: 1,
        light: CREASE_LIGHT,
      }),
    );
    const image = document.createElement("canvas");
    image.width = image.height = 240;
    required(image.getContext("2d")).putImageData(new ImageData(ramp.normal, 240, 240), 0, 0);
    const normal = image.toDataURL();
    // Gray paper inside the still glare, where the shoji's lattice shows any change in slope.
    const host = document.createElement("div");
    host.className = "sticker-material-surface";
    host.style.cssText = "position:absolute;left:40px;top:20px;width:240px;height:240px";
    const c = document.createElement("canvas");
    c.className = "sticker-material";
    host.append(c);
    document.body.append(host);
    const gray = solidPng(240, 240, "#888");
    const material = { print: gray, cut: solidPng(240, 240, "white"), finish: "gloss" as const };
    const release = api.mountSticker(c, { ...material, normal, turn: 0 });
    const row = () => {
      const data = required(c.getContext("2d")).getImageData(
        0,
        Math.floor((100.5 / 240) * c.height),
        c.width,
        1,
      ).data;
      return [40, 110, 114, 118, 122, 126, 200].map(
        (x) => data[Math.floor(((x + 0.5) / 240) * c.width) * 4],
      );
    };
    try {
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      await twoFrames();
      const draped = row();
      // The same paper, flat, in the same place on screen, so the same view of the room.
      api.updateSticker(c, material);
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      await twoFrames();
      const flat = row();
      return draped.map((color, i) => ({ color, flat: flat[i] }));
    } finally {
      release();
      host.remove();
    }
  });
  // The plateaus either side of the ramp, raised and not, face the room as flat paper does.
  expect(sample[0].color, JSON.stringify(sample)).toBe(sample[0].flat);
  expect(sample[sample.length - 1].color, JSON.stringify(sample)).toBe(
    sample[sample.length - 1].flat,
  );
  expect(
    sample.some((p) => Math.abs(p.color - p.flat) > 2),
    JSON.stringify(sample),
  ).toBe(true);
});

test("Shop matte uses the same held light and broadens the shoji's reflection", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html");
  const matte = page.locator("[data-matte] canvas.sticker-material");
  await expect(matte).toHaveAttribute("data-state", "ready");
  const profile = await page.evaluate(async () => {
    const { required, solidPng, twoFrames } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    // Gray paper across the still glare's lower edge, in gloss and then matte, in one place.
    const host = document.createElement("div");
    host.className = "sticker-material-surface";
    host.style.cssText = "position:absolute;left:75px;top:160px;width:240px;height:240px";
    const c = document.createElement("canvas");
    c.className = "sticker-material";
    host.append(c);
    document.body.append(host);
    const material = {
      print: solidPng(240, 240, "#888"),
      cut: solidPng(240, 240, "white"),
      turn: 0,
    };
    const release = api.mountSticker(c, { ...material, finish: "gloss" });
    /**
     * The column down the middle: its brightest and darkest, and its steepest change over eight rows,
     * since gloss's blurred edge rises less than two levels a row.
     */
    const column = () => {
      const data = required(c.getContext("2d")).getImageData(c.width >> 1, 0, 1, c.height).data;
      let step = 0,
        low = 255,
        high = 0;
      for (let i = 0; i < data.length; i += 4) {
        low = Math.min(low, data[i]);
        high = Math.max(high, data[i]);
        if (i >= 32) step = Math.max(step, Math.abs(data[i] - data[i - 32]));
      }
      return { range: high - low, step };
    };
    try {
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      const gloss = column();
      api.updateSticker(c, { ...material, finish: "matte" });
      await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
      await twoFrames();
      return { gloss, matte: column() };
    } finally {
      release();
      host.remove();
    }
  });
  expect(profile.gloss.range, "Gloss shows the glare's edge").toBeGreaterThan(20);
  expect(profile.matte.range, "Matte still shows the glare").toBeGreaterThan(10);
  expect(profile.matte.step, "Matte spreads the edge gloss keeps crisp").toBeLessThan(
    profile.gloss.step / 2,
  );
  const image = () =>
    matte.evaluate((el) => {
      if (!(el instanceof HTMLCanvasElement)) throw new Error("The matte snapshot is not a canvas");
      return el.toDataURL();
    });
  await page.evaluate(() => window.laminateFixture.tilt(40, 0));
  // Inside the viewer's re-centering release, so the light lands and then holds still.
  await page.evaluate(() => window.laminateFixture.tilt(40, 20));
  await expect
    .poll(() => page.evaluate(() => window.laminateFixture.getPose()))
    .toMatchObject({ beta: 40, gamma: 20 });
  await page.evaluate(
    () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))),
  );
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
