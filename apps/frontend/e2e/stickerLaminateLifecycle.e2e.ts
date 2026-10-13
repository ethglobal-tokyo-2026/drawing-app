import { expect, test } from "@playwright/test";

test("failed or superseded crease normals preserve the last ready material", async ({
  page,
}, info) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-laminate");
  const image = page.locator("[data-reload] img");
  await expect(coat).toHaveAttribute("data-state", "ready");
  const snapshot = () =>
    coat.evaluate(async (element) => {
      if (!(element instanceof HTMLCanvasElement))
        throw new Error("The material snapshot is missing");
      const context = element.getContext("2d");
      if (!context) throw new Error("The material snapshot context is unavailable");
      const digest = await crypto.subtle.digest(
        "SHA-256",
        context.getImageData(0, 0, element.width, element.height).data,
      );
      return [...new Uint8Array(digest)].join(",");
    });
  const initial = await snapshot();
  const initialPixels = await coat.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement))
      throw new Error("The material snapshot is missing");
    const context = element.getContext("2d");
    if (!context) throw new Error("The material snapshot context is unavailable");
    return [...context.getImageData(0, 0, element.width, element.height).data];
  });
  const initialPose = await page.evaluate(() => window.laminateFixture.getPose());
  await page.route("**/failed-normal.svg", (route) =>
    route.fulfill({ status: 503, body: "Normal unavailable" }),
  );
  await page.evaluate(() => window.laminateFixture.update({ normal: "/failed-normal.svg" }));
  await expect(coat).toHaveAttribute("data-error", /Replacing crease normal.*503/);
  await expect(coat).toHaveAttribute("data-state", "ready");
  await expect(image).toHaveCSS("visibility", "hidden");
  expect(await snapshot()).toBe(initial);
  let releaseOld: () => void = () => {
    throw new Error("The pending normal has not started");
  };
  let requested: () => void = () => {};
  const oldStarted = new Promise<void>((resolve) => {
    requested = resolve;
  });
  await page.route("**/superseded-normal.svg", async (route) => {
    await new Promise<void>((resolve) => {
      releaseOld = resolve;
      requested();
    });
    await route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="rgb(80,128,245)"/></svg>',
    });
  });
  await page.route("**/latest-normal.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="240"><rect width="240" height="240" fill="rgb(175,128,245)"/></svg>',
    }),
  );
  await page.evaluate(() => window.laminateFixture.update({ normal: "/superseded-normal.svg" }));
  await oldStarted;
  try {
    await page.evaluate(() => window.laminateFixture.update({ normal: "/latest-normal.svg" }));
    await expect(coat).not.toHaveAttribute("data-error");
    await expect.poll(snapshot).not.toBe(initial);
    const latest = await snapshot();
    releaseOld();
    await page.waitForTimeout(100);
    expect(await snapshot(), "A superseded normal must not overwrite the latest material").toBe(
      latest,
    );
    await page.evaluate(() => window.laminateFixture.update({ normal: undefined }));
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    const restoredPixels = await coat.evaluate((element) => {
      if (!(element instanceof HTMLCanvasElement))
        throw new Error("The material snapshot is missing");
      const context = element.getContext("2d");
      if (!context) throw new Error("The material snapshot context is unavailable");
      return [...context.getImageData(0, 0, element.width, element.height).data];
    });
    const differences = restoredPixels.map((value, index) =>
      Math.abs(value - initialPixels[index]),
    );
    await info.attach("flat-normal-restoration", {
      contentType: "application/json",
      body: JSON.stringify({
        initialPose,
        restoredPose: await page.evaluate(() => window.laminateFixture.getPose()),
        maximum: differences.reduce((maximum, value) => Math.max(maximum, value), 0),
        changed: differences.filter((value) => value > 0).length,
        mean: differences.reduce((sum, value) => sum + value, 0) / differences.length,
      }),
    });
    // Moving this snapshot from a later atlas tile to its origin can round a channel by 1/255.
    expect(differences.reduce((maximum, value) => Math.max(maximum, value), 0)).toBeLessThanOrEqual(
      1,
    );
    expect(differences.reduce((sum, value) => sum + value, 0) / differences.length).toBeLessThan(
      0.001,
    );
  } finally {
    releaseOld();
  }
});

test("an initial crease normal is ready before the first laminate snapshot appears", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.fetch;
    window.fetch = async (...args) => {
      const response = await original(...args);
      if (typeof args[0] === "string" && args[0].startsWith("data:image/png")) {
        Reflect.set(window, "laminateInitialNormalRequested", true);
        await new Promise<void>((resolve) => {
          Reflect.set(window, "laminateReleaseInitialNormal", resolve);
        });
      }
      return response;
    };
  });
  await page.goto("/e2e/stickerLaminate.html?ramp=1");
  const coat = page.locator("[data-ramp] canvas.sticker-laminate");
  await expect
    .poll(() =>
      page.evaluate(() => {
        const requested: unknown = Reflect.get(window, "laminateInitialNormalRequested");
        return requested === true;
      }),
    )
    .toBe(true);
  await expect(page.locator("[data-white] canvas.sticker-laminate")).toHaveAttribute(
    "data-state",
    "ready",
  );
  try {
    await expect(coat).toHaveAttribute("data-state", "loading");
  } finally {
    await page.evaluate(() => {
      const release: unknown = Reflect.get(window, "laminateReleaseInitialNormal");
      if (typeof release !== "function") throw new Error("The initial normal request was not held");
      Reflect.apply(release, undefined, []);
    });
  }
  await expect(coat).toHaveAttribute("data-state", "ready");
});

test("a failed print upgrade retains the complete last ready sticker", async ({ page }) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-laminate");
  await expect(coat).toHaveAttribute("data-state", "ready");
  const snapshot = () =>
    coat.evaluate(async (element) => {
      if (!(element instanceof HTMLCanvasElement))
        throw new Error("The material snapshot is missing");
      const context = element.getContext("2d");
      if (!context) throw new Error("The material snapshot context is unavailable");
      const digest = await crypto.subtle.digest(
        "SHA-256",
        context.getImageData(0, 0, element.width, element.height).data,
      );
      return [...new Uint8Array(digest)].join(",");
    });
  const initial = await snapshot();
  await page.route("**/failed-sharp-print.svg", (route) =>
    route.fulfill({ status: 503, body: "Print unavailable" }),
  );
  await page.evaluate(() => window.laminateFixture.update({ print: "/failed-sharp-print.svg" }));
  await expect(coat).toHaveAttribute("data-error", /Replacing sticker print and cut.*503/);
  await expect(coat).toHaveAttribute("data-state", "ready");
  await expect(page.locator("[data-reload] img")).toHaveCSS("visibility", "hidden");
  expect(await snapshot()).toBe(initial);
});

test("a crease normal replacement retains the ready laminate and its print and cut resources", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-laminate");
  const image = page.locator("[data-reload] img");
  await expect(coat).toHaveAttribute("data-state", "ready");
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  const resources = await page.evaluate(async () => {
    const gpu = new WeakSet<HTMLCanvasElement>();
    const observations = { fetches: 0, contexts: 0 };
    Reflect.set(window, "laminateReplacementResources", observations);
    const fetchSource = window.fetch;
    window.fetch = (...args) => {
      observations.fetches++;
      return fetchSource(...args);
    };
    const getContext: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof getContext !== "function") throw new Error("The canvas context method is missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        const context: unknown = Reflect.apply(getContext, this, [kind, ...args]);
        if (kind === "webgl" && !gpu.has(this)) {
          gpu.add(this);
          observations.contexts++;
        }
        return context;
      },
    });
    return observations;
  });
  expect(resources).toEqual({ fetches: 0, contexts: 0 });
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
      await expect(coat).toHaveAttribute("data-state", "ready");
      await expect(image).toHaveCSS("visibility", "hidden");
      if (kind === "normal") {
        expect(
          await page.evaluate(() => {
            const resources: unknown = Reflect.get(window, "laminateReplacementResources");
            return resources;
          }),
        ).toEqual({
          fetches: 1,
          contexts: 0,
        });
      }
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
