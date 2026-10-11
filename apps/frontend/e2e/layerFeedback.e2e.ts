import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

const evidence = fileURLToPath(
  new URL("../../../data/verification/layer-selection-delight-2026-10-11/", import.meta.url),
);

declare global {
  interface Window {
    layerFeedback: {
      cancel: () => void;
      pixelsUnchanged: () => boolean;
      completed: () => number;
      canvases: HTMLCanvasElement[];
    };
  }
}

for (const device of ["phone", "tablet"] as const) {
  for (const scheme of ["light", "dark"] as const) {
    for (const reduced of [false, true]) {
      test(`${device} ${scheme} ${reduced ? "still cue" : "pop and fall"}`, async ({
        page,
      }, info) => {
        await page.setViewportSize(
          device === "phone" ? { width: 390, height: 844 } : { width: 1024, height: 1366 },
        );
        await page.emulateMedia({
          colorScheme: scheme,
          reducedMotion: reduced ? "reduce" : "no-preference",
        });
        await page.route("**/e2e-layer-feedback", (route) =>
          route.fulfill({
            contentType: "text/html",
            body: "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>Layer feedback render fixture</title>",
          }),
        );
        await page.goto("/e2e-layer-feedback");
        await page.clock.install();
        await page.clock.pauseAt(new Date());
        const initial = await page.evaluate(async (dark) => {
          const { flashLayer } = await import("../src/sticker-creation/layers/layerFlash.ts");
          document.body.style.cssText = `margin:0;padding:16px;background:${dark ? "#1c1824" : "#f2f1f6"}`;
          const sheet = document.createElement("div");
          sheet.style.cssText = `position:relative;width:min(100%,560px);aspect-ratio:560/500;background:${dark ? "#302b39" : "#fff"}`;
          const current = document.createElement("div");
          current.style.cssText = "position:absolute;inset:0";
          const layer = document.createElement("canvas");
          const above = document.createElement("canvas");
          for (const canvas of [layer, above]) {
            canvas.width = 560;
            canvas.height = 500;
            canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
          }
          const g = layer.getContext("2d");
          if (!g) throw new Error("No layer context");
          const colors = ["#ffffff", "#000000", "#ff4f9a", "#6e6878", "rgba(41,141,255,0.35)"];
          colors.forEach((color, i) => {
            g.strokeStyle = color;
            g.lineWidth = i === 4 ? 2 : 12;
            g.beginPath();
            g.moveTo(48, 70 + i * 80);
            g.bezierCurveTo(155, 35 + i * 80, 370, 105 + i * 80, 510, 70 + i * 80);
            g.stroke();
          });
          const ag = above.getContext("2d");
          if (!ag) throw new Error("No above context");
          ag.fillStyle = "#1c1824";
          ag.fillRect(330, 25, 190, 225);
          ag.fillStyle = "#ffffff";
          ag.fillRect(330, 250, 190, 225);
          const before = [layer.toDataURL(), above.toDataURL()];
          current.append(layer);
          sheet.append(current, above);
          document.body.append(sheet);
          let completed = 0;
          const flash = flashLayer({
            layer,
            above,
            inked: { x: 30, y: 30, w: 500, h: 390 },
            current,
            sheet,
            onEnd: () => completed++,
          });
          if (!flash) throw new Error("No feedback for colored ink");
          const canvases = [
            ...sheet.querySelectorAll<HTMLCanvasElement>("canvas[class*='layer-flash']"),
          ];
          window.layerFeedback = {
            cancel: flash.cancel,
            completed: () => completed,
            canvases,
            pixelsUnchanged: () =>
              before[0] === layer.toDataURL() && before[1] === above.toDataURL(),
          };
          for (const animation of sheet.getAnimations({ subtree: true })) {
            animation.pause();
            animation.currentTime = 106;
          }
          const pulse = sheet.querySelector<HTMLCanvasElement>(".layer-flash__pulse");
          const pg = pulse?.getContext("2d");
          if (!pulse || !pg) throw new Error("No pulse context");
          const pixels = pg.getImageData(0, 0, pulse.width, pulse.height).data;
          let darkPixels = 0,
            lightPixels = 0;
          for (let i = 0; i < pixels.length; i += 4)
            if (pixels[i + 3] > 0) {
              if (pixels[i] < 60) darkPixels++;
              if (pixels[i] > 240) lightPixels++;
            }
          const outline = sheet.querySelector<HTMLCanvasElement>(".layer-flash__outline");
          const og = outline?.getContext("2d");
          if (!outline || !og) throw new Error("No outline context");
          const edge = og.getImageData(0, 0, outline.width, outline.height).data;
          let darkEdge = 0,
            lightEdge = 0;
          for (let i = 0; i < edge.length; i += 4)
            if (edge[i + 3] > 0) {
              if (edge[i] < 60) darkEdge++;
              if (edge[i] > 240) lightEdge++;
            }
          return {
            darkPixels,
            lightPixels,
            darkEdge,
            lightEdge,
            glints: sheet.querySelectorAll(".layer-flash__glint").length,
            animations: sheet.getAnimations({ subtree: true }).length,
          };
        }, scheme === "dark");
        expect(initial.darkPixels).toBeGreaterThan(0);
        expect(initial.lightPixels).toBeGreaterThan(0);
        expect(initial.darkEdge).toBeGreaterThan(0);
        expect(initial.lightEdge).toBeGreaterThan(0);
        expect(initial.glints).toBe(reduced ? 0 : 7);
        if (reduced) expect(initial.animations).toBe(0);
        await mkdir(evidence, { recursive: true });
        const name = `${info.project.name}-${device}-${scheme}-${reduced ? "reduced" : "normal"}`;
        await page.screenshot({ path: `${evidence}/${name}-pop.png` });
        if (!reduced) {
          const fall = await page.evaluate(() => {
            for (const animation of document.getAnimations()) animation.currentTime = 330;
            const glint = document.querySelector(".layer-flash__glint");
            const pulse = document.querySelector(".layer-flash__pulse");
            if (!glint || !pulse) throw new Error("Missing feedback");
            const style = getComputedStyle(glint);
            return {
              y: new DOMMatrix(style.transform).m42,
              opacity: Number(style.opacity),
              pulseOpacity: Number(getComputedStyle(pulse).opacity),
            };
          });
          expect(fall.y).toBeGreaterThan(5);
          expect(fall.opacity).toBeGreaterThan(0);
          expect(fall.opacity).toBe(1);
          expect(fall.pulseOpacity).toBe(0);
          await page.screenshot({ path: `${evidence}/${name}-fall.png` });
        }
        await page.clock.runFor(600);
        expect(await page.locator("[class*='layer-flash']").count()).toBe(0);
        expect(await page.evaluate(() => window.layerFeedback.pixelsUnchanged())).toBe(true);
        expect(await page.evaluate(() => window.layerFeedback.completed())).toBe(1);
        expect(
          await page.evaluate(() =>
            window.layerFeedback.canvases.every(
              (canvas) => canvas.width === 0 && canvas.height === 0,
            ),
          ),
        ).toBe(true);
        await page.screenshot({ path: `${evidence}/${name}-finished.png` });
        await writeFile(`${evidence}/${name}-counts.json`, JSON.stringify(initial, null, 2));
      });
    }
  }
}

test("effective clipped ink and every display interruption release real browser feedback", async ({
  page,
}) => {
  await page.route("**/e2e-layer-feedback", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><meta name=viewport content='width=device-width,initial-scale=1'><title>Layer feedback interruptions</title>",
    }),
  );
  await page.goto("/e2e-layer-feedback");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const results = await page.evaluate(async () => {
    const [{ LayerDisplay }, { LayerInk }] = await Promise.all([
      import("../src/sticker-creation/layers/layerDisplay.ts"),
      import("../src/sticker-creation/layers/layerInk.ts"),
    ]);
    const results = [];
    for (const reason of [
      "selection",
      "drawing",
      "resize",
      "opacity",
      "teardown",
      "hidden",
      "disjoint",
      "empty",
      "hidden-layer",
    ]) {
      const ink = new LayerInk();
      ink.setFrame({ w: 200, h: 200, density: 2 });
      const host = document.createElement("div");
      document.body.append(host);
      const display = new LayerDisplay(host, ink);
      const state = {
        layers: [
          { id: 1, opacity: 100, locked: false, clipped: false },
          { id: 2, opacity: reason === "hidden-layer" ? 0 : 100, locked: false, clipped: true },
        ],
        nextId: 3,
      };
      const brush = (layer: number, y: number) => ({
        tool: "brush" as const,
        layer,
        color: "#ff4f9a",
        pts: [20, y, 6, 0, 160, y, 6, 16],
        T: 0,
      });
      ink.apply(brush(1, 100), state);
      if (reason !== "empty") ink.apply(brush(2, reason === "disjoint" ? 160 : 100), state);
      display.show(state, 2);
      display.flash();
      const effects = () => host.querySelectorAll("[class*='layer-flash']").length;
      const shown = effects();
      const canvases = [
        ...host.querySelectorAll<HTMLCanvasElement>("canvas[class*='layer-flash']"),
      ];
      const pulse = host.querySelector<HTMLCanvasElement>(".layer-flash__pulse");
      const offInk = pulse ? pulse.getContext("2d")?.getImageData(25, 10, 1, 1).data[3] : 0;
      if (reason === "selection") {
        display.show(state, 1);
        display.flash();
        display.show(state, 2);
      }
      if (reason === "drawing") display.beginStroke(brush(2, 100));
      if (reason === "resize") display.resize();
      if (reason === "opacity") display.previewOpacity(50);
      if (reason === "teardown") display.release();
      if (reason === "hidden") {
        Object.defineProperty(document, "hidden", { configurable: true, value: true });
        document.dispatchEvent(new Event("visibilitychange"));
        Reflect.deleteProperty(document, "hidden");
      }
      results.push({
        reason,
        shown,
        remaining: effects(),
        offInk,
        released: canvases.every((canvas) => canvas.width === 0 && canvas.height === 0),
      });
      display.release();
      ink.releaseAll();
      host.remove();
    }
    return results;
  });
  for (const row of results) {
    if (["disjoint", "empty", "hidden-layer"].includes(row.reason))
      expect(row.shown, row.reason).toBe(0);
    else expect(row.shown, row.reason).toBeGreaterThan(0);
    expect(row.offInk, row.reason).toBe(0);
    expect(row.remaining, row.reason).toBe(0);
    expect(row.released, row.reason).toBe(true);
  }
});

test("changing reduced motion cancels browser playback immediately", async ({ page }) => {
  await page.route("**/e2e-layer-feedback", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: "<!doctype html><title>Motion preference interruption</title>",
    }),
  );
  await page.goto("/e2e-layer-feedback");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.clock.install();
  await page.clock.pauseAt(new Date());
  await page.evaluate(async () => {
    const { flashLayer } = await import("../src/sticker-creation/layers/layerFlash.ts");
    const layer = document.createElement("canvas");
    const g = layer.getContext("2d");
    if (!g) throw new Error("No native canvas context");
    g.fillRect(20, 20, 100, 100);
    const above = document.createElement("canvas");
    above.width = above.height = 0;
    flashLayer({
      layer,
      above,
      inked: { x: 20, y: 20, w: 100, h: 100 },
      current: document.body,
      sheet: document.body,
      onEnd: () => {
        throw new Error("Canceled feedback completed");
      },
    });
  });
  await expect(page.locator(".layer-flash__pulse")).toHaveCount(1);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(page.locator("[class*='layer-flash']")).toHaveCount(0);
  await page.clock.runFor(600);
});
