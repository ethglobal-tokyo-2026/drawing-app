import { expect, test, type Locator, type Page } from "@playwright/test";

/** Hold only short tasks after a real image upload; decoding and native GL calls remain real. */
async function prepareUploads(page: Page) {
  await page.route("**/e2e/stickerLaminate.html", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: '<meta name="viewport" content="width=device-width,initial-scale=1"><div id="root"></div>',
    }),
  );
  await page.route("**/validation-*.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><rect width="120" height="120" fill="${route.request().url().includes("normal") ? "rgb(128,128,255)" : route.request().url().includes("cut") ? "white" : "gray"}"/></svg>`,
    }),
  );
  await page.addInitScript(() => {
    const timers = new Map<number, () => void>();
    const decoded = new WeakSet<WebGLRenderingContext>();
    const nativeTimeout: unknown = Reflect.get(window, "setTimeout");
    const nativeClear: unknown = Reflect.get(window, "clearTimeout");
    const upload: unknown = Reflect.get(WebGLRenderingContext.prototype, "texImage2D");
    const error: unknown = Reflect.get(WebGLRenderingContext.prototype, "getError");
    const remove: unknown = Reflect.get(WebGLRenderingContext.prototype, "deleteTexture");
    const draw: unknown = Reflect.get(WebGLRenderingContext.prototype, "drawArrays");
    if (
      typeof nativeTimeout !== "function" ||
      typeof nativeClear !== "function" ||
      typeof upload !== "function" ||
      typeof error !== "function" ||
      typeof remove !== "function" ||
      typeof draw !== "function"
    )
      throw new Error("The native upload observation methods are unavailable");
    const timeout = (handler: TimerHandler, milliseconds: number, args: unknown[]) => {
      const id: unknown = Reflect.apply(nativeTimeout, window, [handler, milliseconds, ...args]);
      if (typeof id !== "number") throw new Error("The native upload timer did not return an ID");
      return id;
    };
    let nextTimer = -1;
    let uploadTurn = false;
    const observation = {
      uploads: 0,
      checks: 0,
      inlineChecks: 0,
      deleted: 0,
      draws: 0,
      hold: true,
      fail: false,
      failForever: false,
      shortenDeadline: false,
      snapshot() {
        return {
          uploads: this.uploads,
          checks: this.checks,
          inlineChecks: this.inlineChecks,
          deleted: this.deleted,
          draws: this.draws,
          pendingTasks: timers.size,
        };
      },
      release() {
        for (const [id, run] of [...timers]) {
          timers.delete(id);
          run();
        }
      },
    };
    Reflect.set(window, "laminateUploadObservation", observation);
    WebGLRenderingContext.prototype.texImage2D = function (...args: unknown[]) {
      Reflect.apply(upload, this, args);
      const source = args.at(-1);
      if (source instanceof HTMLImageElement || source instanceof HTMLCanvasElement) {
        decoded.add(this);
        Reflect.set(observation, "context", this);
        observation.uploads++;
        uploadTurn = true;
        queueMicrotask(() => {
          uploadTurn = false;
        });
      }
    };
    WebGLRenderingContext.prototype.getError = function () {
      const actual: unknown = Reflect.apply(error, this, []);
      if (typeof actual !== "number")
        throw new Error("The native upload error check did not return an error code");
      if (!decoded.has(this)) return actual;
      observation.checks++;
      if (uploadTurn) observation.inlineChecks++;
      if (observation.fail || observation.failForever) {
        observation.fail = false;
        return this.OUT_OF_MEMORY;
      }
      return actual;
    };
    WebGLRenderingContext.prototype.deleteTexture = function (texture) {
      observation.deleted++;
      Reflect.apply(remove, this, [texture]);
    };
    WebGLRenderingContext.prototype.drawArrays = function (...args) {
      observation.draws++;
      Reflect.apply(draw, this, args);
    };
    Object.defineProperty(window, "setTimeout", {
      configurable: true,
      value: (handler: TimerHandler, milliseconds = 0, ...args: unknown[]) => {
        if (observation.shortenDeadline && uploadTurn && milliseconds === 20_000)
          return timeout(handler, 40, args);
        if (
          observation.hold &&
          observation.uploads &&
          milliseconds < 100 &&
          typeof handler === "function"
        ) {
          const id = nextTimer--;
          timers.set(id, () => {
            Reflect.apply(handler, window, args);
          });
          return id;
        }
        return timeout(handler, milliseconds, args);
      },
    });
    Object.defineProperty(window, "clearTimeout", {
      configurable: true,
      value: (id: unknown) => {
        if (typeof id === "number" && timers.delete(id)) return;
        Reflect.apply(nativeClear, window, [id]);
      },
    });
  });
  await page.goto("/e2e/stickerLaminate.html");
}

async function mountUpload(page: Page) {
  await page.evaluate(async () => {
    const { mountSticker, whenStickerSettled } = await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.createElement("canvas");
    canvas.dataset.validation = "";
    canvas.style.cssText = "width:120px;height:120px";
    document.body.append(canvas);
    Reflect.set(
      window,
      "releaseLaminateUpload",
      mountSticker(canvas, {
        print: "/validation-print.svg",
        cut: "/validation-cut.svg",
        normal: "/validation-normal.svg",
        turn: 0,
        finish: "gloss",
      }),
    );
    Reflect.set(window, "laminateUploadSettled", false);
    void whenStickerSettled(canvas).then(
      () => Reflect.set(window, "laminateUploadSettled", true),
      (error: unknown) => Reflect.set(window, "laminateUploadSettled", { error: String(error) }),
    );
  });
}

async function observation(page: Page) {
  return page.evaluate(() => {
    const value: unknown = Reflect.get(window, "laminateUploadObservation");
    if (
      !value ||
      typeof value !== "object" ||
      !("snapshot" in value) ||
      typeof value.snapshot !== "function"
    )
      throw new Error("The upload observations are unavailable");
    const snapshot: unknown = Reflect.apply(value.snapshot, value, []);
    if (
      !snapshot ||
      typeof snapshot !== "object" ||
      !("uploads" in snapshot) ||
      typeof snapshot.uploads !== "number" ||
      !("checks" in snapshot) ||
      typeof snapshot.checks !== "number" ||
      !("inlineChecks" in snapshot) ||
      typeof snapshot.inlineChecks !== "number" ||
      !("deleted" in snapshot) ||
      typeof snapshot.deleted !== "number" ||
      !("draws" in snapshot) ||
      typeof snapshot.draws !== "number" ||
      !("pendingTasks" in snapshot) ||
      typeof snapshot.pendingTasks !== "number"
    )
      throw new Error("The upload observation snapshot is invalid");
    return {
      uploads: snapshot.uploads,
      checks: snapshot.checks,
      inlineChecks: snapshot.inlineChecks,
      deleted: snapshot.deleted,
      draws: snapshot.draws,
      pendingTasks: snapshot.pendingTasks,
    };
  });
}

async function bitmap(canvas: Locator) {
  return canvas.evaluate((element) => {
    if (!(element instanceof HTMLCanvasElement))
      throw new Error("The laminate snapshot is missing");
    return element.toDataURL();
  });
}

async function settlement(
  page: Page,
  key:
    | "laminateUploadSettled"
    | "laminateRetainedSettled"
    | "laminateCachedSettled" = "laminateUploadSettled",
) {
  return page.evaluate((key) => {
    const value: unknown = Reflect.get(window, key);
    if (typeof value === "boolean") return value;
    if (value && typeof value === "object" && "error" in value && typeof value.error === "string")
      return { error: value.error };
    throw new Error(`The laminate settlement observation ${key} is invalid`);
  }, key);
}

async function control(
  page: Page,
  action: "release" | "fail" | "failForever" | "shortenDeadline" | "nativeTimers",
) {
  await page.evaluate((action) => {
    const value: unknown = Reflect.get(window, "laminateUploadObservation");
    if (!value || typeof value !== "object") throw new Error("The upload controls are unavailable");
    if (action === "release") {
      const run: unknown = Reflect.get(value, "release");
      if (typeof run !== "function") throw new Error("The upload tasks cannot be released");
      Reflect.apply(run, value, []);
    } else
      Reflect.set(value, action === "nativeTimers" ? "hold" : action, action !== "nativeTimers");
  }, action);
}

test("decoded laminate images share deferred validation before material becomes ready", async ({
  page,
}) => {
  await prepareUploads(page);
  await mountUpload(page);
  await expect.poll(async () => (await observation(page)).uploads).toBe(3);
  const coat = page.locator("[data-validation]");
  await expect(coat).toHaveAttribute("data-state", "loading");
  expect(await observation(page)).toMatchObject({ checks: 0, inlineChecks: 0, pendingTasks: 1 });
  expect(await settlement(page)).toBe(false);
  await control(page, "release");
  await expect(coat).toHaveAttribute("data-state", "ready");
  expect(await observation(page)).toMatchObject({ checks: 1, inlineChecks: 0, pendingTasks: 0 });
  const pixels = await bitmap(coat);
  await page.evaluate(async () => {
    const { updateSticker, whenStickerSettled } =
      await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.querySelector<HTMLCanvasElement>("[data-validation]");
    if (!canvas) throw new Error("The retained snapshot is missing");
    updateSticker(canvas, {
      print: "/validation-print-copy.svg",
      cut: "/validation-cut-copy.svg",
      normal: "/validation-normal-copy.svg",
      finish: "gloss",
    });
    Reflect.set(window, "laminateUploadSettled", false);
    void whenStickerSettled(canvas).then(
      () => Reflect.set(window, "laminateUploadSettled", true),
      (error: unknown) => Reflect.set(window, "laminateUploadSettled", { error: String(error) }),
    );
  });
  await expect.poll(async () => (await observation(page)).uploads).toBe(6);
  expect(await bitmap(coat)).toBe(pixels);
  expect(await observation(page)).toMatchObject({ checks: 1, pendingTasks: 1 });
  expect(await settlement(page)).toBe(false);
  await control(page, "release");
  await expect.poll(async () => (await observation(page)).checks).toBe(2);
  await expect(coat).toHaveAttribute("data-state", "ready");
  await expect.poll(() => settlement(page)).toBe(true);
  expect(await bitmap(coat)).toBe(pixels);
});

test("a deferred upload OOM reports every affected URL and settles initial failure", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") failures.push(message.text());
  });
  await prepareUploads(page);
  await mountUpload(page);
  await expect.poll(async () => (await observation(page)).uploads).toBe(3);
  await control(page, "fail");
  await control(page, "release");
  const coat = page.locator("[data-validation]");
  await expect(coat).toHaveAttribute("data-state", "failed");
  await expect(coat).toHaveAttribute("data-error", /1285/);
  await expect.poll(() => settlement(page)).toBe(true);
  expect(failures.join("\n")).toContain("/validation-print.svg");
  expect(failures.join("\n")).toContain("/validation-cut.svg");
  expect(failures.join("\n")).toContain("/validation-normal.svg");
  expect(await observation(page)).toMatchObject({ checks: 2, pendingTasks: 0 });
  expect((await observation(page)).deleted).toBeGreaterThanOrEqual(3);
});

test("releasing a surface cancels unvalidated uploads without a later GPU query", async ({
  page,
}) => {
  await prepareUploads(page);
  await mountUpload(page);
  await expect.poll(async () => (await observation(page)).uploads).toBe(3);
  await page.evaluate(() => {
    const release: unknown = Reflect.get(window, "releaseLaminateUpload");
    if (typeof release !== "function") throw new Error("The pending surface cannot be released");
    Reflect.apply(release, window, []);
  });
  await expect.poll(async () => (await observation(page)).pendingTasks).toBe(0);
  await control(page, "release");
  expect(await observation(page)).toMatchObject({ checks: 0, pendingTasks: 0 });
  expect((await observation(page)).deleted).toBeGreaterThanOrEqual(3);
  await expect.poll(() => settlement(page)).toBe(true);
});

test("upload validation has a bounded deadline even while its scheduled task is held", async ({
  page,
}) => {
  await prepareUploads(page);
  await control(page, "shortenDeadline");
  await mountUpload(page);
  const coat = page.locator("[data-validation]");
  await expect(coat).toHaveAttribute("data-state", "failed");
  await expect(coat).toHaveAttribute("data-error", /Validating.*20 seconds/);
  await expect.poll(() => settlement(page)).toBe(true);
  await expect.poll(async () => (await observation(page)).pendingTasks).toBe(0);
  expect((await observation(page)).checks).toBe(0);
});

test("context loss cancels pending upload validation before a restored generation becomes ready", async ({
  page,
}) => {
  await prepareUploads(page);
  await mountUpload(page);
  await expect.poll(async () => (await observation(page)).uploads).toBe(3);
  await page.evaluate(() => {
    const value: unknown = Reflect.get(window, "laminateUploadObservation");
    const context: unknown =
      value && typeof value === "object" ? Reflect.get(value, "context") : null;
    if (!(context instanceof WebGLRenderingContext))
      throw new Error("The pending upload context is missing");
    const loss = context.getExtension("WEBGL_lose_context");
    if (!loss) throw new Error("The browser cannot exercise pending upload context loss");
    Reflect.set(window, "laminatePendingLoss", loss);
    loss.loseContext();
  });
  const coat = page.locator("[data-validation]");
  await expect(coat).toHaveAttribute("data-state", "failed");
  await expect.poll(async () => (await observation(page)).pendingTasks).toBe(0);
  await control(page, "release");
  expect((await observation(page)).checks).toBe(0);
  await expect.poll(() => settlement(page)).toBe(true);
  await control(page, "nativeTimers");
  await page.evaluate(() => {
    const loss: unknown = Reflect.get(window, "laminatePendingLoss");
    if (
      !loss ||
      typeof loss !== "object" ||
      !("restoreContext" in loss) ||
      typeof loss.restoreContext !== "function"
    )
      throw new Error("The pending upload context cannot be restored");
    Reflect.apply(loss.restoreContext, loss, []);
  });
  await expect(coat).toHaveAttribute("data-state", "ready");
  expect((await observation(page)).uploads).toBe(6);
});

test("an undrained upload error state settles ready and cached owners while preserving their last bitmaps", async ({
  page,
}) => {
  await prepareUploads(page);
  await mountUpload(page);
  await expect.poll(async () => (await observation(page)).uploads).toBe(3);
  await control(page, "release");
  const coat = page.locator("[data-validation]");
  await expect(coat).toHaveAttribute("data-state", "ready");
  const previousBitmap = await bitmap(coat);
  await page.evaluate(async () => {
    const { mountSticker, whenStickerSettled } = await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.createElement("canvas");
    canvas.dataset.validationRetained = "";
    canvas.style.cssText = "width:120px;height:120px";
    document.body.append(canvas);
    mountSticker(canvas, {
      print: "/validation-print.svg",
      cut: "/validation-cut.svg",
      normal: "/validation-normal.svg",
      turn: 0,
      finish: "gloss",
    });
    await whenStickerSettled(canvas);
  });
  const retained = page.locator("[data-validation-retained]");
  const retainedBitmap = await bitmap(retained);
  await page.evaluate(async () => {
    const { updateSticker } = await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.querySelector<HTMLCanvasElement>("[data-validation]");
    if (!canvas) throw new Error("The ready material is missing");
    updateSticker(canvas, {
      print: "/validation-print-copy.svg",
      cut: "/validation-cut-copy.svg",
      normal: "/validation-normal-copy.svg",
      finish: "gloss",
    });
  });
  await expect.poll(async () => (await observation(page)).uploads).toBe(6);
  const draws = (await observation(page)).draws;
  await control(page, "failForever");
  await page.evaluate(async () => {
    const { updateSticker, whenStickerSettled } =
      await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.querySelector<HTMLCanvasElement>("[data-validation-retained]");
    if (!canvas) throw new Error("The retained owner is missing");
    updateSticker(canvas, {
      print: "/validation-print.svg",
      cut: "/validation-cut.svg",
      normal: "/validation-normal.svg",
      finish: "matte",
    });
    Reflect.set(window, "laminateRetainedSettled", false);
    void whenStickerSettled(canvas).then(() =>
      Reflect.set(window, "laminateRetainedSettled", true),
    );
    const controls: unknown = Reflect.get(window, "laminateUploadObservation");
    const release: unknown =
      controls && typeof controls === "object" ? Reflect.get(controls, "release") : null;
    if (typeof release !== "function") throw new Error("The failed upload task cannot be released");
    // Fail in this same task before the ready owner's pending finish snapshot can run.
    Reflect.apply(release, controls, []);
  });
  await expect(coat).toHaveAttribute("data-state", "failed");
  await expect(coat).toHaveAttribute("data-error", /did not clear after 8 checks/);
  await expect(retained).toHaveAttribute("data-state", "failed");
  await expect(retained).toHaveAttribute("data-error", /did not clear after 8 checks/);
  await expect.poll(() => settlement(page, "laminateRetainedSettled")).toBe(true);
  expect(await observation(page)).toMatchObject({ checks: 9, pendingTasks: 0 });
  expect(await bitmap(coat)).toBe(previousBitmap);
  expect(await bitmap(retained)).toBe(retainedBitmap);
  await page.evaluate(async () => {
    const { mountSticker, whenStickerSettled } = await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.createElement("canvas");
    canvas.dataset.validationCached = "";
    canvas.style.cssText = "width:120px;height:120px";
    document.body.append(canvas);
    mountSticker(canvas, {
      print: "/validation-print.svg",
      cut: "/validation-cut.svg",
      normal: "/validation-normal.svg",
      turn: 0,
      finish: "gloss",
    });
    Reflect.set(window, "laminateCachedSettled", false);
    void whenStickerSettled(canvas).then(() => Reflect.set(window, "laminateCachedSettled", true));
  });
  await expect(page.locator("[data-validation-cached]")).toHaveAttribute("data-state", "failed");
  await expect.poll(() => settlement(page, "laminateCachedSettled")).toBe(true);
  await control(page, "nativeTimers");
  await page.evaluate(async () => {
    const { turnSticker } = await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.querySelector<HTMLCanvasElement>("[data-validation]");
    if (!canvas) throw new Error("The retained failed material is missing");
    turnSticker(canvas, 17);
    await new Promise<void>((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
    );
  });
  expect(await observation(page)).toMatchObject({ checks: 9, draws });
  await expect(coat).toHaveAttribute("data-error", /did not clear after 8 checks/);
});
