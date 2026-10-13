import { expect, test } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { openSettings, say, signIn } from "./helpers.ts";
import { ipad } from "./ipad.ts";

test.use(ipad);

test("pointer indicators follow Settings without taking controls' input", async ({ page }) => {
  await signIn(page, "pointer-indicators", "en");
  const settings = await openSettings(page, "en");
  const choice = settings.getByRole("switch", {
    name: say(strings.stickerBoard.settings.drawing.pointerIndicators.label, "en"),
  });
  await expect(choice).not.toBeChecked();
  await choice.check();
  const overlay = page.locator(".pointer-indicators");
  await expect(overlay).toBeAttached();
  await expect(overlay).toHaveCSS("pointer-events", "none");
  await expect(overlay).toHaveAttribute("aria-hidden", "true");
  await settings.dispatchEvent("pointermove", {
    pointerType: "pen",
    pointerId: 8,
    buttons: 0,
    clientX: 100,
    clientY: 120,
  });
  await expect(page.locator(".pointer-indicators__cursor")).toBeVisible();
  await expect(page.locator(".pointer-indicators__cursor")).toHaveCSS("width", "20px");
  await settings.dispatchEvent("pointerdown", {
    pointerType: "pen",
    pointerId: 8,
    buttons: 1,
    clientX: 100,
    clientY: 120,
  });
  await expect(page.locator(".pointer-indicators__ripple")).toHaveCount(1);
  await settings.dispatchEvent("pointerup", { pointerType: "pen", pointerId: 8, buttons: 0 });
  await expect(page.locator(".pointer-indicators__cursor")).toHaveCount(0);
  await expect(page.locator(".pointer-indicators__ripple")).toHaveCount(0);
  await page.reload();
  const again = await openSettings(page, "en");
  const kept = again.getByRole("switch", { name: /Show pointer and taps/ });
  await expect(kept).toBeChecked();
  await kept.uncheck();
  await expect(overlay).toHaveCount(0);
});

test("the standalone proof shows contact without claiming synthetic hover is real", async ({
  page,
}) => {
  await page.goto("/e2e/pointerIndicatorsReview.html?lang=en");
  await expect(page.getByText("No hover detected yet", { exact: true })).toBeVisible();
  const target = page.getByRole("region", { name: "Hover, tap, or drag here" });
  await target.dispatchEvent("pointermove", {
    pointerType: "pen",
    pointerId: 8,
    buttons: 0,
    clientX: 100,
    clientY: 220,
  });
  await expect(page.locator(".pointer-indicators__cursor")).toBeVisible();
  await expect(page.getByText("No hover detected yet", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Tap this button" }).tap();
  await expect(page.getByText("Button taps: 1", { exact: true })).toBeVisible();
  await expect(page.getByText("Pointer-down events: 1", { exact: true })).toBeVisible();
  await page.getByRole("switch").uncheck();
  await expect(page.locator(".pointer-indicators")).toHaveCount(0);
});

test("one Pencil indicator follows a slight drag and returns to hover when its identifier changes", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/e2e/pointerIndicatorsReview.html?lang=en");
  const target = page.getByRole("region", { name: "Hover, tap, or drag here" });
  const cursor = page.locator(".pointer-indicators__cursor");
  await target.dispatchEvent("pointermove", {
    pointerType: "pen",
    pointerId: 8,
    buttons: 0,
    clientX: 100,
    clientY: 220,
  });
  await expect(cursor).toHaveCount(1);
  await target.dispatchEvent("pointerdown", {
    pointerType: "pen",
    pointerId: 9,
    buttons: 1,
    clientX: 100,
    clientY: 220,
  });
  await expect(cursor).toHaveCount(1);
  await expect(cursor).toHaveAttribute("data-contact", "");
  await target.dispatchEvent("pointermove", {
    pointerType: "pen",
    pointerId: 9,
    buttons: 1,
    clientX: 105,
    clientY: 225,
  });
  await expect
    .poll(() =>
      cursor.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2];
      }),
    )
    .toEqual([105, 225]);
  // A hover movement reports that contact ended even if pointerup did not arrive.
  await target.dispatchEvent("pointermove", {
    pointerType: "pen",
    pointerId: 10,
    buttons: 0,
    clientX: 110,
    clientY: 230,
  });
  await expect(cursor).toHaveCount(1);
  await expect(page.locator(".pointer-indicators__cursor[data-contact]")).toHaveCount(0);
  await expect
    .poll(() =>
      cursor.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2];
      }),
    )
    .toEqual([110, 230]);
  // The contact's lift can arrive after hover has resumed with another identifier.
  await target.dispatchEvent("pointerup", {
    pointerType: "pen",
    pointerId: 9,
    buttons: 0,
    clientX: 110,
    clientY: 230,
  });
  await expect(cursor).toHaveCount(0);
  await target.dispatchEvent("pointermove", {
    pointerType: "pen",
    pointerId: 10,
    buttons: 0,
    clientX: 110,
    clientY: 230,
  });
  await expect(cursor).toHaveCount(1);
  await target.dispatchEvent("pointerout", {
    pointerType: "pen",
    pointerId: 10,
    relatedTarget: null,
  });
  await expect(cursor).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("a Pencil indicator follows stylus touch movement and clears when pointer movement and lift are missing", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/e2e/pointerIndicatorsReview.html?lang=en");
  const target = page.getByRole("region", { name: "Hover, tap, or drag here" });
  const cursor = page.locator(".pointer-indicators__cursor");
  await target.dispatchEvent("pointerdown", {
    pointerType: "pen",
    pointerId: 9,
    buttons: 1,
    clientX: 100,
    clientY: 220,
  });
  await expect(cursor).toHaveCount(1);
  await target.evaluate((element) => {
    const touch = {
      identifier: 89,
      target: element,
      touchType: "stylus",
      clientX: 105,
      clientY: 225,
      force: 0.5,
    };
    const event = new Event("touchmove", { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      touches: { value: [touch] },
      changedTouches: { value: [touch] },
    });
    element.dispatchEvent(event);
  });
  await expect
    .poll(() =>
      cursor.evaluate((element) => {
        const bounds = element.getBoundingClientRect();
        return [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2];
      }),
    )
    .toEqual([105, 225]);
  await target.evaluate((element) => {
    const touch = {
      identifier: 89,
      target: element,
      touchType: "stylus",
      clientX: 105,
      clientY: 225,
      force: 0.5,
    };
    const event = new Event("touchend", { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      touches: { value: [] },
      changedTouches: { value: [touch] },
    });
    element.dispatchEvent(event);
  });
  await expect(cursor).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("rapid Pencil contacts keep separate ripples anchored through slight drags and lifts", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/e2e/pointerIndicatorsReview.html?lang=en");
  const target = page.getByRole("region", { name: "Hover, tap, or drag here" });
  await expect(page.locator(".pointer-indicators")).toBeAttached();
  const ripples = await target.evaluate(async (element) => {
    const contacts = [
      [180, 480],
      [260, 480],
      [340, 480],
    ] as const;
    for (const [index, [clientX, clientY]] of contacts.entries()) {
      const point = (type: string, buttons: number, drag = 0) =>
        element.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            cancelable: true,
            pointerType: "pen",
            pointerId: 20 + index,
            clientX: clientX + drag,
            clientY: clientY + drag,
            buttons,
            pressure: buttons === 0 ? 0 : 0.5,
          }),
        );
      const stylusTouch = (type: string, drag = 0) => {
        const touch = {
          identifier: 20 + index,
          target: element,
          touchType: "stylus",
          clientX: clientX + drag,
          clientY: clientY + drag,
          force: type === "touchend" ? 0 : 0.5,
        };
        const event = new Event(type, { bubbles: true, cancelable: true });
        Object.defineProperties(event, {
          touches: { value: type === "touchend" ? [] : [touch] },
          changedTouches: { value: [touch] },
        });
        element.dispatchEvent(event);
      };
      // First contact is pointer-first, second has no pointerdown, third is touch-first.
      if (index === 0) point("pointerdown", 1);
      stylusTouch("touchstart");
      if (index === 2) point("pointerdown", 1);
      point("pointermove", 1, 3);
      stylusTouch("touchmove", 3);
      point("pointerup", 0, 3);
      stylusTouch("touchend", 3);
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    }
    return Array.from(document.querySelectorAll(".pointer-indicators__ripple"), (ripple) => {
      const bounds = ripple.getBoundingClientRect();
      const appearance = getComputedStyle(ripple, "::after");
      return {
        center: [bounds.left + bounds.width / 2, bounds.top + bounds.height / 2],
        opacity: Number(appearance.opacity),
        animation: appearance.animationName,
      };
    });
  });
  expect(ripples).toHaveLength(3);
  expect(ripples.map((ripple) => ripple.center)).toEqual([
    [180, 480],
    [260, 480],
    [340, 480],
  ]);
  expect(ripples.every((ripple) => ripple.opacity > 0 && ripple.animation !== "none")).toBe(true);
  await expect(page.locator(".pointer-indicators__cursor")).toHaveCount(0);
  await expect(page.locator(".pointer-indicators__ripple")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});

test("the standalone target handles Pencil movement directly while controls keep their usual input", async ({
  page,
}) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.goto("/e2e/pointerIndicatorsReview.html?lang=en");
  await expect(page.getByRole("switch")).toBeChecked();
  const movementIsPrevented = (element: Element) => {
    const touch = {
      identifier: -147703113,
      target: element,
      touchType: "stylus",
      clientX: 565,
      clientY: 553,
      force: 0.08,
    };
    const event = new Event("touchmove", { bubbles: true, cancelable: true });
    Object.defineProperties(event, {
      touches: { value: [touch] },
      changedTouches: { value: [touch] },
    });
    element.dispatchEvent(event);
    return event.defaultPrevented;
  };
  const target = page.getByRole("region", { name: "Hover, tap, or drag here" });
  expect(await target.evaluate(movementIsPrevented)).toBe(true);
  const button = page.getByRole("button", { name: "Tap this button", exact: true });
  expect(await button.evaluate(movementIsPrevented)).toBe(false);
  await button.tap();
  await expect(page.getByText("Button taps: 1", { exact: true })).toBeVisible();
  expect(pageErrors).toEqual([]);
});
