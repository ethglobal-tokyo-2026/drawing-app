import { expect, test } from "@playwright/test";

test("replacement laminate textures keep the original artwork visible until ready", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-laminate");
  const image = page.locator("[data-reload] img");
  await expect(coat).toHaveAttribute("data-state", "ready");
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  for (const kind of ["normal", "print"] as const) {
    let finish: () => void = () => {
      throw new Error("The replacement request has not started");
    };
    let requested: () => void = () => {};
    const request = new Promise<void>((resolve) => {
      requested = resolve;
    });
    let firstRequest = true;
    await page.route(`**/replacement-${kind}.svg`, async (route) => {
      if (firstRequest) {
        firstRequest = false;
        await new Promise<void>((resolve) => {
          finish = resolve;
          requested();
        });
      }
      await route.fulfill({
        contentType: "image/svg+xml",
        body: `<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="${kind === "normal" ? "rgb(128,128,255)" : "white"}"/></svg>`,
      });
    });
    await page.evaluate(
      (kind) => window.laminateFixture.update({ [kind]: `/replacement-${kind}.svg` }),
      kind,
    );
    await request;
    try {
      await expect(coat).toHaveAttribute("data-state", "loading");
      await expect(image).toHaveCSS("visibility", "visible");
      expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(pose);
    } finally {
      finish();
    }
    await expect(coat).toHaveAttribute("data-state", "ready");
    await expect(image).toHaveCSS("visibility", "hidden");
    expect(await coat.evaluate((canvas) => canvas.clientWidth)).toBe(240);
  }
});

test("a sticker entering the viewport samples its held laminate without new light input", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?side=240&count=48");
  const coat = page.locator('[data-sticker="47"] canvas.sticker-laminate');
  expect(await coat.evaluate((canvas) => canvas.getBoundingClientRect().top > innerHeight)).toBe(
    true,
  );
  await expect(coat).toHaveAttribute("data-state", "loading");
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  await coat.scrollIntoViewIfNeeded();
  await expect(coat).toHaveAttribute("data-state", "ready");
  expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(pose);
  expect(
    await coat.evaluate((canvas) => {
      if (!(canvas instanceof HTMLCanvasElement))
        throw new Error("The material snapshot is not a canvas");
      const context = canvas.getContext("2d");
      if (!context) throw new Error("The material snapshot context is missing");
      return context.getImageData(canvas.width / 2, canvas.height / 2, 1, 1).data[3];
    }),
  ).toBe(255);
});

test("laminate initialization failure releases every allocated GPU context", async ({ page }) => {
  await page.route("**/e2e/stickerLaminate.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>',
    }),
  );
  await page.addInitScript(() => {
    const contexts: WebGLRenderingContext[] = [];
    Reflect.set(window, "laminateInitContexts", contexts);
    const read: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof read !== "function") throw new Error("The browser canvas context method is missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        const context: unknown = Reflect.apply(read, this, [kind, ...args]);
        if (kind === "webgl" && context instanceof WebGLRenderingContext) {
          contexts.push(context);
          const source: unknown = Reflect.get(context, "shaderSource");
          if (typeof source !== "function") throw new Error("The browser shader method is missing");
          Object.defineProperty(context, "shaderSource", {
            value: function (this: WebGLRenderingContext, shader: WebGLShader) {
              // Real compilation fails after allocation, exercising the constructor's resource cleanup.
              Reflect.apply(source, this, [shader, "This is invalid GLSL."]);
            },
          });
        }
        return context;
      },
    });
  });
  await page.goto("/e2e/stickerLaminate.html");
  const failures = await page.evaluate(async () => {
    const { mountLaminate } = await import("../src/stickers/laminateRenderer.ts");
    return Array.from({ length: 3 }, () => {
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "width:120px;height:120px";
      document.body.append(canvas);
      const release = mountLaminate(canvas, {
        print: "/initialization-proof.svg",
        cut: "/initialization-proof.svg",
        finish: "gloss",
        turn: 0,
      });
      const result = { state: canvas.dataset.state, error: canvas.dataset.error };
      release();
      canvas.remove();
      return result;
    });
  });
  for (const result of failures) {
    expect(result.state).toBe("failed");
    expect(result.error).toContain("Compiling the laminate shader failed");
  }
  await expect
    .poll(() =>
      page.evaluate(() => {
        const contexts: unknown = Reflect.get(window, "laminateInitContexts");
        if (!Array.isArray(contexts)) throw new Error("The allocated contexts were not captured");
        return contexts.map((context: unknown) => {
          if (!(context instanceof WebGLRenderingContext))
            throw new Error("An allocated context is missing");
          return context.isContextLost();
        });
      }),
    )
    .toEqual([true, true, true]);
});
