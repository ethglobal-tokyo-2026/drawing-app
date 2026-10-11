// Dedicated database and output keep this review reproduction separate from ordinary E2E runs.
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "../../../../apps/frontend/node_modules/@playwright/test/index.mjs";
import base from "../../../../apps/frontend/playwright.config.ts";
import { E2E_DATA_DIR } from "../../../../apps/frontend/e2e/dataDir.ts";

const data = mkdtempSync(join(tmpdir(), "croquis-review-session-"));
const servers = Array.isArray(base.webServer) ? base.webServer : [];
export default defineConfig({
  ...base,
  testDir: fileURLToPath(new URL(".", import.meta.url)),
  testMatch: "root-test-session.e2e.mts",
  outputDir: join(data, "results"),
  workers: 1,
  webServer: servers.map((server, index) =>
    index === 0
      ? {
          ...server,
          command: server.command.replaceAll(E2E_DATA_DIR, data),
          env: {
            ...server.env,
            DATABASE_URL: join(data, "drawing-app.db"),
            IMAGE_DIR: join(data, "images"),
          },
        }
      : { ...server, cwd: fileURLToPath(new URL("../../../../apps/frontend/", import.meta.url)) },
  ),
});
