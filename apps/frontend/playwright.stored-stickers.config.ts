import { defineConfig } from "@playwright/test";
import original from "./playwright.config.ts";

/**
 * Keeps the stored stickers e2e/storedStickers.ts seals: draws and seals each one through the drawing
 * screen in Chromium, and keeps the form it sent to POST /api/stickers in e2e/storedStickers/<name>/,
 * in place of the one kept before. Rerun it whenever the seal form changes, what the drawing screen
 * sends or what apps/api/src/stickers/sealForm.ts takes, and commit the folders with that change:
 * `pnpm --filter frontend e2e:stored-stickers`. A new drawing starts in a random color and its strokes'
 * timings vary, so every capture changes every folder: `--grep <name>` captures a new sticker alone.
 */
export default defineConfig({
  ...original,
  testMatch: "**/storedStickers.capture.ts",
  projects: original.projects?.filter(({ name }) => name === "chromium"),
});
