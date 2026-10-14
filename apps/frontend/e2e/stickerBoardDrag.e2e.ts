import { observeStickerHardware, qualifyStickerScene } from "./stickerPerformance";
import { expect, test, type Page, type TestInfo } from "@playwright/test";
import { writeFile } from "node:fs/promises";
import { hand, FINGERTIP } from "./pen";
import {
  checkStickerFrameBudget,
  displayMilliseconds,
  stickerDisplayBudget,
} from "./stickerPerformance";

test.use({
  viewport: { width: 1032, height: 1376 },
  deviceScaleFactor: 2,
  hasTouch: true,
  isMobile: true,
});

/** Pixel reads belong between timed phases; every distinct material must respond and hold. */
async function materialDigests(page: Page, foilOnly = false): Promise<Record<string, string>> {
  return page.evaluate(
    async (foilOnly) =>
      Object.fromEntries(
        await Promise.all(
          [...document.querySelectorAll<HTMLCanvasElement>("canvas.sticker-material")].map(
            async (canvas) => {
              const id = canvas.closest<HTMLElement>(".placed-sticker")?.dataset.stickerId;
              if (!id) throw new Error("A material canvas has no sticker identifier");
              const context = canvas.getContext("2d");
              if (!context) throw new Error(`Reading ${id}'s material has no 2D context`);
              const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
              if (foilOnly) {
                const { registeredPaperAlpha } = await import("./stickerMaterialFixture.ts");
                const alpha = await registeredPaperAlpha(canvas);
                for (let i = 0; i < pixels.length; i += 4)
                  if (alpha[i + 3] !== 0) pixels.fill(0, i, i + 4);
                if (
                  canvas.dataset.foil !== "true" ||
                  !pixels.some((value, index) => index % 4 === 3 && value > 0)
                )
                  throw new Error(`${id} lost its registered foil pixels outside paper`);
                if (
                  getComputedStyle(canvas.closest(".sticker-material-surface") ?? canvas).filter !==
                  "none"
                )
                  throw new Error(
                    `${id} clips or shadows its complete foil rather than its registered cast`,
                  );
              }
              const digest = await crypto.subtle.digest("SHA-256", pixels);
              return [id, [...new Uint8Array(digest)].join(",")] as const;
            },
          ),
        ),
      ),
    foilOnly,
  );
}

async function captureRecorder(page: Page, info: TestInfo) {
  if (page.isClosed())
    throw new Error(
      "The large board page closed before the recorder could be stopped and captured",
    );
  const capture = await page.evaluate(() => window.stickerBoardDragFixture.finishRecorder());
  const recorderPath = info.outputPath("large-board-existing-recorder.json");
  await writeFile(recorderPath, JSON.stringify(capture), "utf8");
  await info.attach("large-board-existing-recorder", {
    path: recorderPath,
    contentType: "application/json",
  });
  if (capture.report) {
    const reportPath = info.outputPath("large-board-existing-recorder-report.txt");
    await writeFile(reportPath, capture.report.report, "utf8");
    await info.attach("large-board-existing-recorder-report", {
      path: reportPath,
      contentType: "text/plain",
    });
  }
  expect(capture.isOn, "The recorder must stop even when an assertion fails").toBe(false);
  if (capture.recording)
    console.log(
      "Large board existing recorder",
      JSON.stringify({
        frames: capture.recording.summary.frames,
        slowFrames: capture.recording.summary.slow,
        worst: capture.recording.summary.worst,
        typicalMs: capture.recording.summary.typicalMs,
      }),
    );
}

for (const scene of [
  { count: 15, width: 1032, height: 1376, variant: null },
  { count: 21, width: 1200, height: 1454, variant: "mixed-21" },
] as const) {
  test(`dragging a large overlapping sticker on a ${scene.count}-sticker board preserves ready coating and measures each input phase`, async ({
    page,
  }, info) => {
    const recorderRequested = process.env.STICKER_DRAG_RECORDER === "on";
    await page.setViewportSize({ width: scene.width, height: scene.height });
    console.log(
      "Large board capture modes",
      JSON.stringify({
        scene,
        existingRecorder: recorderRequested,
        chromeTimeline: process.env.STICKER_DRAG_TRACE === "on",
        playwrightTrace: info.project.use.trace ?? "off",
      }),
    );
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
      console.error("Large board fixture error", error.message);
    });
    page.on("console", (message) => {
      if (message.type() === "error") {
        errors.push(message.text());
        console.error("Large board fixture error", message.text());
      }
    });
    try {
      const query = new URLSearchParams();
      if (scene.variant) query.set("variant", scene.variant);
      if (recorderRequested) query.set("recorder", "on");
      await page.goto(`/e2e/stickerBoardDrag.html${query.size ? `?${query}` : ""}`);
      await expect(page.locator(".placed-sticker canvas[data-state=ready]")).toHaveCount(
        scene.count,
      );
      await expect(page.locator(".sticker-crease")).not.toHaveCount(0);
      await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
      const originalNormals = await page.evaluate((count) => {
        const fixture = window.stickerBoardDragFixture;
        if (fixture.stickerCount !== count || fixture.rememberCanvases() !== count)
          throw new Error("The board has missing materials or the wrong fixture variant");
        return fixture.normals();
      }, scene.count);
      expect(
        Object.values(originalNormals).filter((normal) => normal !== null).length,
      ).toBeGreaterThanOrEqual(scene.count === 21 ? 13 : 1);
      expect(await page.evaluate(() => window.stickerBoardDragFixture.recorderOn())).toBe(
        recorderRequested,
      );
      await qualifyStickerScene(page, info, `drag-${scene.count}`);
      const start = await page.evaluate(() => {
        for (let index = 0; index < 5; index++) {
          const id = `large-drag-${index}`;
          const sticker = document.querySelector(`[data-sticker-id="${id}"]`);
          const box = sticker?.getBoundingClientRect();
          if (!box) continue;
          for (let y = box.top + 15; y < box.bottom - 15; y += 15)
            for (let x = box.left + 15; x < box.right - 15; x += 15)
              if (document.elementFromPoint(x, y)?.closest(".placed-sticker") === sticker)
                return { id, x, y };
        }
        throw new Error("No large central sticker has an exposed touch target");
      });
      const finger = await hand(page);
      const contact = { id: 1, radius: FINGERTIP, x: start.x, y: start.y };
      const trace =
        process.env.STICKER_DRAG_TRACE === "on" ? await page.context().newCDPSession(page) : null;
      if (trace)
        await trace.send("Tracing.start", {
          transferMode: "ReturnAsStream",
          categories:
            "devtools.timeline,blink.user_timing,cc,gpu,viz,disabled-by-default-devtools.timeline,disabled-by-default-devtools.timeline.frame,disabled-by-default-devtools.timeline.layers",
        });
      await page.evaluate(() => window.stickerBoardDragFixture.setPhase("pointerdown"));
      await finger.down([contact]);
      await page.waitForTimeout(200);
      await page.evaluate(() => window.stickerBoardDragFixture.setPhase("first-move"));
      await finger.move([{ ...contact, x: contact.x + 18 }]);
      await expect(page.locator(".board-stage")).toHaveAttribute("data-held", start.id);
      await expect(page.locator(".sticker-toolbar")).toHaveCount(0);
      await page.waitForTimeout(250);
      // Capture the rendered held sticker after its measured entrance; screenshot copying is not input work.
      await page.evaluate(() => window.stickerBoardDragFixture.setPhase("idle"));
      if (trace) {
        const completed = new Promise<string>((resolve, reject) => {
          const timer = setTimeout(
            () => reject(new Error("Chrome did not finish the first-move trace in 5 seconds")),
            5000,
          );
          trace.once("Tracing.tracingComplete", ({ stream }: { stream?: string }) => {
            clearTimeout(timer);
            if (stream) resolve(stream);
            else reject(new Error("Chrome returned no first-move trace stream"));
          });
        });
        await trace.send("Tracing.end");
        const handle = await completed;
        const chunks: string[] = [];
        while (true) {
          const chunk = await trace.send("IO.read", { handle });
          chunks.push(
            chunk.base64Encoded ? Buffer.from(chunk.data, "base64").toString("utf8") : chunk.data,
          );
          if (chunk.eof) break;
        }
        await trace.send("IO.close", { handle });
        const tracePath = info.outputPath("large-board-first-move-chrome-trace.json");
        await writeFile(tracePath, chunks.join(""), "utf8");
        await info.attach("large-board-first-move-chrome-trace", {
          path: tracePath,
          contentType: "application/json",
        });
        await trace.detach();
      }
      await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
      const heldNormals = await page.evaluate(() => window.stickerBoardDragFixture.normals());
      expect(
        Object.keys(originalNormals).some(
          (id) => id !== start.id && originalNormals[id] !== heldNormals[id],
        ),
        "Lifting an overlapping sticker must update the actual changed support normals",
      ).toBe(true);
      expect(
        await page.evaluate(() => window.stickerBoardDragFixture.retainedCanvases()),
        `A genuine overlap rebake must retain all ${scene.count} material canvas elements`,
      ).toBe(true);
      await expect(page.locator(".placed-sticker canvas[data-state=ready]")).toHaveCount(
        scene.count,
      );
      await materialDigests(page, true);
      const screenshot = info.outputPath("large-board-first-held.png");
      await page.screenshot({ path: screenshot });
      await info.attach("large-board-first-held", { path: screenshot, contentType: "image/png" });
      // Let screenshot presentation settle while timing is paused before measuring the next phase.
      await page.evaluate(() => new Promise<number>(requestAnimationFrame));
      await page.evaluate(() => window.stickerBoardDragFixture.setPhase("drag"));
      for (let step = 1; step <= 20; step++) {
        await page.evaluate(() => new Promise<number>(requestAnimationFrame));
        await finger.move([{ ...contact, x: contact.x + 18 + step * 3 }]);
      }
      await page.evaluate(() => window.stickerBoardDragFixture.setPhase("release"));
      await finger.up();
      await expect(page.locator(".board-stage")).toHaveAttribute("data-held", "");
      await page.waitForTimeout(1000);
      await expect(page.locator(".sticker-toolbar")).toHaveCount(1);
      await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
      await expect(page.locator(".sticker-material-flat")).toHaveCount(0);
      await expect(page.locator("[data-crease-reveal]")).toHaveCount(0);
      const result = await page.evaluate(
        ({ originalNormals, heldNormals, scene }) => {
          window.stickerBoardDragFixture.setPhase("idle");
          return {
            scene,
            frames: window.stickerBoardDragFixture.frames,
            events: window.stickerBoardDragFixture.events,
            mutations: window.stickerBoardDragFixture.mutations,
            creaseReveals: window.stickerBoardDragFixture.creaseReveals,
            missingSnapshots: window.stickerBoardDragFixture.missingSnapshots,
            incompleteBoards: window.stickerBoardDragFixture.incompleteBoards,
            retainedCanvases: window.stickerBoardDragFixture.retainedCanvases(),
            originalNormals,
            heldNormals,
            surfaces: [
              ...document.querySelectorAll<HTMLCanvasElement>(".placed-sticker canvas"),
            ].map((canvas) => ({
              width: canvas.width,
              height: canvas.height,
              state: canvas.dataset.state,
            })),
            creases: document.querySelectorAll(".sticker-crease").length,
          };
        },
        { originalNormals, heldNormals, scene },
      );
      const phasePath = info.outputPath("large-board-drag-phases.json");
      await writeFile(phasePath, JSON.stringify(result), "utf8");
      await info.attach("large-board-drag-phases", {
        path: phasePath,
        contentType: "application/json",
      });
      const percentile = (values: number[]) => {
        const value = values.toSorted((a, b) => a - b)[Math.floor(values.length * 0.95)];
        return value === undefined ? null : displayMilliseconds(value);
      };
      for (const phase of [
        "asset-preparation",
        "startup",
        "pointerdown",
        "first-move",
        "drag",
        "release",
      ] as const) {
        const frames = result.frames
          .filter((frame) => frame.phase === phase)
          .map((frame) => frame.interval);
        const inputs = result.events
          .filter((event) => event.phase === phase)
          .map((event) => event.duration);
        console.log(
          "Large board drag phase",
          JSON.stringify({
            count: scene.count,
            phase,
            frameCount: frames.length,
            p95FrameMs: percentile(frames),
            maximumFrameMs: frames.length ? Math.max(...frames) : null,
            inputCount: inputs.length,
            p95InputMs: percentile(inputs),
            maximumInputMs: inputs.length ? Math.max(...inputs) : null,
            totalInputMs: inputs.reduce((total, value) => total + value, 0),
          }),
        );
        if (checkStickerFrameBudget && phase !== "startup" && phase !== "asset-preparation") {
          expect(
            frames.length,
            `${scene.count}-sticker ${phase} must have observed display frames`,
          ).toBeGreaterThan(0);
          expect(
            displayMilliseconds(Math.max(...frames)),
            `${scene.count}-sticker ${phase} must not stall the display for over 50ms`,
          ).toBeLessThanOrEqual(stickerDisplayBudget.maximumMs);
          expect(
            percentile(frames),
            `${scene.count}-sticker ${phase} must keep 95% of displayed frames within 16.7ms`,
          ).toBeLessThanOrEqual(stickerDisplayBudget.p95Ms);
        }
      }
      expect(result.surfaces).toHaveLength(scene.count);
      expect(result.missingSnapshots).toEqual([]);
      expect(result.incompleteBoards).toEqual([]);
      expect(result.retainedCanvases).toBe(true);
      expect(
        result.surfaces.every(
          (surface) => surface.state === "ready" && surface.width > 0 && surface.height > 0,
        ),
      ).toBe(true);
      expect(result.creases).toBeGreaterThan(0);
      expect(result.creaseReveals).toContain("release");
      expect(result.creaseReveals.every((phase) => phase === "release")).toBe(true);
      expect(errors, "The material and crease pipeline must not silently fail").toEqual([]);
    } finally {
      if (recorderRequested) await captureRecorder(page, info);
    }
  });
}

test.beforeEach(async ({ page }) => observeStickerHardware(page));

test("21 distinct large creased stickers follow diagonal tilt and retain a stationary reflection", async ({
  page,
}, info) => {
  const recorderRequested = process.env.STICKER_DRAG_RECORDER === "on";
  await page.setViewportSize({ width: 1200, height: 1454 });
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  // This explicit permission stand-in is installed before fixture modules read the device facts.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "userAgent", {
      value:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 CriOS/140.0.0.0 Mobile/15E148 Safari/604.1",
      configurable: true,
    });
    Object.defineProperty(navigator, "maxTouchPoints", { value: 5, configurable: true });
    if (window.screen.orientation)
      Object.defineProperty(window.screen.orientation, "angle", { value: 0, configurable: true });
    Object.defineProperty(window, "orientation", { value: 0, configurable: true });
    if (typeof window.DeviceMotionEvent !== "function")
      throw new Error("The motion permission stand-in requires DeviceMotionEvent");
    Object.defineProperty(window.DeviceMotionEvent, "requestPermission", {
      value: async () => "granted",
      configurable: true,
    });
  });
  try {
    await page.goto(
      `/e2e/stickerBoardDrag.html?variant=mixed-21${recorderRequested ? "&recorder=on" : ""}`,
    );
    await expect(page.locator(".placed-sticker canvas[data-state=ready]")).toHaveCount(21);
    await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
    expect(
      await page.locator(".sticker-crease").count(),
      "The physical workload needs at least 13 genuine crease layers",
    ).toBeGreaterThanOrEqual(13);
    const scene = await page.evaluate(() => ({
      variant: window.stickerBoardDragFixture.variant,
      count: window.stickerBoardDragFixture.stickerCount,
      viewport: { width: innerWidth, height: innerHeight, dpr: devicePixelRatio },
      inside: [...document.querySelectorAll<HTMLElement>(".placed-sticker")].every((sticker) => {
        const box = sticker.getBoundingClientRect();
        return (
          box.left >= 0 && box.top >= 0 && box.right <= innerWidth && box.bottom <= innerHeight
        );
      }),
    }));
    expect(scene).toEqual({
      variant: "mixed-21",
      count: 21,
      viewport: { width: 1200, height: 1454, dpr: 2 },
      inside: true,
    });
    expect(await page.evaluate(() => window.stickerBoardDragFixture.askForMotion())).toBe(
      "granted",
    );
    expect(await page.evaluate(() => window.stickerBoardDragFixture.recorderOn())).toBe(
      recorderRequested,
    );
    await page.evaluate(() => {
      const fixture = window.stickerBoardDragFixture;
      fixture.setPhase("idle");
      fixture.tilt(40, 0, 123);
      if (fixture.rememberCanvases() !== 21) throw new Error("The board has missing materials");
    });
    await page.waitForTimeout(1000);
    await qualifyStickerScene(page, info, "mixed-board-motion");
    const registration = await page.evaluate(() =>
      Object.entries(window.stickerBoardDragFixture.acceptedCreases()).map(([id, crease]) => ({
        id,
        bounds: crease?.normalBounds,
      })),
    );
    expect(registration.find((entry) => entry.id === "large-drag-1")?.bounds?.x).toBeLessThan(0);
    expect(
      registration.filter((entry) => entry.id !== "large-drag-1").every((entry) => !entry.bounds),
    ).toBe(true);
    const neutral = await materialDigests(page);
    const motion = await page.evaluate(async () => {
      const fixture = window.stickerBoardDragFixture;
      // The digest's synchronous readback has ended before the measured display phase starts.
      await new Promise<number>(requestAnimationFrame);
      await new Promise<number>(requestAnimationFrame);
      const samples: {
        elapsed: number;
        inputMs: number;
        x: number;
        y: number;
        rotationDegrees: number;
      }[] = [];
      const started = performance.now();
      fixture.setPhase("steady-tilt");
      while (performance.now() - started < 2000) {
        const now = await new Promise<number>(requestAnimationFrame);
        const elapsed = now - started;
        const angle = (elapsed / 2000) * Math.PI * 4;
        const inputMs = fixture.tilt(
          40 + 5 * Math.cos(angle),
          5 * Math.sin(angle),
          123 + 3 * Math.sin(angle),
        );
        samples.push({ elapsed, inputMs, ...fixture.getPose() });
      }
      fixture.setPhase("idle");
      fixture.tilt(45, 5, 126);
      const changedFrames = samples.filter((pose, index) => {
        const previous = samples[index - 1];
        return (
          previous &&
          (pose.x !== previous.x ||
            pose.y !== previous.y ||
            pose.rotationDegrees !== previous.rotationDegrees)
        );
      }).length;
      return { samples, changedFrames, elapsed: performance.now() - started };
    });
    await page.waitForTimeout(1000);
    await page.evaluate(() => window.stickerBoardDragFixture.whenMaterialsSettled());
    const tilted = await materialDigests(page);
    const tiltedFoil = await materialDigests(page, true);
    const hold = await page.evaluate(async () => {
      const fixture = window.stickerBoardDragFixture;
      await new Promise<number>(requestAnimationFrame);
      await new Promise<number>(requestAnimationFrame);
      const pose = fixture.getPose();
      let changedPoses = 0;
      const started = performance.now();
      fixture.setPhase("stationary-hold");
      while (performance.now() - started < 1000) {
        await new Promise<number>(requestAnimationFrame);
        if (JSON.stringify(fixture.getPose()) !== JSON.stringify(pose)) changedPoses++;
      }
      fixture.setPhase("idle");
      return { pose, changedPoses, elapsed: performance.now() - started };
    });
    const stationary = await materialDigests(page);
    expect(await materialDigests(page, true)).toEqual(tiltedFoil);
    const result = await page.evaluate(() => {
      const fixture = window.stickerBoardDragFixture;
      return {
        frames: fixture.frames,
        missingSnapshots: fixture.missingSnapshots,
        incompleteBoards: fixture.incompleteBoards,
        materialCopies: fixture.materialCopies,
        retainedCanvases: fixture.retainedCanvases(),
        normals: fixture.normals(),
      };
    });
    const capture = {
      scene,
      engine: info.project.name,
      recorderRequested,
      motion,
      hold,
      neutral,
      tilted,
      stationary,
      ...result,
    };
    const phasePath = info.outputPath("large-board-motion-phases.json");
    await writeFile(phasePath, JSON.stringify(capture), "utf8");
    await info.attach("large-board-motion-phases", {
      path: phasePath,
      contentType: "application/json",
    });
    const percentile = (values: number[]) => {
      const value = values.toSorted((a, b) => a - b)[Math.floor(values.length * 0.95)];
      return value === undefined ? null : displayMilliseconds(value);
    };
    for (const phase of [
      "asset-preparation",
      "startup",
      "steady-tilt",
      "stationary-hold",
    ] as const) {
      const frames = result.frames
        .filter((frame) => frame.phase === phase)
        .map((frame) => frame.interval);
      const inputs = phase === "steady-tilt" ? motion.samples.map((sample) => sample.inputMs) : [];
      const copies = result.materialCopies.filter((copy) => copy.phase === phase);
      console.log(
        "Large board motion phase",
        JSON.stringify({
          phase,
          frameCount: frames.length,
          p95FrameMs: percentile(frames),
          maximumFrameMs: frames.length ? Math.max(...frames) : null,
          inputCount: inputs.length,
          p95InputMs: percentile(inputs),
          maximumInputMs: inputs.length ? Math.max(...inputs) : null,
          materialCopyCount: copies.length,
          renderedFrameCount: new Set(copies.map((copy) => copy.frame)).size,
        }),
      );
      if (checkStickerFrameBudget && (phase === "steady-tilt" || phase === "stationary-hold")) {
        expect(frames.length).toBeGreaterThan(0);
        expect(
          displayMilliseconds(Math.max(...frames)),
          `${phase} must not stall the display for over 50ms`,
        ).toBeLessThanOrEqual(stickerDisplayBudget.maximumMs);
        expect(
          percentile(frames),
          `${phase} must keep 95% of displayed frames within 16.7ms`,
        ).toBeLessThanOrEqual(stickerDisplayBudget.p95Ms);
      }
    }
    expect(Object.keys(neutral)).toHaveLength(21);
    expect(Object.keys(tilted)).toHaveLength(21);
    const renderedFrames = new Set(
      result.materialCopies
        .filter((copy) => copy.phase === "steady-tilt")
        .map((copy) => copy.frame),
    );
    const deliveredFrames = result.frames.filter((frame) => frame.phase === "steady-tilt").length;
    expect(
      renderedFrames.size,
      "Actual laminate snapshots must advance on at least 75% of delivered display frames",
    ).toBeGreaterThanOrEqual(Math.floor(deliveredFrames * 0.75));
    for (const id of Object.keys(neutral))
      expect(
        result.materialCopies.some((copy) => copy.phase === "steady-tilt" && copy.id === id),
        `${id} must receive actual shared-light snapshots`,
      ).toBe(true);
    expect(
      result.materialCopies.filter((copy) => copy.phase === "stationary-hold"),
      "A stationary reflection must perform no new material copies, including transient flashes",
    ).toEqual([]);
    expect(
      motion.changedFrames,
      "The shared light must advance on at least 75% of the delivered display frames",
    ).toBeGreaterThanOrEqual(Math.floor(motion.samples.length * 0.75));
    for (const id of Object.keys(neutral))
      expect(
        tilted[id],
        `${id}'s actual laminate must respond to the shared diagonal tilt`,
      ).not.toBe(neutral[id]);
    expect(stationary, "Every sticker must retain its held material without a timed wave").toEqual(
      tilted,
    );
    expect(hold.changedPoses).toBe(0);
    expect(result.retainedCanvases).toBe(true);
    expect(result.missingSnapshots).toEqual([]);
    expect(result.incompleteBoards).toEqual([]);
    expect(Object.values(result.normals).some((normal) => normal !== null)).toBe(true);
    expect(
      Math.max(...motion.samples.map((sample) => sample.x)) -
        Math.min(...motion.samples.map((sample) => sample.x)),
    ).toBeGreaterThan(0.15);
    expect(
      Math.max(...motion.samples.map((sample) => sample.y)) -
        Math.min(...motion.samples.map((sample) => sample.y)),
    ).toBeGreaterThan(0.15);
    expect(errors, "The large board motion pipeline must not silently fail").toEqual([]);
    const screenshot = info.outputPath("large-board-held-diagonal-tilt.png");
    await page.screenshot({ path: screenshot });
    await info.attach("large-board-held-diagonal-tilt", {
      path: screenshot,
      contentType: "image/png",
    });
  } finally {
    if (recorderRequested) await captureRecorder(page, info);
  }
});
