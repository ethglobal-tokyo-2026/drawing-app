import { mkdir, rmdir } from "node:fs/promises";
import { setTimeout as pause } from "node:timers/promises";
import type { Page } from "@playwright/test";
import { openDb } from "../../../packages/db/src/index.ts";
import { E2E_DATA_DIR, E2E_DATABASE } from "./dataDir.ts";

/** Only the browser suite's isolated, seeded people; never a production sign-in capability. */
export const E2E_BIGWHEEL_ID = "d5984df6-db28-44f2-801c-2f2f5b565463";
export const E2E_HANA_ID = "bef03287-50ee-4e51-aaef-a9dc1303b854";
export const E2E_BIGWHEEL_LINE_ID = "dev-bigwheel";

/**
 * An auto fixture that holds the person pair for one test. Both projects, and every spec that signs in
 * as the pair, share it, so their tests take turns even when the rest of the suite runs in parallel.
 */
export async function holdPersonPair(
  { page }: { page: Page },
  provide: (value: void) => Promise<void>,
) {
  const lock = `${E2E_DATA_DIR}/person-pair.lock`;
  const deadline = Date.now() + 150_000;
  for (;;) {
    try {
      await mkdir(lock);
      break;
    } catch (error) {
      if (!(error instanceof Error && "code" in error && error.code === "EEXIST")) throw error;
      if (Date.now() >= deadline)
        throw new Error("The isolated person pair remained busy for 150 seconds");
      await pause(250);
    }
  }
  try {
    const db = openDb(E2E_DATABASE);
    const historical = db.$client
      .prepare<[], { sticker_id: string; received_at: number }>(
        "select sticker_id, received_at from gifts where received_at is not null",
      )
      .all()
      .map((row) => `${row.sticker_id}@${row.received_at}`);
    db.$client.close();
    // A fresh test context starts after earlier cases' receives; their notices are fixture history.
    // Seed once, leaving this case's real notice acknowledgments intact across every page reload.
    await page.addInitScript((noticed) => {
      if (localStorage.getItem("draw.gifts.noticed") === null)
        localStorage.setItem("draw.gifts.noticed", JSON.stringify(noticed));
    }, historical);
    await provide();
  } finally {
    await rmdir(lock);
  }
}
