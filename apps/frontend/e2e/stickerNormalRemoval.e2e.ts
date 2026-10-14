import { expect, test } from "@playwright/test";

for (const kind of ["foil", "paper"] as const) {
  for (const late of [false, true]) {
    for (const outcome of [
      "success",
      "failure",
      "superseded",
      "canceled",
      "resize-success",
      "resize-failure",
    ] as const) {
      if (outcome.startsWith("resize") && (kind !== "foil" || late)) continue;
      test(`${kind} normal removal ${late ? "during pending replacement" : "with replacement"} retains its complete generation through ${outcome}`, async ({
        page,
      }) => {
        let release = () => {},
          requested = 0,
          normalRequests = 0;
        const held = new Promise<void>((resolve) => {
          release = resolve;
        });
        await page.route("**/normal-removal-normal.svg", async (route) => {
          normalRequests++;
          await route.fulfill({
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="n"><stop stop-color="rgb(110,145,249)"/><stop offset="1" stop-color="rgb(170,145,249)"/></linearGradient></defs><rect width="80" height="80" fill="url(#n)"/></svg>',
          });
        });
        await page.route("**/normal-removal-target*.svg", async (route) => {
          requested++;
          await held;
          await route.fulfill(
            outcome.endsWith("failure")
              ? { status: 503, body: "deliberate required material failure" }
              : {
                  contentType: "image/svg+xml",
                  body: `<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><rect x="8" y="8" width="64" height="64" fill="${route.request().url().includes("print") ? "#457eb5" : "white"}"/></svg>`,
                },
          );
        });
        await page.goto("/e2e/stickerLaminate.html?board=1");
        await page.evaluate(
          async (kind) => (await import("./normalRemovalFixture.ts")).setup(kind),
          kind,
        );
        await page.evaluate(
          async (late) => (await import("./normalRemovalFixture.ts")).begin(late),
          late,
        );
        await expect.poll(() => requested).toBeGreaterThan(0);
        if (late)
          await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).remove());
        if (outcome.startsWith("resize")) {
          const previousRequests = requested;
          await page.evaluate(async () =>
            (await import("./normalRemovalFixture.ts")).resizePending(),
          );
          await expect.poll(() => requested).toBeGreaterThan(previousRequests);
        }
        const inspect = () =>
          page.evaluate(async () => (await import("./normalRemovalFixture.ts")).inspect());
        expect(await inspect()).toMatchObject({
          retainedPixels: true,
          retainedDescription: true,
          error: null,
        });
        expect(
          await page.evaluate(async () =>
            (await import("./normalRemovalFixture.ts")).compareCopy(),
          ),
        ).toEqual({ samePixels: true, retainedPixels: true, retainedDescription: true });
        expect(normalRequests).toBe(1);
        if (outcome === "superseded")
          await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).restore());
        if (outcome === "canceled")
          await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).cancel());
        release();
        if (outcome === "canceled") {
          await page.evaluate(async () => {
            await new Promise(requestAnimationFrame);
            await new Promise(requestAnimationFrame);
          });
          expect((await inspect()).pixels).toBe(0);
          await expect(page.locator("#normal-removal")).not.toHaveAttribute("data-error");
          return;
        }
        await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).finish());
        if (outcome.endsWith("success")) {
          expect((await inspect()).retainedPixels).toBe(false);
          expect(
            await page.evaluate(async () =>
              (await import("./normalRemovalFixture.ts")).compareFlat(),
            ),
          ).toMatchObject({
            samePixels: true,
            ...(kind === "foil"
              ? {
                  style: "pink",
                  mask: "/normal-removal-target-mask.svg",
                  frame: { width: outcome === "resize-success" ? 96 : 80, height: 80 },
                }
              : {}),
          });
          await page.evaluate(async () =>
            (await import("./normalRemovalFixture.ts")).reacquireNormal(),
          );
          expect(normalRequests).toBe(2);
        } else {
          const result = await inspect();
          expect(result).toMatchObject({ retainedPixels: true, retainedDescription: true });
          if (outcome.endsWith("failure"))
            expect(result.error).toMatch(/Replacing sticker print and cut/);
          else expect(result.error).toBeNull();
          expect(
            await page.evaluate(async () =>
              (await import("./normalRemovalFixture.ts")).compareCopy(),
            ),
          ).toEqual({ samePixels: true, retainedPixels: true, retainedDescription: true });
          expect(normalRequests).toBe(1);
        }
      });
    }
  }
  test(`${kind} unchanged ready material removes its normal immediately`, async ({ page }) => {
    await page.route("**/normal-removal-normal.svg", async (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="80" height="80"><defs><linearGradient id="n"><stop stop-color="rgb(110,145,249)"/><stop offset="1" stop-color="rgb(170,145,249)"/></linearGradient></defs><rect width="80" height="80" fill="url(#n)"/></svg>',
      }),
    );
    await page.goto("/e2e/stickerLaminate.html?board=1");
    await page.evaluate(
      async (kind) => (await import("./normalRemovalFixture.ts")).setup(kind, false),
      kind,
    );
    await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).unchangedRemoval());
    expect(
      await page.evaluate(async () => (await import("./normalRemovalFixture.ts")).inspect()),
    ).toMatchObject({ retainedPixels: false, retainedDescription: true, error: null });
    expect(
      await page.evaluate(async () =>
        (await import("./normalRemovalFixture.ts")).compareFlat(true),
      ),
    ).toMatchObject({ samePixels: true });
  });
}
