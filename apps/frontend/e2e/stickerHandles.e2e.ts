import { expect, type Locator, type Page } from "@playwright/test";
import { naturalSOf, RESIZE_REACH, type Art } from "../src/sticker-board/placement.ts";
import { boardSticker, sealFromBoard, signIn, test } from "./helpers.ts";
import { FINGERTIP, hand, touchStroke, type At } from "./pen.ts";

const language = "en";
/** A fingertip's touch: the least a sticker takes, however small it was drawn. */
const TOUCH_TARGET = 44;

/** The middle of an element on screen. */
async function middleOf(el: Locator): Promise<At> {
  const box = await el.boundingBox();
  if (!box) throw new Error("It isn't on screen");
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** A JSON value's `name`, if it's an object that has one. */
const memberOf = (value: unknown, name: string): unknown =>
  value !== null && typeof value === "object"
    ? Object.entries(value).find(([key]) => key === name)?.[1]
    : undefined;

/** The `field` of a JSON body's `key`, which must be a number. */
function numberIn(body: unknown, key: string, field: string): number {
  const value = memberOf(memberOf(body, key), field);
  if (typeof value !== "number") throw new Error(`${key}.${field} in ${JSON.stringify(body)}`);
  return value;
}

/** The size the app saves for sticker `id` next. Ask before the gesture ends, so it isn't missed. */
function savedScale(page: Page, id: string) {
  return page
    .waitForRequest((r) => r.method() === "PATCH" && r.url().endsWith(`/sticker-placements/${id}`))
    .then((request) => numberIn(request.postDataJSON(), "placement", "scale"));
}

/** Seals a sticker from the board, its stroke `reach` times the usual; its number, ID, drawn size and element. */
async function sealSized(page: Page, reach: number) {
  const sealed = page.waitForResponse(
    (r) => r.request().method() === "POST" && new URL(r.url()).pathname === "/api/stickers",
  );
  const no = await sealFromBoard(page, language, { reach });
  const body: unknown = await (await sealed).json();
  const drawn = {
    drawnWidth: numberIn(body, "sticker", "drawnWidth"),
    drawnHeight: numberIn(body, "sticker", "drawnHeight"),
  } satisfies Pick<Art, "drawnWidth" | "drawnHeight">;
  const el = boardSticker(page, language, no);
  await expect(el).not.toHaveClass(/is-landing/);
  const id = await el.getAttribute("data-sticker-id");
  if (!id) throw new Error("The sticker carries no ID");
  return { no, id, drawn, el };
}

/** A sticker's long side on the board, in px, as its box is drawn before its turn. */
const longSideOf = (el: Locator) =>
  el.evaluate((node) =>
    node instanceof HTMLElement
      ? Math.max(parseFloat(node.style.width), parseFloat(node.style.height))
      : 0,
  );

/** A finger from `corner` along its line from the sticker's middle, to `k` times as far out. */
async function dragCorner(page: Page, sticker: Locator, corner: Locator, k: number) {
  const from = await middleOf(corner);
  const center = await middleOf(sticker);
  const path = Array.from({ length: 21 }, (_, i) => {
    const t = 1 + ((k - 1) * i) / 20;
    return { x: center.x + (from.x - center.x) * t, y: center.y + (from.y - center.y) * t };
  });
  await touchStroke(page, await hand(page), path, FINGERTIP);
}

test("stickers land sized by how big they were drawn, a corner stops at twice that, and a small one takes a fingertip", async ({
  page,
}) => {
  await signIn(page, "drawnsize", language);
  const small = await sealSized(page, 0.15);
  const big = await sealSized(page, 1.5);

  const [smallLong, bigLong] = [await longSideOf(small.el), await longSideOf(big.el)];
  const long = (d: typeof small.drawn) => Math.max(d.drawnWidth, d.drawnHeight);
  expect(long(big.drawn)).toBeGreaterThan(long(small.drawn));
  expect(smallLong / bigLong).toBeCloseTo(long(small.drawn) / long(big.drawn), 2);

  // Drawn smaller than a fingertip, it's shown at its size, and a tap beside its art still takes it.
  expect(smallLong).toBeLessThan(TOUCH_TARGET);
  const middle = await middleOf(small.el);
  const beside = (smallLong / 2 + TOUCH_TARGET / 2) / 2;
  await page.mouse.click(middle.x, middle.y + beside);
  await expect(small.el).toHaveAttribute("aria-pressed", "true");

  // A corner dragged far out stops at twice its natural size.
  const saved = savedScale(page, small.id);
  await dragCorner(page, small.el, small.el.locator(".placed-sticker__handle--ne"), 6);
  expect(await saved).toBeCloseTo(RESIZE_REACH * naturalSOf(small.drawn, "phone"), 3);
});

test("a corner handle dragged in past its sticker's center leaves the sticker at its smallest", async ({
  page,
}) => {
  await signIn(page, "corner", language);
  const { id, drawn, el } = await sealSized(page, 1);
  await el.click();
  const corner = el.locator(".placed-sticker__handle--ne");
  await expect(corner).toBeVisible();

  // A finger from the top-right corner in through the center, and on past it toward the bottom-left.
  const saved = savedScale(page, id);
  await dragCorner(page, el, corner, -1.2);
  expect(await saved).toBeCloseTo(naturalSOf(drawn, "phone") / RESIZE_REACH, 3);
});
