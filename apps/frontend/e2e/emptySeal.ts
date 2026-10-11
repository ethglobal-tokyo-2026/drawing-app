import type { Page } from "@playwright/test";
import type { Language } from "../src/i18n/language.ts";
import { strings } from "../src/i18n/strings/index.ts";
import { canvas, say, signedInUserId } from "./helpers.ts";
import { along, pencil, penStroke } from "./pen.ts";

/** Erases a narrow center mark by retracing it with the largest eraser. */
export async function eraseTestLine(page: Page, language: Language = "en"): Promise<void> {
  const creation = strings.stickerCreation;
  await page
    .getByRole("button", { name: say(creation.tools.eraser, language), exact: true })
    .click();
  const size = page.getByRole("slider", { name: say(creation.sizeRail.eraser, language) });
  for (let press = 0; press < 25; press++) await size.press("ArrowUp");
  const box = await canvas(page, language).boundingBox();
  if (!box) throw new Error("The drawing sheet is not visible");
  await penStroke(page, await pencil(page), along(box, 0.5, 0.2, 0.8, 12), () => 0.5, 8);
  await page.evaluate(() => new Promise(requestAnimationFrame));
}

/** Reads the session's actual IndexedDB history without changing its drawing or progress. */
export async function readKeptHistory(page: Page): Promise<{
  steps: unknown[];
  count: unknown;
  frame: unknown;
  identity: unknown;
}> {
  const userId = await signedInUserId(page);
  return page.evaluate(async (name) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(name);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error(`Could not open ${name}`));
    });
    try {
      const transaction = db.transaction(["ops", "progress"], "readonly");
      const stepsRequest = transaction.objectStore("ops").getAll();
      const countRequest = transaction.objectStore("progress").get(0);
      const frameRequest = transaction.objectStore("progress").get(1);
      const identityRequest = transaction.objectStore("progress").get(2);
      return await new Promise<{
        steps: unknown[];
        count: unknown;
        frame: unknown;
        identity: unknown;
      }>((resolve, reject) => {
        transaction.oncomplete = () => {
          const steps: unknown = stepsRequest.result;
          if (!Array.isArray(steps)) {
            reject(new Error(`${name} returned no steps array`));
            return;
          }
          resolve({
            steps,
            count: countRequest.result as unknown,
            frame: frameRequest.result as unknown,
            identity: identityRequest.result as unknown,
          });
        };
        transaction.onabort = () =>
          reject(transaction.error ?? new Error(`${name} history read aborted`));
        transaction.onerror = () =>
          reject(transaction.error ?? new Error(`${name} history read failed`));
      });
    } finally {
      db.close();
    }
  }, `drawing-session.${userId}`);
}
