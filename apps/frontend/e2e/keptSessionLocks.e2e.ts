import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import type { SessionKeeper } from "../src/sticker-creation/session/keptSession.ts";

const EMPTY_PAGE = "/e2e-kept-session-locks";

type KeeperPage = Window & { keeper?: SessionKeeper; keptChanges?: boolean[] };

/** A blank document on the app's origin leaves only the actual session keeper active. */
async function newKeeperPage(context: BrowserContext): Promise<Page> {
  const page = await context.newPage();
  await page.route(`**${EMPTY_PAGE}`, (route) =>
    route.fulfill({
      body: "<!doctype html><title>Kept session locks</title>",
      contentType: "text/html",
    }),
  );
  await page.goto(EMPTY_PAGE);
  return page;
}

test("latest keeper owns saved ink and the previous keeper cannot overwrite it", async ({
  context,
}) => {
  const userId = `keeper-${crypto.randomUUID()}`;
  const first = await newKeeperPage(context);
  const second = await newKeeperPage(context);
  try {
    await first.evaluate(async (userId: string) => {
      const { SessionKeeper } = await import("../src/sticker-creation/session/keptSession.ts");
      const page = window as KeeperPage;
      page.keptChanges = [];
      page.keeper = new SessionKeeper(userId, (kept) => page.keptChanges?.push(kept));
      page.keeper.start(7);
      page.keeper.save([{ tool: "brush", layer: 1, color: "red", pts: [], T: 0 }], 1000, null);
    }, userId);

    await expect
      .poll(() =>
        first.evaluate(async (userId: string) => {
          const { loadKeptSession } =
            await import("../src/sticker-creation/session/keptSession.ts");
          const kept = await loadKeptSession(userId);
          return kept.status === "found"
            ? kept.steps.map((step) => "color" in step && step.color)
            : kept.status;
        }, userId),
      )
      .toEqual(["red"]);

    await second.evaluate(async (userId: string) => {
      const { SessionKeeper, loadKeptSession } =
        await import("../src/sticker-creation/session/keptSession.ts");
      const kept = await loadKeptSession(userId);
      if (kept.status !== "found")
        throw new Error(`The first keeper's drawing came back ${kept.status}`);
      const page = window as KeeperPage;
      page.keeper = new SessionKeeper(userId);
      page.keeper.resume(
        kept.ticket,
        kept.steps,
        kept.elapsedMs,
        kept.nsfw,
        kept.tools,
        kept.kyotoSeika,
        kept.generation,
      );
      page.keeper.save([{ tool: "brush", layer: 1, color: "blue", pts: [], T: 0 }], 2000, null);
    }, userId);

    await expect
      .poll(() => first.evaluate(() => (window as KeeperPage).keptChanges))
      .toEqual([false]);
    await expect
      .poll(() =>
        second.evaluate(async (userId: string) => {
          const { loadKeptSession } =
            await import("../src/sticker-creation/session/keptSession.ts");
          const kept = await loadKeptSession(userId);
          return kept.status === "found"
            ? kept.steps.map((step) => "color" in step && step.color)
            : kept.status;
        }, userId),
      )
      .toEqual(["blue"]);

    await first.evaluate(() => {
      const stale = (window as KeeperPage).keeper;
      if (!stale) throw new Error("The first keeper is missing");
      stale.save([{ tool: "brush", layer: 1, color: "red", pts: [], T: 0 }], 3000, null);
      stale.wipe();
    });
    const kept = await second.evaluate(async (userId: string) => {
      const { loadKeptSession } = await import("../src/sticker-creation/session/keptSession.ts");
      return loadKeptSession(userId);
    }, userId);
    expect(kept).toMatchObject({
      status: "found",
      ticket: 7,
      elapsedMs: 2000,
      steps: [{ tool: "brush", layer: 1, color: "blue", pts: [], T: 0 }],
    });
    expect(await first.evaluate(() => (window as KeeperPage).keptChanges)).toEqual([false]);
  } finally {
    await Promise.all([first.close(), second.close()]);
  }
});

test("native Web Locks queue a request without takeover until the holder releases", async ({
  context,
}) => {
  const page = await newKeeperPage(context);
  try {
    const result = await page.evaluate(async (name) => {
      let releaseOld!: () => void;
      let releaseNew!: () => void;
      let oldGranted!: () => void;
      let newGranted!: () => void;
      const oldHeld = new Promise<void>((resolve) => (releaseOld = resolve));
      const newHeld = new Promise<void>((resolve) => (releaseNew = resolve));
      const firstGranted = new Promise<void>((resolve) => (oldGranted = resolve));
      const secondGranted = new Promise<void>((resolve) => (newGranted = resolve));
      let firstRejected = "";
      let secondStarted = false;
      const first = navigator.locks
        .request(name, { steal: true }, () => {
          oldGranted();
          return oldHeld;
        })
        .catch((error: unknown) => {
          firstRejected = error instanceof Error ? error.name : String(error);
        });
      let firstTimeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          firstGranted,
          new Promise<never>((_, reject) => {
            firstTimeout = setTimeout(
              () => reject(new Error("The first Web Lock was not granted")),
              5000,
            );
          }),
        ]);
      } catch (error) {
        releaseOld();
        throw error;
      } finally {
        clearTimeout(firstTimeout);
      }
      const abortQueued = new AbortController();
      const second = navigator.locks.request(
        name,
        { steal: false, signal: abortQueued.signal },
        () => {
          secondStarted = true;
          newGranted();
          return newHeld;
        },
      );
      let timeout: ReturnType<typeof setTimeout> | undefined;
      let beforeRelease: { firstRejected: string; secondStarted: boolean } | undefined;
      let waitError: unknown;
      try {
        await new Promise((resolve) => setTimeout(resolve, 100));
        beforeRelease = { firstRejected, secondStarted };
        releaseOld();
        await Promise.race([
          secondGranted,
          new Promise<never>((_, reject) => {
            timeout = setTimeout(() => reject(new Error("The queued lock was not granted")), 5000);
          }),
        ]);
      } catch (error) {
        waitError = error;
      }
      clearTimeout(timeout);
      abortQueued.abort();
      releaseOld();
      releaseNew();
      const settled = await Promise.allSettled([first, second]);
      const failed = settled.find(
        (outcome) =>
          outcome.status === "rejected" &&
          !(outcome.reason instanceof DOMException && outcome.reason.name === "AbortError"),
      );
      if (waitError) throw waitError;
      if (failed?.status === "rejected") throw failed.reason;
      if (!beforeRelease) throw new Error("The lock requests did not reach the release check");
      return { beforeRelease, afterRelease: { secondStarted, firstRejected } };
    }, `native-control-${crypto.randomUUID()}`);
    expect(result.beforeRelease).toEqual({ firstRejected: "", secondStarted: false });
    expect(result.afterRelease).toEqual({ firstRejected: "", secondStarted: true });
  } finally {
    await page.close();
  }
});
