import { expect, test, type Page } from "@playwright/test";
import { emptyLaminatePage, holdRoute, solidSvg, waitTwoFrames } from "./stickerMaterialFixture.ts";

/** A background settlement observation: settled, or the rejection it reported. */
type Settlement = boolean | { error: unknown };

declare global {
  interface Window {
    laminateSceneContexts?: Set<HTMLCanvasElement>;
    laminateSceneAllocations?: number[];
    laminateTerminalSettled?: Settlement;
    laminateAdmissionObservations?: { urls: string[]; contexts: number; uploads: number };
    laminateAdmissionOpen?: boolean;
    laminateMaterialSettled?: Settlement;
    laminateFlatSettled?: Settlement;
    laminateBaselineSettled?: Settlement;
    laminateCurrentSettled?: Settlement;
    laminateInitialNormalRequested?: boolean;
    laminateReleaseInitialNormal?: () => void;
    laminateReplacementResources?: { fetches: number; contexts: number };
    laminateInitContexts?: WebGLRenderingContext[];
  }
}

/** Background settlement observations preserve rejection causes for the next assertion. */
const settlementFlag = (
  page: Page,
  name:
    | "laminateTerminalSettled"
    | "laminateMaterialSettled"
    | "laminateFlatSettled"
    | "laminateBaselineSettled"
    | "laminateCurrentSettled",
) =>
  page.evaluate((key) => {
    const value = window[key];
    if (typeof value !== "boolean")
      throw new Error(`The ${key} settlement observation did not report a boolean`, {
        cause: value,
      });
    return value;
  }, name);

const snapshotOf = (canvas: HTMLElement | SVGElement) => {
  if (!(canvas instanceof HTMLCanvasElement))
    throw new Error("The retained laminate canvas is missing");
  return canvas.toDataURL();
};

test("a small redraw replaces old opaque pixels outside its new transparent cut", async ({
  page,
}) => {
  await emptyLaminatePage(page);
  await page.route("**/atlas-region-*.svg", (route) => {
    const url = route.request().url();
    return route.fulfill(
      url.includes("circle")
        ? {
            contentType: "image/svg+xml",
            body: '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120"><circle cx="60" cy="60" r="44" fill="white"/></svg>',
          }
        : solidSvg(url.includes("gray") ? "gray" : "white", 120),
    );
  });
  await page.goto("/e2e/stickerLaminate.html");
  const result = await page.evaluate(async () => {
    const { mountSticker, updateSticker, whenStickerSettled } =
      await import("../src/stickers/stickerRenderer.ts");
    const { twoFrames } = await import("./stickerMaterialFixture.ts");
    let smallOnly = false;
    const releases: (() => void)[] = [];
    const canvases = Array.from({ length: 3 }, (_, index) => {
      const canvas = document.createElement("canvas");
      canvas.style.cssText = `position:absolute;left:20px;top:20px;width:${index < 2 ? 600 : 120}px;height:${index < 2 ? 500 : 120}px`;
      document.body.append(canvas);
      releases.push(
        mountSticker(canvas, {
          print: "/atlas-region-white.svg",
          cut: "/atlas-region-white.svg",
          turn: 0,
          finish: "gloss",
          active: () => index === 2 || !smallOnly,
        }),
      );
      return canvas;
    });
    try {
      await Promise.all(canvases.map((canvas) => whenStickerSettled(canvas)));
      await twoFrames();
      const target = canvases[2];
      if (!target) throw new Error("The small sticker is missing");
      smallOnly = true;
      updateSticker(target, {
        print: "/atlas-region-gray.svg",
        cut: "/atlas-region-circle.svg",
        finish: "gloss",
      });
      await whenStickerSettled(target);
      const context = target.getContext("2d");
      if (!context) throw new Error("The retained snapshot context is missing");
      return {
        corner: [...context.getImageData(2, 2, 1, 1).data],
        center: [...context.getImageData(target.width / 2, target.height / 2, 1, 1).data],
      };
    } finally {
      for (const release of releases) release();
    }
  });
  expect(
    result.corner[3],
    "A new transparent cut must erase the older opaque snapshot pixels",
  ).toBe(0);
  expect(result.center[3]).toBe(255);
  expect(result.center[0]).toBeGreaterThan(90);
  expect(result.center[0]).toBeLessThan(180);
});

for (const detailSide of [360, 700]) {
  test(`covering a large board sizes the shared source for its ${detailSide}px detail and retains board snapshots`, async ({
    page,
  }) => {
    await page.addInitScript(() => {
      if (typeof DeviceMotionEvent === "function")
        Object.defineProperty(DeviceMotionEvent, "requestPermission", { value: undefined });
    });
    await emptyLaminatePage(page);
    await page.route("**/scene-capacity-*.svg", (route) =>
      route.fulfill(
        solidSvg(route.request().url().includes("normal") ? "rgb(145,128,252)" : "white", 120),
      ),
    );
    await page.setViewportSize({ width: 1100, height: 1000 });
    await page.goto("/e2e/stickerLaminate.html");
    const result = await page.evaluate(async (side) => {
      const { mountSticker, refreshSticker, turnSticker, whenStickerSettled } =
        await import("../src/stickers/stickerRenderer.ts");
      const { acquireLight, installLight, currentLight } = await import("../src/stickers/light.ts");
      const gpu = new Set<HTMLCanvasElement>();
      const targets = new Set<HTMLCanvasElement>();
      const stages = new Set<HTMLCanvasElement>();
      const allocations: { property: string; value: number }[] = [];
      const getContext: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
      if (typeof getContext !== "function") throw new Error("The native canvas method is missing");
      Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
        configurable: true,
        value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
          const context: unknown = Reflect.apply(getContext, this, [kind, ...args]);
          if (kind === "webgl" && context) gpu.add(this);
          return context;
        },
      });
      const drawImage: unknown = Reflect.get(CanvasRenderingContext2D.prototype, "drawImage");
      if (typeof drawImage !== "function") throw new Error("The native canvas copy is missing");
      Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
        configurable: true,
        value: function (this: CanvasRenderingContext2D, source: unknown, ...args: unknown[]) {
          if (source instanceof HTMLCanvasElement && gpu.has(source) && !targets.has(this.canvas))
            stages.add(this.canvas);
          const copied: unknown = Reflect.apply(drawImage, this, [source, ...args]);
          return copied;
        },
      });
      for (const property of ["width", "height"] as const) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, property);
        if (!descriptor) throw new Error(`The canvas ${property} descriptor is missing`);
        const write: unknown = Reflect.get(descriptor, "set");
        if (typeof write !== "function")
          throw new Error(`The canvas ${property} setter is missing`);
        Object.defineProperty(HTMLCanvasElement.prototype, property, {
          ...descriptor,
          set: function (this: HTMLCanvasElement, value: number) {
            if (gpu.has(this) || stages.has(this)) allocations.push({ property, value });
            Reflect.apply(write, this, [value]);
          },
        });
      }
      const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const allocation = () => {
        if (gpu.size !== 1) throw new Error("The scene did not keep one shared GPU context");
        const canvas: unknown = [...gpu][0];
        if (!(canvas instanceof HTMLCanvasElement))
          throw new Error("The shared GPU canvas is missing");
        return { width: canvas.width, height: canvas.height };
      };
      const stageAllocation = () => {
        const canvas: unknown = [...stages][0];
        return stages.size === 1 && canvas instanceof HTMLCanvasElement
          ? { width: canvas.width, height: canvas.height }
          : null;
      };
      const snapshot = (canvas: HTMLCanvasElement) => canvas.toDataURL();
      let boardActive = true;
      let detailActive = false;
      const releases: (() => void)[] = [];
      const uninstall = installLight(document.documentElement);
      const releaseLight = acquireLight();
      const board = Array.from({ length: 4 }, () => {
        const canvas = document.createElement("canvas");
        targets.add(canvas);
        canvas.style.cssText = "position:absolute;left:20px;top:20px;width:600px;height:600px";
        document.body.append(canvas);
        releases.push(
          mountSticker(canvas, {
            print: "/scene-capacity-print.svg",
            cut: "/scene-capacity-cut.svg",
            normal: "/scene-capacity-normal.svg",
            turn: 0,
            finish: "gloss",
            active: () => boardActive,
          }),
        );
        return canvas;
      });
      const detail = document.createElement("canvas");
      targets.add(detail);
      detail.style.cssText = `position:absolute;left:20px;top:20px;width:${side}px;height:${side}px`;
      document.body.append(detail);
      releases.push(
        mountSticker(detail, {
          print: "/scene-capacity-print.svg",
          cut: "/scene-capacity-cut.svg",
          turn: 0,
          finish: "gloss",
          active: () => detailActive,
        }),
      );
      try {
        await Promise.all(board.map((canvas) => whenStickerSettled(canvas)));
        for (const canvas of board) refreshSticker(canvas);
        await frame();
        await frame();
        const initial = board.map(snapshot);
        const largeAllocation = allocation();
        const largeStageAllocation = stageAllocation();
        boardActive = false;
        detailActive = true;
        refreshSticker(detail);
        await whenStickerSettled(detail);
        await frame();
        const detailAllocation = allocation();
        const detailStageAllocation = stageAllocation();
        allocations.length = 0;
        for (const [alpha, beta, gamma] of [
          [0, 60, 0],
          [12, 65, 5],
        ]) {
          const event = new Event("deviceorientation");
          Object.defineProperties(event, {
            alpha: { value: alpha },
            beta: { value: beta },
            gamma: { value: gamma },
          });
          window.dispatchEvent(event);
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 1000));
        for (const turn of [11, 21, 31]) {
          turnSticker(detail, turn, 8, -12);
          await frame();
        }
        const detailResizeCount = allocations.length;
        const coveredRetained = board.every((canvas, index) => snapshot(canvas) === initial[index]);
        const heldPose = currentLight();
        detailActive = false;
        boardActive = true;
        for (const canvas of board) refreshSticker(canvas);
        await frame();
        await frame();
        const exposed = board.map(snapshot);
        return {
          largeAllocation,
          largeStageAllocation,
          detailAllocation,
          detailStageAllocation,
          detailOutput: { width: detail.width, height: detail.height },
          detailResizeCount,
          coveredRetained,
          restoredAllocation: allocation(),
          restoredStageAllocation: stageAllocation(),
          poseMoved:
            Math.abs(heldPose.x) + Math.abs(heldPose.y) + Math.abs(heldPose.rotationDegrees) > 0.01,
          poseHeld: JSON.stringify(currentLight()) === JSON.stringify(heldPose),
          reexposedChanged: exposed.some((pixels, index) => pixels !== initial[index]),
          ready: board.every((canvas) => canvas.dataset.state === "ready"),
        };
      } finally {
        releaseLight();
        uninstall();
        for (const release of releases) release();
      }
    }, detailSide);
    expect(result.coveredRetained).toBe(true);
    expect(result.poseMoved).toBe(true);
    expect(result.poseHeld).toBe(true);
    expect(result.reexposedChanged).toBe(true);
    expect(result.ready).toBe(true);
    expect(result.largeAllocation).toEqual({ width: 2048, height: 2048 });
    expect(
      result.largeStageAllocation,
      "Retained copies must not allocate a second atlas",
    ).toBeNull();
    expect(result.detailOutput).toEqual({
      width: detailSide === 360 ? 720 : 1024,
      height: detailSide === 360 ? 720 : 1024,
    });
    expect(
      result.detailAllocation,
      "A covered board must not determine the detail's source snapshot size",
    ).toEqual(result.detailOutput);
    expect(
      result.detailStageAllocation,
      "Detail copies must not allocate a second atlas",
    ).toBeNull();
    expect(
      result.detailResizeCount,
      "Stable detail motion and individual turns must not reallocate the shared source",
    ).toBe(0);
    expect(result.restoredAllocation).toEqual(result.largeAllocation);
    expect(result.restoredStageAllocation).toEqual(result.largeStageAllocation);
  });
}

test("pending exposed material owners reserve scene capacity before their textures arrive", async ({
  page,
}) => {
  await emptyLaminatePage(page);
  await page.route("**/scene-loading-fast.svg", (route) => route.fulfill(solidSvg("white", 120)));
  const held = new Map<string, Awaited<ReturnType<typeof holdRoute>>>();
  for (const name of ["slow-a", "slow-b"])
    held.set(
      name,
      await holdRoute(page, `**/scene-loading-${name}.svg`, () => solidSvg("white", 120)),
    );
  await page.setViewportSize({ width: 1100, height: 1000 });
  await page.goto("/e2e/stickerLaminate.html");
  await page.evaluate(async () => {
    const { mountSticker } = await import("../src/stickers/stickerRenderer.ts");
    const contexts = new Set<HTMLCanvasElement>();
    const allocations: number[] = [];
    window.laminateSceneContexts = contexts;
    window.laminateSceneAllocations = allocations;
    const getContext: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof getContext !== "function") throw new Error("The native canvas method is missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        const context: unknown = Reflect.apply(getContext, this, [kind, ...args]);
        if (kind === "webgl" && context) contexts.add(this);
        return context;
      },
    });
    for (const property of ["width", "height"] as const) {
      const descriptor = Object.getOwnPropertyDescriptor(HTMLCanvasElement.prototype, property);
      if (!descriptor) throw new Error(`The canvas ${property} descriptor is missing`);
      const write: unknown = Reflect.get(descriptor, "set");
      if (typeof write !== "function") throw new Error(`The canvas ${property} setter is missing`);
      Object.defineProperty(HTMLCanvasElement.prototype, property, {
        ...descriptor,
        set: function (this: HTMLCanvasElement, value: number) {
          if (contexts.has(this)) allocations.push(value);
          Reflect.apply(write, this, [value]);
        },
      });
    }
    for (const [index, name] of ["fast", "fast", "slow-a", "slow-b"].entries()) {
      const canvas = document.createElement("canvas");
      canvas.dataset.loadingOwner = String(index);
      canvas.style.cssText = `position:absolute;left:20px;top:20px;width:${index < 2 ? 600 : 360}px;height:${index < 2 ? 600 : 360}px`;
      document.body.append(canvas);
      mountSticker(canvas, {
        print: `/scene-loading-${name}.svg`,
        cut: `/scene-loading-${name}.svg`,
        turn: 0,
        finish: "gloss",
      });
    }
  });
  const allocation = () =>
    page.evaluate(() => {
      const contexts = window.laminateSceneContexts;
      if (contexts?.size !== 1) throw new Error("The scene did not keep one shared GPU context");
      const [canvas] = contexts;
      return { width: canvas.width, height: canvas.height };
    });
  try {
    await expect(page.locator('[data-loading-owner="0"]')).toHaveAttribute("data-state", "ready");
    expect(
      await allocation(),
      "Pending exposed owners must reserve their eventual geometry",
    ).toEqual({ width: 2048, height: 1744 });
    await page.evaluate(() => {
      const allocations = window.laminateSceneAllocations;
      if (!allocations) throw new Error("The source allocation observations are missing");
      allocations.length = 0;
    });
    for (const [index, name] of ["slow-a", "slow-b"].entries()) {
      const hold = held.get(name);
      if (!hold) throw new Error(`The ${name} texture is not held`);
      await expect.poll(() => hold.requests).toBeGreaterThan(0);
      hold.release();
      await expect(page.locator(`[data-loading-owner="${index + 2}"]`)).toHaveAttribute(
        "data-state",
        "ready",
      );
      expect(await allocation()).toEqual({ width: 2048, height: 1744 });
    }
    const count = await page.evaluate(() => {
      const allocations = window.laminateSceneAllocations;
      if (!allocations) throw new Error("The source allocation observations are missing");
      return allocations.length;
    });
    expect(count, "Texture arrivals must not repeatedly resize the complete scene allocation").toBe(
      0,
    );
  } finally {
    for (const hold of held.values()) hold.release();
  }
});

test("shared GL batches crop directly into retained snapshots with identical reference pixels", async ({
  page,
}) => {
  await emptyLaminatePage(page);
  await page.route("**/direct-copy-*.svg", (route) => {
    const url = route.request().url();
    const body = url.includes("line")
      ? '<rect width="300" height="240" fill="white"/><path d="M24 200L130 30L280 190M30 130Q150 240 260 50" fill="none" stroke="black" stroke-width="5"/>'
      : url.includes("gray")
        ? '<rect width="300" height="240" fill="#888"/>'
        : url.includes("ink")
          ? '<rect width="300" height="240" fill="#ed173f"/><rect x="150" width="150" height="240" fill="#164ddb"/>'
          : url.includes("cut")
            ? '<ellipse cx="150" cy="120" rx="133" ry="101" fill="white"/><rect x="7" y="17" width="65" height="90" fill="white" opacity=".37"/>'
            : url.includes("normal")
              ? '<rect width="300" height="240" fill="rgb(128,128,255)"/><path d="M70 0L190 240" stroke="rgb(94,174,238)" stroke-width="72"/>'
              : '<rect width="300" height="240" fill="white"/>';
    return route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="240">${body}</svg>`,
    });
  });
  await page.setViewportSize({ width: 1300, height: 1300 });
  await page.goto("/e2e/stickerLaminate.html");
  const result = await page.evaluate(async () => {
    const { mountSticker, turnSticker, refreshSticker, whenStickerSettled } =
      await import("../src/stickers/stickerRenderer.ts");
    const { twoFrames } = await import("./stickerMaterialFixture.ts");
    const targets = new Set<HTMLCanvasElement>();
    const gpu = new Set<HTMLCanvasElement>();
    const staging = new WeakSet<HTMLCanvasElement>();
    const referenceAtlas = document.createElement("canvas");
    const referenceTarget = document.createElement("canvas");
    const referenceAtlasContext = referenceAtlas.getContext("2d");
    const referenceTargetContext = referenceTarget.getContext("2d");
    if (!referenceAtlasContext || !referenceTargetContext)
      throw new Error("The staged reference contexts are unavailable");
    const observations = {
      draws: 0,
      gpuCopies: 0,
      targetCopies: 0,
      copiedRows: new Set<number>(),
      copiedCases: [] as number[],
      copiedSizes: [] as { case: number; width: number; height: number }[],
      names: new Set<string>(),
      fractionalAlpha: 0,
      differingChannels: 0,
      maxDifference: 0,
    };
    let measuring = false;
    let generation = 0;
    let capturedGeneration = -1;
    let latestGpu: HTMLCanvasElement | null = null;
    const getContext: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    const drawArrays: unknown = Reflect.get(WebGLRenderingContext.prototype, "drawArrays");
    const drawImage: unknown = Reflect.get(CanvasRenderingContext2D.prototype, "drawImage");
    if (
      typeof getContext !== "function" ||
      typeof drawArrays !== "function" ||
      typeof drawImage !== "function"
    )
      throw new Error("The native canvas methods are missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        const context: unknown = Reflect.apply(getContext, this, [kind, ...args]);
        if (kind === "webgl" && context) gpu.add(this);
        return context;
      },
    });
    Object.defineProperty(WebGLRenderingContext.prototype, "drawArrays", {
      configurable: true,
      value: function (this: WebGLRenderingContext, ...args: unknown[]) {
        generation++;
        if (measuring) observations.draws++;
        const returned: unknown = Reflect.apply(drawArrays, this, args);
        return returned;
      },
    });
    Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
      configurable: true,
      value: function (
        this: CanvasRenderingContext2D,
        source: CanvasImageSource,
        ...args: number[]
      ) {
        const fromGpu = source instanceof HTMLCanvasElement && gpu.has(source);
        if (fromGpu) {
          latestGpu = source;
          if (!targets.has(this.canvas)) staging.add(this.canvas);
        }
        const intoTarget = targets.has(this.canvas);
        const materialCopy =
          fromGpu || (source instanceof HTMLCanvasElement && staging.has(source));
        if (measuring && materialCopy) {
          if (fromGpu) observations.gpuCopies++;
          if (intoTarget) {
            if (!latestGpu) throw new Error("The reference GPU canvas is unavailable");
            if (capturedGeneration !== generation) {
              if (referenceAtlas.width < latestGpu.width) referenceAtlas.width = latestGpu.width;
              if (referenceAtlas.height < latestGpu.height)
                referenceAtlas.height = latestGpu.height;
              referenceAtlasContext.clearRect(0, 0, referenceAtlas.width, referenceAtlas.height);
              referenceAtlasContext.globalCompositeOperation = "source-over";
              // The old production path staged the real GL output before cropping retained targets.
              Reflect.apply(drawImage, referenceAtlasContext, [
                latestGpu,
                0,
                0,
                latestGpu.width,
                latestGpu.height,
                0,
                0,
                latestGpu.width,
                latestGpu.height,
              ]);
              capturedGeneration = generation;
            }
            if (args.length !== 8) throw new Error("The material copy crop is unavailable");
            referenceTarget.width = this.canvas.width;
            referenceTarget.height = this.canvas.height;
            referenceTargetContext.globalCompositeOperation = "copy";
            Reflect.apply(drawImage, referenceTargetContext, [referenceAtlas, ...args]);
            observations.targetCopies++;
            observations.copiedRows.add(args[1] ?? -1);
            observations.copiedCases.push(Number(this.canvas.dataset.case));
            observations.copiedSizes.push({
              case: Number(this.canvas.dataset.case),
              width: this.canvas.width,
              height: this.canvas.height,
            });
            observations.names.add(this.canvas.dataset.print ?? "missing");
          }
        }
        const returned: unknown = Reflect.apply(drawImage, this, [source, ...args]);
        if (measuring && materialCopy && intoTarget) {
          const actual = this.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
          const expected = referenceTargetContext.getImageData(
            0,
            0,
            referenceTarget.width,
            referenceTarget.height,
          ).data;
          for (let index = 0; index < actual.length; index++) {
            const pixel = actual[index];
            const wanted = expected[index];
            if (pixel === undefined || wanted === undefined)
              throw new Error("The reference pixel dimensions differ");
            const difference = Math.abs(pixel - wanted);
            if (difference) observations.differingChannels++;
            observations.maxDifference = Math.max(observations.maxDifference, difference);
            if (index % 4 === 3 && pixel > 0 && pixel < 255) observations.fractionalAlpha++;
          }
        }
        return returned;
      },
    });
    const releases: (() => void)[] = [];
    // Distinct prints and normals span multiple batches; mixed sizes reorder crops within each.
    const sizes = [
      { width: 600, height: 700 },
      { width: 780, height: 500 },
      { width: 620, height: 800 },
      { width: 900, height: 570 },
      { width: 720, height: 650 },
      { width: 580, height: 760 },
      { width: 840, height: 610 },
      { width: 700, height: 600 },
    ];
    const canvases = sizes.map(({ width, height }, index) => {
      const canvas = document.createElement("canvas");
      const print = ["white", "line", "gray", "ink"][index % 4];
      if (!print) throw new Error("The material print case is missing");
      canvas.dataset.print = print;
      canvas.dataset.case = String(index);
      canvas.style.cssText = `position:absolute;left:20px;top:20px;width:${width}px;height:${height}px`;
      document.body.append(canvas);
      targets.add(canvas);
      releases.push(
        mountSticker(canvas, {
          print: `/direct-copy-${print}.svg`,
          cut: "/direct-copy-cut.svg",
          normal: index >= 4 ? "/direct-copy-normal.svg" : undefined,
          turn: index * 23,
          finish: "gloss",
        }),
      );
      return canvas;
    });
    try {
      await Promise.all(canvases.map((canvas) => whenStickerSettled(canvas)));
      await twoFrames();
      measuring = true;
      for (const [index, canvas] of canvases.entries()) {
        turnSticker(canvas, index * 23, index < 4 ? 0 : 12, index < 4 ? 0 : -17);
        refreshSticker(canvas);
      }
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      measuring = false;
      return {
        ...observations,
        contexts: gpu.size,
        copiedRows: [...observations.copiedRows],
        names: [...observations.names].sort(),
        // The declared material DPR ceiling remains 2 on the suite's DPR-3 phone emulation.
        expectedSizes: sizes.map(({ width, height }, index) => {
          const ratio = Math.min(devicePixelRatio, 2, 1024 / Math.max(width, height));
          return {
            case: index,
            width: Math.round(width * ratio),
            height: Math.round(height * ratio),
          };
        }),
      };
    } finally {
      for (const release of releases) release();
    }
  });
  expect(result.names).toEqual(["gray", "ink", "line", "white"]);
  expect(
    result.copiedCases,
    "Every target must retain its identity after job reordering",
  ).toHaveLength(8);
  expect([...result.copiedCases].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(
    result.copiedCases,
    "Mixed target heights must exercise reordered GL job positions",
  ).not.toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
  expect(new Set(result.copiedSizes.map(({ width }) => width)).size).toBeGreaterThan(1);
  expect(new Set(result.copiedSizes.map(({ height }) => height)).size).toBeGreaterThan(1);
  expect([...result.copiedSizes].sort((a, b) => a.case - b.case)).toEqual(result.expectedSizes);
  expect(result.fractionalAlpha).toBeGreaterThan(0);
  expect(
    result.copiedRows.some((row) => row > 0),
    "The reference must include later atlas rows",
  ).toBe(true);
  expect(
    result.differingChannels,
    "Retained copies must equal the independent staged path pixel for pixel",
  ).toBe(0);
  expect(result.maxDifference).toBe(0);
  expect(result.contexts).toBe(1);
  expect(result.draws).toBe(8);
  expect(
    result.expectedSizes.reduce((pixels, { width, height }) => pixels + width * height, 0),
    "Distinct-material crops must exceed one complete shared buffer",
  ).toBeGreaterThan(2048 * 2048);
  expect(result.targetCopies).toBe(8);
  expect(result.gpuCopies, "Every target must copy directly from the complete GL batch").toBe(8);
});

test("material batch copy notes appear only while the performance recorder is on", async ({
  page,
}) => {
  await emptyLaminatePage(page);
  await page.route("**/recorded-material.svg", (route) => route.fulfill(solidSvg("white", 120)));
  await page.goto("/e2e/stickerLaminate.html");
  const details = await page.evaluate(async () => {
    const { mountSticker, refreshSticker, whenStickerSettled } =
      await import("../src/stickers/stickerRenderer.ts");
    const {
      startPerformanceRecorder,
      stopPerformanceRecorder,
      clearPerformanceRecording,
      readPerformanceRecording,
    } = await import("../src/performance/performanceRecorder.ts");
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;left:20px;top:20px;width:120px;height:120px";
    document.body.append(canvas);
    const release = mountSticker(canvas, {
      print: "/recorded-material.svg",
      cut: "/recorded-material.svg",
      turn: 0,
      finish: "gloss",
    });
    const frame = () => new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    try {
      await whenStickerSettled(canvas);
      await frame();
      stopPerformanceRecorder();
      clearPerformanceRecording();
      refreshSticker(canvas);
      await frame();
      startPerformanceRecorder();
      await frame();
      await frame();
      refreshSticker(canvas);
      await frame();
      // Retain the diagnostic in a deliberately slow functional-test frame, outside any benchmark.
      const until = performance.now() + 80;
      while (performance.now() < until) {
        /* wait for the recorder's slow-frame boundary */
      }
      await frame();
      stopPerformanceRecorder();
      const recording = readPerformanceRecording();
      if (!recording) throw new Error("The material-copy recording is unavailable");
      const notes = recording.slowFrames.flatMap((slow) =>
        slow.events.filter((event) => event.kind === "laminate-batch"),
      );
      return [...new Map(notes.map((note) => [note.at, note.detail])).values()];
    } finally {
      stopPerformanceRecorder();
      release();
    }
  });
  expect(details.length).toBeGreaterThan(0);
  for (const detail of details)
    expect(detail).toMatch(
      /^1 tile; GL \d+x\d+; used \d+x\d+; submit \d+(?:\.\d+)?ms; first copy \d+(?:\.\d+)?ms; remaining copies \d+(?:\.\d+)?ms$/,
    );
});

test("moving a settled flat sticker without turning it does not redraw its laminate", async ({
  page,
}) => {
  await emptyLaminatePage(page);
  await page.route("**/position-only-material.svg", (route) =>
    route.fulfill(solidSvg("white", 120)),
  );
  await page.goto("/e2e/stickerLaminate.html");
  const result = await page.evaluate(async () => {
    const { mountSticker, turnSticker, whenStickerSettled } =
      await import("../src/stickers/stickerRenderer.ts");
    const { twoFrames } = await import("./stickerMaterialFixture.ts");
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "position:absolute;left:20px;top:20px;width:120px;height:120px";
    document.body.append(canvas);
    const release = mountSticker(canvas, {
      print: "/position-only-material.svg",
      cut: "/position-only-material.svg",
      turn: 27,
      finish: "gloss",
    });
    try {
      await whenStickerSettled(canvas);
      // Drain initial native observation before measuring the unchanged-turn position update.
      await new Promise<void>((resolve, reject) => {
        let resized = false;
        let entered = false;
        const finish = () => {
          if (!resized || !entered) return;
          clearTimeout(timer);
          resize.disconnect();
          intersection.disconnect();
          resolve();
        };
        const resize = new ResizeObserver(() => {
          resized = true;
          finish();
        });
        const intersection = new IntersectionObserver(() => {
          entered = true;
          finish();
        });
        const timer = setTimeout(() => {
          resize.disconnect();
          intersection.disconnect();
          reject(new Error("The initial laminate observation did not settle within 3 seconds"));
        }, 3000);
        resize.observe(canvas);
        intersection.observe(canvas);
      });
      await twoFrames();
      const initial = canvas.toDataURL();
      const observations = { draws: 0, copies: 0 };
      const draw: unknown = Reflect.get(WebGLRenderingContext.prototype, "drawArrays");
      const copy: unknown = Reflect.get(CanvasRenderingContext2D.prototype, "drawImage");
      if (typeof draw !== "function" || typeof copy !== "function")
        throw new Error("The native drawing methods are missing");
      Object.defineProperty(WebGLRenderingContext.prototype, "drawArrays", {
        configurable: true,
        value: function (this: WebGLRenderingContext, ...args: unknown[]) {
          observations.draws++;
          const returned: unknown = Reflect.apply(draw, this, args);
          return returned;
        },
      });
      Object.defineProperty(CanvasRenderingContext2D.prototype, "drawImage", {
        configurable: true,
        value: function (this: CanvasRenderingContext2D, ...args: unknown[]) {
          observations.copies++;
          const returned: unknown = Reflect.apply(copy, this, args);
          return returned;
        },
      });
      // A board drag changes position while its material turn and flat flight tilts stay unchanged.
      canvas.style.translate = "30px 10px";
      turnSticker(canvas, 27);
      await twoFrames();
      return {
        ...observations,
        retained: canvas.toDataURL() === initial,
        state: canvas.dataset.state,
      };
    } finally {
      release();
    }
  });
  expect(result).toEqual({ draws: 0, copies: 0, retained: true, state: "ready" });
});

test("an initial print failure settles current material while its normal is still loading", async ({
  page,
}) => {
  await emptyLaminatePage(page);
  await page.route("**/terminal-print.svg", (route) =>
    route.fulfill({ status: 503, body: "The initial print is unavailable" }),
  );
  const normal = await holdRoute(page, "**/terminal-held-normal.svg", () =>
    solidSvg("rgb(128,128,255)", 120),
  );
  await page.goto("/e2e/stickerLaminate.html");
  await page.evaluate(async () => {
    const { mountSticker, whenStickerSettled } = await import("../src/stickers/stickerRenderer.ts");
    const canvas = document.createElement("canvas");
    canvas.dataset.terminal = "";
    canvas.style.cssText = "width:120px;height:120px";
    document.body.append(canvas);
    mountSticker(canvas, {
      print: "/terminal-print.svg",
      cut: "/terminal-print.svg",
      normal: "/terminal-held-normal.svg",
      turn: 0,
      finish: "gloss",
    });
    window.laminateTerminalSettled = false;
    void whenStickerSettled(canvas).then(
      () => {
        window.laminateTerminalSettled = true;
      },
      (error: unknown) => {
        window.laminateTerminalSettled = { error };
      },
    );
  });
  await normal.requested;
  try {
    const coat = page.locator("[data-terminal]");
    await expect(coat).toHaveAttribute("data-state", "failed");
    await expect(coat).toHaveAttribute("data-error", /Replacing sticker print and cut.*503/);
    await waitTwoFrames(page);
    expect(await settlementFlag(page, "laminateTerminalSettled")).toBe(true);
  } finally {
    normal.release();
  }
});

test("inactive and offscreen laminate waits for exposure before allocating or loading material", async ({
  page,
}) => {
  await emptyLaminatePage(page);
  await page.route("**/admission-*.svg", (route) =>
    route.fulfill(
      solidSvg(route.request().url().includes("normal") ? "rgb(128,128,255)" : "white", 120),
    ),
  );
  await page.goto("/e2e/stickerLaminate.html");
  await page.evaluate(async () => {
    const material = await import("../src/stickers/stickerRenderer.ts");
    const { twoFrames } = await import("./stickerMaterialFixture.ts");
    const observations = { urls: [] as string[], contexts: 0, uploads: 0 };
    window.laminateAdmissionObservations = observations;
    const fetchSource = window.fetch;
    window.fetch = (...args) => {
      const source = args[0];
      if (typeof source === "string") observations.urls.push(source);
      else if (source instanceof URL) observations.urls.push(source.href);
      else if (source instanceof Request) observations.urls.push(source.url);
      else throw new Error("The material fetch URL is unavailable");
      return fetchSource(...args);
    };
    const getContext: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof getContext !== "function") throw new Error("The native canvas method is missing");
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      value: function (this: HTMLCanvasElement, kind: string, ...args: unknown[]) {
        const context: unknown = Reflect.apply(getContext, this, [kind, ...args]);
        if (kind === "webgl" && context instanceof WebGLRenderingContext) {
          observations.contexts++;
          const upload: unknown = Reflect.get(context, "texImage2D");
          if (typeof upload !== "function") throw new Error("The native texture method is missing");
          Object.defineProperty(context, "texImage2D", {
            value: function (this: WebGLRenderingContext, ...parameters: unknown[]) {
              observations.uploads++;
              const returned: unknown = Reflect.apply(upload, this, parameters);
              return returned;
            },
          });
        }
        return context;
      },
    });
    window.laminateAdmissionOpen = false;
    for (const name of ["inactive", "offscreen", "detached"]) {
      const canvas = document.createElement("canvas");
      canvas.dataset.admission = name;
      canvas.style.cssText = `position:absolute;left:20px;top:${name === "offscreen" ? innerHeight + 100 : 20}px;width:120px;height:120px`;
      if (name !== "detached") document.body.append(canvas);
      const release = material.mountSticker(canvas, {
        print: `/admission-${name}-print.svg`,
        cut: `/admission-${name}-cut.svg`,
        normal: `/admission-${name}-normal.svg`,
        turn: 0,
        finish: "gloss",
        active: () => name !== "inactive" || window.laminateAdmissionOpen === true,
      });
      if (name === "detached") release();
    }
    const inactive = document.querySelector("[data-admission=inactive]");
    if (!(inactive instanceof HTMLCanvasElement)) throw new Error("The inactive coat is missing");
    material.updateSticker(inactive, {
      print: "/admission-latest-print.svg",
      cut: "/admission-latest-cut.svg",
      normal: "/admission-latest-normal.svg",
      finish: "gloss",
    });
    await twoFrames();
  });
  expect(await page.evaluate(() => window.laminateAdmissionObservations)).toEqual({
    urls: [],
    contexts: 0,
    uploads: 0,
  });
  await page.evaluate(async () => {
    window.laminateAdmissionOpen = true;
    const canvas = document.querySelector("[data-admission=inactive]");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The inactive coat is missing");
    (await import("../src/stickers/stickerRenderer.ts")).refreshSticker(canvas);
  });
  await expect(page.locator("[data-admission=inactive]")).toHaveAttribute("data-state", "ready");
  const urls = () =>
    page.evaluate(() => {
      const observations = window.laminateAdmissionObservations;
      if (!observations) throw new Error("Material fetch observations are missing");
      return observations.urls;
    });
  expect(await urls()).toEqual([
    "/admission-latest-normal.svg",
    "/admission-latest-print.svg",
    "/admission-latest-cut.svg",
  ]);
  await page.locator("[data-admission=offscreen]").scrollIntoViewIfNeeded();
  await expect(page.locator("[data-admission=offscreen]")).toHaveAttribute("data-state", "ready");
  expect(await urls()).toEqual([
    "/admission-latest-normal.svg",
    "/admission-latest-print.svg",
    "/admission-latest-cut.svg",
    "/admission-offscreen-normal.svg",
    "/admission-offscreen-print.svg",
    "/admission-offscreen-cut.svg",
  ]);
});

test("material settlement waits for the requested normal and its completed snapshot", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-material");
  await expect(coat).toHaveAttribute("data-state", "ready");
  const initial = await coat.evaluate(snapshotOf);
  await page.route("**/older-settlement-normal.svg", (route) =>
    route.fulfill({ status: 503, body: "The older normal failed" }),
  );
  await page.evaluate(() =>
    window.laminateFixture.update({ normal: "/older-settlement-normal.svg" }),
  );
  await expect(coat).toHaveAttribute("data-error", /older-settlement-normal.*503/);
  const normal = await holdRoute(page, "**/settlement-normal.svg", () =>
    solidSvg("rgb(175,128,245)"),
  );
  const available = await page.evaluate(async () => {
    const material = await import("../src/stickers/stickerRenderer.ts");
    const settle: unknown = Reflect.get(material, "whenStickerSettled");
    if (typeof settle !== "function") return false;
    const canvas = document.querySelector("[data-reload] canvas.sticker-material");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The coating snapshot is missing");
    const pending: unknown = Reflect.apply(settle, undefined, [
      canvas,
      { normal: "/settlement-normal.svg" },
    ]);
    if (!(pending instanceof Promise))
      throw new Error("Material settlement did not return a promise");
    window.laminateMaterialSettled = false;
    void pending.then(
      () => {
        window.laminateMaterialSettled = true;
      },
      (error: unknown) => {
        window.laminateMaterialSettled = { error };
      },
    );
    return true;
  });
  expect(available, "The board needs an actual material settlement query").toBe(true);
  try {
    // The expected normal is registered before React adopts it, so the old flat coat cannot settle it.
    await page.evaluate(async () => {
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    expect(await settlementFlag(page, "laminateMaterialSettled")).toBe(false);
    await page.evaluate(() => window.laminateFixture.update({ normal: "/settlement-normal.svg" }));
    await normal.requested;
    await expect.poll(() => coat.evaluate(snapshotOf)).toBe(initial);
    expect(await settlementFlag(page, "laminateMaterialSettled")).toBe(false);
  } finally {
    normal.release();
  }
  await expect.poll(() => settlementFlag(page, "laminateMaterialSettled")).toBe(true);
  const withNormal = await coat.evaluate(snapshotOf);
  expect(withNormal).not.toBe(initial);
  await page.evaluate(async () => {
    const { whenStickerSettled } = await import("../src/stickers/stickerRenderer.ts");
    const { twoFrames } = await import("./stickerMaterialFixture.ts");
    const canvas = document.querySelector("[data-reload] canvas.sticker-material");
    if (!(canvas instanceof HTMLCanvasElement)) throw new Error("The coating snapshot is missing");
    window.laminateFlatSettled = false;
    void whenStickerSettled(canvas, { normal: undefined }).then(
      () => {
        window.laminateFlatSettled = true;
      },
      (error: unknown) => {
        window.laminateFlatSettled = { error };
      },
    );
    await twoFrames();
  });
  expect(await settlementFlag(page, "laminateFlatSettled")).toBe(false);
  await page.evaluate(() => window.laminateFixture.update({ normal: undefined }));
  await expect.poll(() => settlementFlag(page, "laminateFlatSettled")).toBe(true);
  expect(await coat.evaluate(snapshotOf)).not.toBe(withNormal);
});

test("baseline normal settlement does not wait for a later sharp print upgrade", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-material");
  await expect(coat).toHaveAttribute("data-state", "ready");
  const print = await holdRoute(page, "**/future-sharp-print.svg", () => solidSvg("gray"));
  await page.evaluate(() => window.laminateFixture.update({ print: "/future-sharp-print.svg" }));
  await print.requested;
  try {
    await page.evaluate(async () => {
      const { whenStickerSettled } = await import("../src/stickers/stickerRenderer.ts");
      const { twoFrames } = await import("./stickerMaterialFixture.ts");
      const canvas = document.querySelector("[data-reload] canvas.sticker-material");
      if (!(canvas instanceof HTMLCanvasElement))
        throw new Error("The coating snapshot is missing");
      window.laminateBaselineSettled = false;
      window.laminateCurrentSettled = false;
      void whenStickerSettled(canvas, { normal: undefined }).then(
        () => {
          window.laminateBaselineSettled = true;
        },
        (error: unknown) => {
          window.laminateBaselineSettled = { error };
        },
      );
      void whenStickerSettled(canvas).then(
        () => {
          window.laminateCurrentSettled = true;
        },
        (error: unknown) => {
          window.laminateCurrentSettled = { error };
        },
      );
      await twoFrames();
    });
    expect(await settlementFlag(page, "laminateBaselineSettled")).toBe(true);
    expect(await settlementFlag(page, "laminateCurrentSettled")).toBe(false);
    await expect(coat).toHaveAttribute("data-state", "ready");
  } finally {
    print.release();
  }
  await expect.poll(() => settlementFlag(page, "laminateCurrentSettled")).toBe(true);
});

test("canceling deferred material settlement and reporting initial failure both release the wait", async ({
  page,
}) => {
  await emptyLaminatePage(page);
  await page.route("**/settlement-failed.svg", (route) =>
    route.fulfill({ status: 503, body: "The initial print failed" }),
  );
  await page.goto("/e2e/stickerLaminate.html");
  const result = await page.evaluate(async () => {
    const material = await import("../src/stickers/stickerRenderer.ts");
    const { twoFrames } = await import("./stickerMaterialFixture.ts");
    const settle: unknown = Reflect.get(material, "whenStickerSettled");
    if (typeof settle !== "function") return { available: false };
    const original = window.fetch;
    let fetches = 0;
    window.fetch = (...args) => {
      fetches++;
      return original(...args);
    };
    const canvas = document.createElement("canvas");
    canvas.style.cssText = "width:120px;height:120px";
    document.body.append(canvas);
    const release = material.mountSticker(canvas, {
      print: "/settlement-failed.svg",
      cut: "/settlement-failed.svg",
      turn: 0,
      finish: "gloss",
      active: () => false,
    });
    const controller = new AbortController();
    const canceled: unknown = Reflect.apply(settle, undefined, [
      canvas,
      { normal: undefined },
      controller.signal,
    ]);
    if (!(canceled instanceof Promise))
      throw new Error("Material settlement did not return a promise");
    let canceledFinished = false;
    const canceledObservation = canceled.then(() => {
      canceledFinished = true;
    });
    await twoFrames();
    const deferred = { canceledFinished, fetches };
    controller.abort();
    await canceledObservation;
    const unmounted: unknown = Reflect.apply(settle, undefined, [canvas]);
    if (!(unmounted instanceof Promise))
      throw new Error("Material settlement did not return a promise");
    release();
    await unmounted;
    const beforeExposure = fetches;
    const failed = document.createElement("canvas");
    failed.style.cssText = "width:120px;height:120px";
    document.body.append(failed);
    const releaseFailed = material.mountSticker(failed, {
      print: "/settlement-failed.svg",
      cut: "/settlement-failed.svg",
      turn: 0,
      finish: "gloss",
    });
    try {
      const failure: unknown = Reflect.apply(settle, undefined, [failed]);
      if (!(failure instanceof Promise))
        throw new Error("Material settlement did not return a promise");
      await failure;
      return {
        available: true,
        deferred,
        canceledFinished,
        beforeExposure,
        state: failed.dataset.state,
        error: failed.dataset.error,
      };
    } finally {
      releaseFailed();
    }
  });
  expect(result).toMatchObject({
    available: true,
    deferred: { canceledFinished: false, fetches: 0 },
    canceledFinished: true,
    beforeExposure: 0,
    state: "failed",
  });
  expect(result.error).toContain("Replacing sticker print and cut");
  expect(result.error).toContain("503");
});

test("failed or superseded crease normals preserve the last ready material", async ({
  page,
}, info) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-material");
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
  const old = await holdRoute(page, "**/superseded-normal.svg", () => solidSvg("rgb(80,128,245)"));
  await page.route("**/latest-normal.svg", (route) => route.fulfill(solidSvg("rgb(175,128,245)")));
  await page.evaluate(() => window.laminateFixture.update({ normal: "/superseded-normal.svg" }));
  await old.requested;
  try {
    await page.evaluate(() => window.laminateFixture.update({ normal: "/latest-normal.svg" }));
    await expect(coat).not.toHaveAttribute("data-error");
    await expect.poll(snapshot).not.toBe(initial);
    const latest = await snapshot();
    old.release();
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
    old.release();
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
        window.laminateInitialNormalRequested = true;
        await new Promise<void>((resolve) => {
          window.laminateReleaseInitialNormal = resolve;
        });
      }
      return response;
    };
  });
  await page.goto("/e2e/stickerLaminate.html?ramp=1");
  const coat = page.locator("[data-ramp] canvas.sticker-material");
  await expect
    .poll(() => page.evaluate(() => window.laminateInitialNormalRequested === true))
    .toBe(true);
  await expect(page.locator("[data-white] canvas.sticker-material")).toHaveAttribute(
    "data-state",
    "ready",
  );
  try {
    await expect(coat).toHaveAttribute("data-state", "loading");
  } finally {
    await page.evaluate(() => {
      const release = window.laminateReleaseInitialNormal;
      if (!release) throw new Error("The initial normal request was not held");
      release();
    });
  }
  await expect(coat).toHaveAttribute("data-state", "ready");
});

test("a failed print upgrade retains the complete last ready sticker", async ({ page }) => {
  await page.goto("/e2e/stickerLaminate.html?reload=1");
  const coat = page.locator("[data-reload] canvas.sticker-material");
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
  const coat = page.locator("[data-reload] canvas.sticker-material");
  const image = page.locator("[data-reload] img");
  await expect(coat).toHaveAttribute("data-state", "ready");
  const pose = await page.evaluate(() => window.laminateFixture.getPose());
  const resources = await page.evaluate(async () => {
    const gpu = new WeakSet<HTMLCanvasElement>();
    const observations = { fetches: 0, contexts: 0 };
    window.laminateReplacementResources = observations;
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
    const replacement = await holdRoute(page, `**/replacement-${kind}.svg`, () =>
      solidSvg(kind === "normal" ? "rgb(128,128,255)" : "white"),
    );
    await page.evaluate(
      (kind) => window.laminateFixture.update({ [kind]: `/replacement-${kind}.svg` }),
      kind,
    );
    await replacement.requested;
    try {
      await expect(coat).toHaveAttribute("data-state", "ready");
      await expect(image).toHaveCSS("visibility", "hidden");
      if (kind === "normal") {
        expect(await page.evaluate(() => window.laminateReplacementResources)).toEqual({
          fetches: 1,
          contexts: 0,
        });
      }
      expect(await page.evaluate(() => window.laminateFixture.getPose())).toEqual(pose);
    } finally {
      replacement.release();
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
  const coat = page.locator('[data-sticker="47"] canvas.sticker-material');
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
  await emptyLaminatePage(page);
  await page.addInitScript(() => {
    const contexts: WebGLRenderingContext[] = [];
    window.laminateInitContexts = contexts;
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
    const { mountSticker } = await import("../src/stickers/stickerRenderer.ts");
    return Array.from({ length: 3 }, () => {
      const canvas = document.createElement("canvas");
      canvas.style.cssText = "width:120px;height:120px";
      document.body.append(canvas);
      const release = mountSticker(canvas, {
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
        const contexts = window.laminateInitContexts;
        if (!contexts) throw new Error("The allocated contexts were not captured");
        return contexts.map((context) => context.isContextLost());
      }),
    )
    .toEqual([true, true, true]);
});

test("live material copies own their pose and discard all pixels when the source is released", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?board=1");
  const observed = await page.evaluate(async () => {
    const { required, solidPng } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const source = required(document.querySelector<HTMLCanvasElement>("canvas.sticker-material"));
    await api.whenStickerSettled(source, undefined, AbortSignal.timeout(5000));
    const target = document.createElement("canvas");
    target.style.cssText = "position:absolute;left:30px;top:30px;width:120px;height:120px";
    document.body.append(target);
    let invalidated = false;
    const release = api.mountStickerCopy(
      target,
      source,
      () => true,
      () => {
        invalidated = true;
      },
    );
    api.turnSticker(target, 45, 12, -8);
    await api.whenStickerSettled(target, undefined, AbortSignal.timeout(5000));
    const ready = target.dataset.state;
    const targetTurn = api.stickerTurn(target),
      sourceTurn = api.stickerTurn(source);
    window.laminateFixture.update({ veiled: true });
    // The main fixture's board figure does not use the replacement controls: remove React's owner.
    const host = document.createElement("div");
    document.body.append(host);
    const isolated = document.createElement("canvas");
    isolated.style.cssText = "width:32px;height:32px";
    host.append(isolated);
    const url = solidPng(32, 32, "black");
    const stopSource = api.mountSticker(isolated, {
      print: url,
      cut: url,
      turn: 0,
      finish: "gloss",
    });
    await api.whenStickerSettled(isolated, undefined, AbortSignal.timeout(5000));
    release();
    const stopCopy = api.mountStickerCopy(
      target,
      isolated,
      () => true,
      () => {
        invalidated = true;
      },
    );
    stopSource();
    const result = {
      ready,
      targetTurn,
      sourceTurn,
      invalidated,
      width: target.width,
      height: target.height,
    };
    stopCopy();
    target.remove();
    host.remove();
    return result;
  });
  expect(observed.ready).toBe("ready");
  expect(observed.targetTurn).toBe(45);
  expect(observed.sourceTurn).toBe(0);
  expect(observed.invalidated).toBe(true);
  expect(observed.width * observed.height).toBe(0);
});
