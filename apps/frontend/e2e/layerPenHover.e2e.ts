import { expect, test, type Page } from "@playwright/test";
import { add, chip, line, openSheet, slider } from "./fillHelpers.ts";
import { pencil } from "./pen.ts";

/** A hit test also catches overflow clipping that a transformed bounding box cannot show. */
async function layerAt(page: Page, x: number, y: number) {
  return page.evaluate(
    ({ x, y }) =>
      document
        .elementFromPoint(x, y)
        ?.closest("[data-layer-chip]")
        ?.getAttribute("data-layer-chip") ?? null,
    { x, y },
  );
}

const scrollMetrics = (page: Page) =>
  page.locator(".layer-list").evaluate((list) => ({
    height: list.scrollHeight,
    top: list.scrollTop,
    width: list.scrollWidth,
    clientWidth: list.clientWidth,
  }));

async function expectPaperClear(page: Page, hand: "left" | "right", id: number) {
  const paper = page.locator(".layer-options, .layer-options-hint");
  if ((await paper.count()) === 0) return;
  const bounds = await paper.boundingBox();
  const target = await chip(page, id).boundingBox();
  if (!bounds || !target) throw new Error("The layer paper or chip has no box");
  if (hand === "right") expect(bounds.x).toBeGreaterThanOrEqual(target.x + target.width + 8);
  else expect(bounds.x + bounds.width).toBeLessThanOrEqual(target.x - 8);
  expect(bounds.x).toBeGreaterThanOrEqual(8);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) - 8);
}

for (const hand of ["right", "left"] as const) {
  for (const count of [1, 3]) {
    test(`Pencil hover keeps ${count} enlarged layers visible for the ${hand} hand`, async ({
      page,
    }, testInfo) => {
      await page.setViewportSize({ width: 1024, height: 768 });
      await page.addInitScript((value) => localStorage.setItem("draw.hand", value), hand);
      await openSheet(page, `ph${hand[0]}${count}`);
      for (let id = 2; id <= count; id++) await add(page).click();
      await line(page, 0.35);
      const selected = chip(page, count);
      const rest = await selected.boundingBox();
      if (!rest) throw new Error("The layer chip has no resting box");
      const pen = await pencil(page);
      const scrollBefore = await scrollMetrics(page);
      await pen.hover({ x: rest.x + rest.width / 2, y: rest.y + rest.height / 2 });
      await expect.poll(async () => (await selected.boundingBox())?.width).toBeCloseTo(54, 0);
      const enlarged = await selected.boundingBox();
      if (!enlarged) throw new Error("The hovered layer chip has no box");
      const screenshot = testInfo.outputPath("pencil-hover.png");
      await page.screenshot({ path: screenshot });
      await testInfo.attach("pencil-hover", { path: screenshot, contentType: "image/png" });
      const inwardX = hand === "right" ? enlarged.x + enlarged.width - 2 : enlarged.x + 2;
      expect
        .soft(
          await layerAt(page, inwardX, enlarged.y + enlarged.height / 2),
          "The enlarged inward edge stays visible and receives Pencil input",
        )
        .toBe(String(count));
      expect
        .soft(
          await layerAt(page, enlarged.x + enlarged.width / 2, enlarged.y + 2),
          "The enlarged top stays visible and receives Pencil input",
        )
        .toBe(String(count));
      const addBox = await add(page).boundingBox();
      if (!addBox) throw new Error("Add Layer has no box");
      expect
        .soft(enlarged.y, "The enlarged chip does not overlap Add Layer")
        .toBeGreaterThanOrEqual(addBox.y + addBox.height);
      expect(await scrollMetrics(page)).toEqual(scrollBefore);
      expect(scrollBefore.width).toBe(scrollBefore.clientWidth);
      await expectPaperClear(page, hand, count);
      const listBox = await page.locator(".layer-list").boundingBox();
      if (!listBox) throw new Error("The layer list has no box");
      const gutterX = hand === "right" ? listBox.x + listBox.width - 1 : listBox.x + 1;
      expect(
        await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.tagName, {
          x: gutterX,
          y: enlarged.y + enlarged.height / 2,
        }),
        "The blank inward gutter leaves the sheet available for drawing",
      ).toBe("CANVAS");
      await pen.hover({ x: inwardX, y: enlarged.y + enlarged.height / 2 });
      await pen.down({ x: inwardX, y: enlarged.y + enlarged.height / 2 }, 0.5);
      await pen.up({ x: inwardX, y: enlarged.y + enlarged.height / 2 });
      // The synthetic WebKit pen helper emits pointer events, but no compatibility click.
      if (testInfo.project.name === "webkit")
        await page.mouse.click(inwardX, enlarged.y + enlarged.height / 2);
      await expect(slider(page)).toBeVisible();
      await expectPaperClear(page, hand, count);
      await pen.hover({ x: 512, y: 550 });
      await expect
        .poll(async () => (await selected.boundingBox())?.width)
        .toBeCloseTo(rest.width, 1);
      await expect(selected).not.toHaveAttribute("style", /transform: translate/);
      expect(await scrollMetrics(page)).toEqual(scrollBefore);
    });
  }
}

for (const variant of [
  { hand: "right" as const, width: 375, height: 667, reduced: false },
  { hand: "left" as const, width: 375, height: 667, reduced: true },
  { hand: "right" as const, width: 1024, height: 768, reduced: true },
  { hand: "left" as const, width: 1024, height: 768, reduced: false },
]) {
  test(`Pencil hover preserves both scroll ends with ten layers at ${variant.width}/${variant.hand}`, async ({
    page,
  }, testInfo) => {
    const { hand, width, height, reduced } = variant;
    await page.setViewportSize({ width, height });
    await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
    await page.addInitScript((value) => localStorage.setItem("draw.hand", value), hand);
    await openSheet(page, `pe${hand[0]}${width}`);
    for (let id = 2; id <= 10; id++) await add(page).click();
    const pen = await pencil(page);
    const list = page.locator(".layer-list");
    for (const id of [10, 1]) {
      await list.evaluate(async (element, first) => {
        element.scrollTop = first ? 0 : element.scrollHeight;
        // Let the scroll event and its layout updates finish before starting a new hover.
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      }, id === 10);
      const selected = chip(page, id);
      const rest = await selected.boundingBox();
      if (!rest) throw new Error("The layer at the scroll end has no box");
      const before = await scrollMetrics(page);
      await pen.hover({ x: rest.x + rest.width / 2, y: rest.y + rest.height / 2 });
      await expect.poll(async () => (await selected.boundingBox())?.width).toBeCloseTo(54, 0);
      const grown = await selected.boundingBox();
      const viewport = await list.boundingBox();
      if (!grown || !viewport) throw new Error("The enlarged chip or list has no box");
      const x = hand === "right" ? grown.x + grown.width - 3 : grown.x + 3;
      for (const y of [grown.y + 3, grown.y + grown.height / 2, grown.y + grown.height - 3]) {
        await expect
          .poll(() => layerAt(page, x, y), {
            message: `The enlarged edge at ${x},${y} is visible in ${JSON.stringify(grown)}`,
          })
          .toBe(String(id));
      }
      expect(grown.y).toBeGreaterThanOrEqual(viewport.y + 3);
      expect(grown.y + grown.height).toBeLessThanOrEqual(viewport.y + viewport.height - 3);
      const footer = await page.locator(".history-buttons").boundingBox();
      if (!footer) throw new Error("The drawing footer has no box");
      expect(grown.y + grown.height).toBeLessThanOrEqual(footer.y);
      expect(await scrollMetrics(page)).toEqual(before);
      if (reduced)
        expect(
          await selected.evaluate((element) =>
            parseFloat(getComputedStyle(element).transitionDuration),
          ),
        ).toBeLessThanOrEqual(0.001);
      const screenshot = testInfo.outputPath(`pencil-hover-${id}.png`);
      await page.screenshot({ path: screenshot });
      await testInfo.attach(`pencil-hover-${id}`, { path: screenshot, contentType: "image/png" });
      await pen.hover({ x: width / 2, y: height / 2 });
      await expect.poll(async () => (await selected.boundingBox())?.width).toBeCloseTo(36, 1);
      expect(await scrollMetrics(page)).toEqual(before);
    }
    await expect(page.locator(".layer-scroll-well")).toHaveAttribute("data-more-above", "true");
    await expect(page.locator(".layer-scroll-well")).not.toHaveAttribute("data-more-below", "true");
  });
}

for (const hand of ["right", "left"] as const) {
  test(`Pencil movement keeps a fitting three-layer group whole for the ${hand} hand`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.addInitScript((value) => localStorage.setItem("draw.hand", value), hand);
    await openSheet(page, `pm${hand[0]}`);
    await add(page).click();
    await add(page).click();
    await line(page, 0.35);
    const first = await chip(page, 3).boundingBox();
    const second = await chip(page, 2).boundingBox();
    if (!first || !second) throw new Error("The first two layers have no boxes");
    const pen = await pencil(page);
    await pen.hover({ x: first.x + first.width / 2, y: first.y + first.height / 2 });
    await pen.hover({
      x: first.x + first.width / 2,
      y: (first.y + second.y + first.height) / 2 - 0.5,
    });
    await page.waitForTimeout(120);
    const screenshot = testInfo.outputPath("pencil-between-layers.png");
    await page.screenshot({ path: screenshot });
    const bounds = await page.locator(".layer-list").boundingBox();
    const top = await chip(page, 3).boundingBox();
    const bottom = await chip(page, 1).boundingBox();
    if (!bounds || !top || !bottom) throw new Error("The magnified group has no boxes");
    expect.soft(top.y).toBeGreaterThanOrEqual(bounds.y + 3);
    expect.soft(bottom.y + bottom.height).toBeLessThanOrEqual(bounds.y + bounds.height - 3);
    expect.soft(await layerAt(page, top.x + top.width / 2, top.y + 2)).toBe("3");
  });
}
