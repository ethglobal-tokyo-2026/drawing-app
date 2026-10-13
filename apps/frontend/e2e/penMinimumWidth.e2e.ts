import { DAILY_TICKETS_PER_DAY } from "@drawing-app/api/client";
import { expect, test } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import type { InkSettings } from "../src/sticker-creation/canvas/inkEngine.ts";
import type { Step } from "../src/sticker-creation/canvas/ops.ts";
import { canvas, chooseLanguage, drawKeyName, openSettings, say, signIn } from "./helpers.ts";
import { ipad } from "./ipad.ts";
import { phone } from "./phone.ts";
import { along, inkAt, inkShows, middle, pencil, penStroke } from "./pen.ts";

const { stickerBoard, stickerCreation } = strings;
const words = stickerBoard.settings.pencil;

for (const { language, device } of [
  { language: "en" as const, device: ipad },
  { language: "ja" as const, device: phone },
]) {
  test.describe(`minimum pen width in ${language}`, () => {
    test.use(device);

    test("keeps keyboard adjustments after reload and retains them while pressure is Off", async ({
      page,
    }, testInfo) => {
      await signIn(page, `minimum-width-${language}`, "en");
      if (language === "ja") {
        await openSettings(page, "en");
        await chooseLanguage(page, "en", "ja");
      }
      await page.evaluate(() => localStorage.setItem("draw.inputMode", "pencilOnly"));
      await page.reload();
      let settings = await openSettings(page, language);
      const slider = () =>
        settings.getByRole("slider", { name: say(words.minimumWidth.title, language) });
      await expect(slider()).toHaveValue("20");
      await slider().press("ArrowLeft");
      await expect(slider()).toHaveValue("19");
      expect(await page.evaluate(() => localStorage.getItem("draw.penMinimumWidth"))).toBe("19");

      await page.reload();
      settings = await openSettings(page, language);
      await expect(slider()).toHaveValue("19");
      await slider().scrollIntoViewIfNeeded();
      await settings.locator('[data-setting="drawing"]').screenshot({
        path: testInfo.outputPath(`minimum-width-${language}.png`),
      });
      const pressure = settings.getByRole("radiogroup", {
        name: say(words.pressure.title, language),
      });
      await pressure.getByRole("radio", { name: say(words.pressure.off, language) }).click();
      await expect(slider()).toBeDisabled();
      await expect(slider()).toHaveValue("19");
      await pressure.getByRole("radio", { name: say(words.pressure.normal, language) }).click();
      await expect(slider()).toBeEnabled();
      await slider().press("End");
      await expect(slider()).toHaveValue("100");
      await slider().press("Home");
      await expect(slider()).toHaveValue("0");
      expect(await page.evaluate(() => localStorage.getItem("draw.penMinimumWidth"))).toBe("0");
    });
  });
}

test.describe("minimum width on the drawing sheet", () => {
  test.use(ipad);

  test("uses the saved minimum for a first constant light-pressure stroke", async ({ page }) => {
    await signIn(page, "first-light-minimum", "en");
    await page.evaluate(() => {
      localStorage.setItem("draw.inputMode", "pencilOnly");
      localStorage.setItem("draw.penMinimumWidth", "80");
    });
    await page.getByRole("button", { name: drawKeyName("en", DAILY_TICKETS_PER_DAY) }).click();
    await expect(
      page.getByText(say(stickerCreation.timer.note.startsWhenYouDraw, "en")).first(),
    ).toBeVisible();
    const sheet = canvas(page, "en");
    await sheet.hover();
    const box = await sheet.boundingBox();
    if (!box) throw new Error("The sheet isn't on screen");
    const pen = await pencil(page);
    const light = along(box, 0.4, 0.2, 0.8);
    const full = along(box, 0.65, 0.2, 0.8);
    await penStroke(page, pen, light, () => 0.05);
    await penStroke(page, pen, full, () => 1);
    await inkShows(page, middle(light), middle(full));
    const lightInk = await inkAt(page, middle(light));
    const fullInk = await inkAt(page, middle(full));
    expect(lightInk).toBeGreaterThan(fullInk * 0.5);
    expect(lightInk).toBeLessThan(fullInk * 0.9);
  });
});

test("a delayed pressure reading clears the old dot through clipped layers", async ({ page }) => {
  await page.route("**/e2e-pen-minimum", (route) =>
    route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Pen minimum</title>" }),
  );
  await page.goto("/e2e-pen-minimum");
  const results = await page.evaluate(async () => {
    const [{ InkEngine }, { LayerInk }, { LayerDisplay }, { FIRST_POST_CORRECTION }] =
      await Promise.all([
        import("../src/sticker-creation/canvas/inkEngine.ts"),
        import("../src/sticker-creation/layers/layerInk.ts"),
        import("../src/sticker-creation/layers/layerDisplay.ts"),
        import("../src/sticker-creation/canvas/post-correction/settings.ts"),
      ]);
    return ["plain", "clipped-current", "clipped-above"].map((mode) => {
      const host = document.createElement("div");
      document.body.append(host);
      const ink = new LayerInk();
      const display = new LayerDisplay(host, ink);
      let frame: ((time: number) => void) | null = null;
      const settings: InkSettings = {
        tool: "brush",
        fillReference: "layer",
        color: "#000000",
        size: 40,
        smoothing: 0,
        smoothingMode: "fixed",
        postCorrection: FIRST_POST_CORRECTION,
        locked: false,
        paused: false,
        panelOpen: false,
        inputMode: "pencilOnly",
        penPressure: "normal",
        penMinimumWidth: 20,
        sessionMs: () => 0,
      };
      const engine = new InkEngine(
        ink,
        display,
        settings,
        {
          onHistory() {},
          onCommit() {},
          onBlocked() {},
          onBlockedHidden() {},
          onPen() {},
          onHover() {},
          onLayers() {},
          onFillState() {},
          onInkFailed(error) {
            throw error;
          },
        },
        {
          now: () => 16,
          request(next) {
            frame = next;
            return () => {
              frame = null;
            };
          },
        },
      );
      const steps: Step[] = [
        { tool: "brush", layer: 1, color: "#0000ff", T: 0, pts: [10, 10, 1, 0] },
      ];
      let current = 1;
      if (mode !== "plain") {
        steps.push({ tool: "add", layer: 2, at: 1, T: 0 });
        if (mode === "clipped-current") {
          steps.push(
            { tool: "brush", layer: 1, color: "#0000ff", T: 0, pts: [50, 50, 60, 0] },
            { tool: "clip", layer: 2, on: true, T: 0 },
          );
          current = 2;
        } else {
          steps.push(
            { tool: "brush", layer: 2, color: "#ff0000", T: 0, pts: [50, 50, 60, 0] },
            { tool: "clip", layer: 2, on: true, T: 0 },
          );
        }
      }
      engine.load(steps, { w: 100, h: 100, density: 1 }, current);
      const at = (pressure: number, timeStamp: number) => ({
        pointerId: 1,
        pointerType: "pen",
        button: 0,
        buttons: 1,
        clientX: 50,
        clientY: 50,
        width: 1,
        height: 1,
        pressure,
        timeStamp,
        preventDefault() {},
      });
      const pixels = () => {
        const above = host.lastElementChild;
        if (!(above instanceof HTMLCanvasElement))
          throw new Error("No canvas above the current layer");
        const shown =
          mode === "clipped-above"
            ? [above]
            : [...host.querySelectorAll<HTMLCanvasElement>(".ink-current canvas")].filter(
                (canvas) => getComputedStyle(canvas).visibility !== "hidden",
              );
        const composite = document.createElement("canvas");
        composite.width = composite.height = 100;
        const context = composite.getContext("2d");
        if (!context) throw new Error(`No visible pen canvas for ${mode}`);
        for (const canvas of shown) {
          if (canvas.width && canvas.height) context.drawImage(canvas, 0, 0);
        }
        return {
          center: context.getImageData(50, 50, 1, 1).data[3],
          edge: context.getImageData(54, 50, 1, 1).data[3],
        };
      };
      engine.down(at(0, 0));
      const initial = pixels();
      engine.move(at(0.05, 16));
      if (!frame) throw new Error("The pressure update did not request a frame");
      (frame as (time: number) => void)(16);
      const corrected = pixels();
      engine.up(at(0, 32));
      const committed = pixels();
      engine.dispose();
      host.remove();
      return { mode, initial, corrected, committed };
    });
  });
  for (const result of results) {
    expect(result.initial.edge, result.mode).toBeGreaterThan(200);
    expect(result.corrected.edge, result.mode).toBe(0);
    expect(result.corrected.center, result.mode).toBeGreaterThan(200);
    expect(result.committed.edge, result.mode).toBe(0);
    expect(result.committed.center, result.mode).toBeGreaterThan(200);
  }
});
