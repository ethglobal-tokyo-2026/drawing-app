import { writeFile } from "node:fs/promises";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { add, chip, line, openSheet, slider, undo } from "./fillHelpers.ts";
import { pencil, type At, type Pencil } from "./pen.ts";

interface LayerFrame {
  chips: { id: string | undefined; x: number; y: number; width: number; height: number }[];
  scrollTop: number;
  scrollHeight: number;
}

declare global {
  interface Window {
    layerStabilitySample?: { first: LayerFrame; frames: LayerFrame[]; raf: number };
  }
}

/** Sample actual boxes each frame, catching movement that settles before the last frame. */
async function sampleGeometry(page: Page, input: () => Promise<void>) {
  await page.evaluate(() => {
    const list = document.querySelector(".layer-list");
    if (!(list instanceof HTMLElement)) throw new Error("The layer list is missing");
    const read = (): LayerFrame => ({
      chips: [...list.querySelectorAll<HTMLElement>("[data-layer-chip]")].map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { id: element.dataset.layerChip, x, y, width, height };
      }),
      scrollTop: list.scrollTop,
      scrollHeight: list.scrollHeight,
    });
    const sample = { first: read(), frames: [] as LayerFrame[], raf: 0 };
    const until = performance.now() + 10_000;
    const frame = () => {
      sample.frames.push(read());
      if (performance.now() < until) sample.raf = requestAnimationFrame(frame);
    };
    sample.raf = requestAnimationFrame(frame);
    window.layerStabilitySample = sample;
  });
  try {
    await input();
  } finally {
    await page.evaluate(() => {
      if (window.layerStabilitySample) cancelAnimationFrame(window.layerStabilitySample.raf);
    });
  }
  return page.evaluate(() => {
    const sample = window.layerStabilitySample;
    if (!sample) throw new Error("The layer frame samples are missing");
    delete window.layerStabilitySample;
    return sample;
  });
}

async function tap(page: Page, pen: Pencil, point: At, testInfo: TestInfo) {
  await pen.down(point, 0.2);
  await page.waitForTimeout(70);
  await pen.up(point);
  // WebKit's pen helper dispatches pointer events without their compatibility click.
  if (testInfo.project.name === "webkit") await page.mouse.click(point.x, point.y);
}

for (const variant of [
  { hand: "right", count: 1, width: 1024, height: 768, reduced: false },
  { hand: "left", count: 1, width: 375, height: 667, reduced: true },
  { hand: "right", count: 3, width: 375, height: 667, reduced: false },
  { hand: "left", count: 3, width: 1024, height: 768, reduced: true },
  { hand: "right", count: 10, width: 1024, height: 768, reduced: true },
  { hand: "left", count: 10, width: 375, height: 667, reduced: false },
] as const) {
  test(`Pencil hover and short taps keep ${variant.count} layers still for the ${variant.hand} hand`, async ({
    page,
  }, testInfo) => {
    const { hand, count, width, height, reduced } = variant;
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
    await page.addInitScript((value) => localStorage.setItem("draw.hand", value), hand);
    await openSheet(page, `ps${hand[0]}${count}`);
    for (let id = 2; id <= count; id++) await add(page).click();
    await line(page, 0.35);
    const pen = await pencil(page);
    const list = page.locator(".layer-list");
    for (const id of count === 10 ? [10, 1] : [count]) {
      await list.evaluate(async (element, first) => {
        element.scrollTop = first ? 0 : element.scrollHeight;
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }, id === count);
      const rest = await chip(page, id).boundingBox();
      const track = await list.boundingBox();
      if (!rest || !track) throw new Error("The layer chip or list has no box");
      const center = { x: rest.x + rest.width / 2, y: rest.y + rest.height / 2 };
      const boundary = hand === "right" ? track.x + track.width : track.x;
      const sample = await sampleGeometry(page, async () => {
        await pen.hover(center);
        for (let step = 0; step < 16; step++) {
          // Alternate tiny nib movement with leaving and reentering the control's edge.
          await pen.hover({
            x:
              step % 4 < 2
                ? center.x + (step % 2 ? 0.6 : -0.6)
                : boundary + (step % 2 ? 0.5 : -0.5),
            y: center.y + (step % 2 ? 0.7 : -0.7),
          });
          await page.evaluate(() => new Promise(requestAnimationFrame));
        }
        await pen.hover(center);
        await tap(page, pen, center, testInfo);
        for (const dy of [-0.7, 0.7, 0, -0.3, 0.3])
          await pen.hover({ ...center, y: center.y + dy });
        await page.waitForTimeout(240);
        await pen.hover({ x: width / 2, y: height * 0.7 });
        await page.waitForTimeout(240);
      });
      const frames = testInfo.outputPath(`layer-frames-${id}.json`);
      await writeFile(frames, JSON.stringify(sample));
      await testInfo.attach(`layer-frames-${id}`, {
        path: frames,
        contentType: "application/json",
      });
      expect(sample.frames.length).toBeGreaterThan(10);
      let movement = 0;
      for (const frame of sample.frames) {
        expect(frame.scrollTop).toBe(sample.first.scrollTop);
        expect(frame.scrollHeight).toBe(sample.first.scrollHeight);
        for (const original of sample.first.chips) {
          const shown = frame.chips.find((item) => item.id === original.id);
          if (!shown) throw new Error(`Layer ${original.id} disappeared during hover`);
          for (const dimension of ["x", "y", "width", "height"] as const)
            movement = Math.max(movement, Math.abs(shown[dimension] - original[dimension]));
        }
      }
      expect(
        movement,
        "Hover, short press, and release must not resize or move a layer target",
      ).toBeLessThanOrEqual(0.25);
      expect(rest.width).toBe(36);
      expect(rest.height).toBe(46);
      await expect(chip(page, id)).toHaveAttribute("aria-selected", "true");
      if (id === count) {
        await expect(slider(page)).toBeVisible();
        await slider(page).press("Escape");
        await expect(chip(page, id)).toBeFocused();
      }
      await pen.hover(center);
      const screenshot = testInfo.outputPath(`stable-pencil-${id}.png`);
      await page.screenshot({ path: screenshot });
      await testInfo.attach(`stable-pencil-${id}`, { path: screenshot, contentType: "image/png" });
      const inward = hand === "right" ? track.x + track.width + 2 : track.x - 2;
      expect(
        await page.evaluate(
          ({ x, y }) => !!document.elementFromPoint(x, y)?.closest(".layer-column"),
          {
            x: inward,
            y: center.y,
          },
        ),
        "The compact layer column must not capture input outside its track",
      ).toBe(false);
    }
    if (count === 10) {
      await expect(page.locator(".layer-scroll-well")).toHaveAttribute("data-more-above", "true");
      await expect(page.locator(".layer-scroll-well")).not.toHaveAttribute(
        "data-more-below",
        "true",
      );
    }
  });
}

test("Pencil taps select and open options, and an intentional hold still reorders", async ({
  page,
}, testInfo) => {
  await openSheet(page, "pstap");
  await add(page).click();
  await add(page).click();
  await expect(chip(page, 3)).toHaveAttribute("aria-selected", "true");
  const pen = await pencil(page);
  const target = await chip(page, 2).boundingBox();
  const last = await chip(page, 1).boundingBox();
  if (!target || !last) throw new Error("The layer chips have no boxes");
  const center = { x: target.x + target.width / 2, y: target.y + target.height / 2 };
  await pen.hover(center);
  await tap(page, pen, center, testInfo);
  await expect(chip(page, 2)).toHaveAttribute("aria-selected", "true");
  await expect(slider(page)).toBeHidden();
  await tap(page, pen, center, testInfo);
  await expect(slider(page)).toBeVisible();
  await slider(page).press("Escape");
  await expect(chip(page, 2)).toBeFocused();
  await page.keyboard.press("ArrowUp");
  await expect(chip(page, 3)).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(chip(page, 3)).toHaveAttribute("aria-selected", "true");
  await pen.down(center, 0.5);
  await page.waitForTimeout(500);
  await expect.poll(async () => (await chip(page, 2).boundingBox())?.width).toBeCloseTo(38.16, 1);
  const drop = { ...center, y: last.y + last.height / 2 };
  await pen.move(drop, 0.5);
  await pen.up(drop);
  await expect(page.locator(".layer-list [data-layer-chip]").last()).toHaveAttribute(
    "data-layer-chip",
    "2",
  );
  await expect(slider(page)).toBeHidden();
  await expect.poll(async () => (await chip(page, 2).boundingBox())?.width).toBeCloseTo(36, 1);
  await undo(page).click();
  await expect(page.locator(".layer-list [data-layer-chip]").nth(1)).toHaveAttribute(
    "data-layer-chip",
    "2",
  );
});
