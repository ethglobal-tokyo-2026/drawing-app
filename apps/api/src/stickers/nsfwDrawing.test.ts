import { bytes32, insertUser } from "@drawing-app/db/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Schedule } from "../midnightJob.ts";
import { drawingUrls } from "../services/imageStore.ts";
import { createTestApp } from "../testing/createTestApp.ts";
import { fakeCdnPurge } from "../testing/fakes.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { insertSealedSticker } from "../testing/rows.ts";
import { CDN_PURGE_SWEEP_EVERY_MS, startCdnPurgeSweeps, sweepCdnPurges } from "./nsfwDrawing.ts";
import { sealImages } from "./testPngs.ts";

let logs: LogLines;
beforeEach(() => {
  logs = captureLogLines();
});
afterEach(() => {
  vi.restoreAllMocks();
});

/** The app with a CDN purge that answers `purged` until the test changes it, and a new drawing's URLs. */
async function appWithPurge(purged: boolean) {
  const purge = fakeCdnPurge(purged);
  const test = await createTestApp({ cdnPurge: purge });
  const contentHash = bytes32("a drawing");
  const drawing = drawingUrls(test.images.urls(contentHash));
  /** What the CDN was asked to purge once it had purged the drawing `times` times. */
  const purgedTimes = (times: number) => Array.from({ length: times }, () => drawing).flat();
  return { test, purge, contentHash, purgedTimes, sweep: () => sweepCdnPurges(test.deps) };
}

/** An Original Artist's sticker, not yet marked, sealed from a drawing no other sticker shows. */
async function unmarkedSticker(purged: boolean) {
  const app = await appWithPurge(purged);
  const { test, contentHash } = app;
  await test.images.save(contentHash, sealImages());
  const artistId = insertUser(test.db);
  const stickerId = insertSealedSticker(test.db, artistId, { contentHash });
  const mark = () => test.send("POST", `/api/stickers/${stickerId}/nsfw`, { as: artistId });
  return { ...app, stickerId, mark };
}

describe("the CDN purge of a drawing a mark made private", () => {
  it("is done once the mark's own purge is, so a sweep finds nothing due", async () => {
    const { purge, purgedTimes, sweep, mark } = await unmarkedSticker(true);
    expect((await mark()).status).toBe(200);
    await sweep();
    expect(purge.urls).toEqual(purgedTimes(1));
  });

  it("stays due while it fails, and each sweep retries it until it's purged", async () => {
    const { purge, purgedTimes, sweep, stickerId, mark } = await unmarkedSticker(false);
    expect(await (await mark()).json()).toMatchObject({ cdnPurged: false });
    await sweep();
    expect(purge.urls).toEqual(purgedTimes(2));
    logs.expectLogged("cdn.purge.retried", { stickerId, status: "still_due" });

    purge.purged = true;
    await sweep();
    logs.expectLogged("cdn.purge.retried", { stickerId, status: "purged" });
    await sweep();
    expect(purge.urls).toEqual(purgedTimes(3));
  });

  it("is swept at boot when a restart cut the mark's purge off, then every CDN_PURGE_SWEEP_EVERY_MS", async () => {
    const { test, purge, contentHash, purgedTimes } = await appWithPurge(true);
    // As a mark leaves its sticker when the server restarts before its purge is done.
    insertSealedSticker(test.db, insertUser(test.db), {
      contentHash,
      nsfw: true,
      cdnPurgeDueAt: test.clock.now(),
    });
    const due: { run: () => void; ms: number }[] = [];
    const schedule: Schedule = (run, ms) => {
      due.push({ run, ms });
      return () => {};
    };
    const sweeps = startCdnPurgeSweeps({ ...test.deps, schedule });
    await sweeps?.idle();
    expect(purge.urls).toEqual(purgedTimes(1));
    expect(due.map(({ ms }) => ms)).toEqual([CDN_PURGE_SWEEP_EVERY_MS]);
    due[0]?.run();
    await sweeps?.idle();
    expect(purge.urls).toEqual(purgedTimes(1));
    sweeps?.stop();
  });
});
