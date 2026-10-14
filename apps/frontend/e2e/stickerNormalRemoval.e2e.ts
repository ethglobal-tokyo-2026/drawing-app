import { expect, test, type Page } from "@playwright/test";
import { holdRoute, waitTwoFrames } from "./stickerMaterialFixture";

const normalSvg = {
  contentType: "image/svg+xml",
  body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="n"><stop stop-color="rgb(110,145,249)"/><stop offset="1" stop-color="rgb(170,145,249)"/></linearGradient></defs><rect width="80" height="80" fill="url(#n)"/></svg>',
};

/** Counts requests for the creased sticker's normal, answering each at once. */
async function serveNormal(page: Page) {
  const normal = { requests: 0 };
  await page.route("**/normal-removal-normal.svg", async (route) => {
    normal.requests++;
    await route.fulfill(normalSvg);
  });
  return normal;
}

/** Mounts the registered foil sticker and starts replacing it with the normal removed, holding the
 * replacement's foil mask; the complete generation and its normal must stay until it settles. */
async function stagePendingRemoval(
  page: Page,
  { late = false, resize = false, fails = false } = {},
) {
  const normal = await serveNormal(page);
  const mask = await holdRoute(page, "**/normal-removal-target-mask.svg", () =>
    fails
      ? { status: 503, body: "deliberate required material failure" }
      : {
          contentType: "image/svg+xml",
          body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect x="8" y="8" width="64" height="64" fill="white"/></svg>',
        },
  );
  await page.goto("/e2e/stickerLaminate.html?board=1");
  await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).setup());
  await page.evaluate(
    async (late) => (await import("./normalRemovalFixture.ts")).begin(late),
    late,
  );
  await mask.requested;
  if (late) await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).remove());
  if (resize) {
    const requests = mask.requests;
    await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).resizePending());
    await expect.poll(() => mask.requests).toBeGreaterThan(requests);
  }
  expect(await inspect(page)).toMatchObject({
    retainedPixels: true,
    retainedDescription: true,
    error: null,
  });
  await expectCopyRetained(page);
  expect(normal.requests).toBe(1);
  return { normal, mask };
}

const inspect = (page: Page) =>
  page.evaluate(async () => (await import("./normalRemovalFixture.ts")).inspect());

const finish = (page: Page) =>
  page.evaluate(async () => (await import("./normalRemovalFixture.ts")).finish());

/** A live copy shows the complete generation the sticker kept, not its request. */
async function expectCopyRetained(page: Page) {
  expect(
    await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).compareCopy()),
  ).toEqual({ samePixels: true, retainedPixels: true, retainedDescription: true });
}

/** The committed replacement matches the target mounted on its own, and released its normal. */
async function expectReplaced(page: Page, normal: { requests: number }) {
  expect((await inspect(page)).retainedPixels).toBe(false);
  const flat = await page.evaluate(async () =>
    (await import("./normalRemovalFixture.ts")).compareFlat(),
  );
  expect(flat).toMatchObject({
    samePixels: true,
    style: "pink",
    mask: "/normal-removal-target-mask.svg",
  });
  expect(flat.frame).toEqual(flat.shownFrame);
  await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).reacquireNormal());
  expect(normal.requests).toBe(2);
}

test("a normal removed during a pending foil replacement commits with it", async ({ page }) => {
  const { normal, mask } = await stagePendingRemoval(page, { late: true });
  mask.release();
  await finish(page);
  await expectReplaced(page, normal);
});

test("a normal removed during a pending foil replacement stays when the replacement fails", async ({
  page,
}) => {
  const { normal, mask } = await stagePendingRemoval(page, { late: true, fails: true });
  mask.release();
  await finish(page);
  const result = await inspect(page);
  expect(result).toMatchObject({ retainedPixels: true, retainedDescription: true });
  expect(result.error).toMatch(/Replacing sticker print and cut/);
  await expectCopyRetained(page);
  expect(normal.requests).toBe(1);
});

test("a sticker released during a pending normal removal discards its pixels", async ({ page }) => {
  const { mask } = await stagePendingRemoval(page, { late: true });
  await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).cancel());
  mask.release();
  await waitTwoFrames(page);
  expect((await inspect(page)).pixels).toBe(0);
  await expect(page.locator("#normal-removal")).not.toHaveAttribute("data-error");
});

test("a normal removed with its foil replacement commits with it", async ({ page }) => {
  const { normal, mask } = await stagePendingRemoval(page);
  mask.release();
  await finish(page);
  await expectReplaced(page, normal);
});

test("a sticker resized during a pending normal removal commits at its new size", async ({
  page,
}) => {
  const { normal, mask } = await stagePendingRemoval(page, { resize: true });
  mask.release();
  await finish(page);
  await expectReplaced(page, normal);
});

test("unchanged ready material removes its normal immediately", async ({ page }) => {
  await serveNormal(page);
  await page.goto("/e2e/stickerLaminate.html?board=1");
  await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).setup(false));
  await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).unchangedRemoval());
  expect(await inspect(page)).toMatchObject({
    retainedPixels: false,
    retainedDescription: true,
    error: null,
  });
  expect(
    await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).compareFlat(true)),
  ).toMatchObject({ samePixels: true });
});
