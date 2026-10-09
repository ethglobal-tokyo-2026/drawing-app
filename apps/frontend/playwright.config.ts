import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { E2E_DATA_DIR, E2E_DATABASE } from "./e2e/dataDir.ts";
import { phone } from "./e2e/phone.ts";
import { E2E_API_PORT, E2E_APP_PORT } from "./e2e/ports.ts";

const appOrigin = `http://localhost:${E2E_APP_PORT}`;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  outputDir: fileURLToPath(new URL("../../data/e2e-results", import.meta.url)),
  fullyParallel: true,
  // Each worker is a phone browser beside one API and one Vite server on a shared Mac; more than this
  // starves them, and E2E_WORKERS raises it on a quiet machine.
  workers: Number(process.env.E2E_WORKERS ?? 4),
  forbidOnly: true,
  reporter: "list",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL: appOrigin,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...phone, browserName: "chromium" } },
    // Off unless E2E_WEBKIT=on: WebKit can't open pages on this Mac yet.
    ...(process.env.E2E_WEBKIT === "on"
      ? [{ name: "webkit", use: { ...phone, browserName: "webkit" as const } }]
      : []),
  ],
  // Each server is exec'd rather than run through pnpm, whose children leave Playwright's process
  // group and outlive the run.
  webServer: [
    {
      // The API as its dev script runs it, minus a developer's private .env, on a database and image
      // folder wiped first, with LIFF Mock's dev ID tokens trusted and nothing sent to Sui.
      command: `rm -rf "${E2E_DATA_DIR}" && mkdir -p "${E2E_DATA_DIR}/images" && exec node --env-file=.env.example src/server.ts`,
      cwd: fileURLToPath(new URL("../api", import.meta.url)),
      url: `http://127.0.0.1:${E2E_API_PORT}/api/me`,
      reuseExistingServer: false,
      env: {
        PORT: String(E2E_API_PORT),
        DATABASE_URL: E2E_DATABASE,
        IMAGE_DIR: `${E2E_DATA_DIR}/images`,
        IMAGE_BASE_URL: `${appOrigin}/api/images`,
        DEV_SIGN_IN: "on",
        STICKER_CHAIN_MODE: "mock",
      },
    },
    {
      command: "exec node_modules/.bin/vite --config e2e/vite.config.ts",
      url: appOrigin,
      reuseExistingServer: false,
      env: { VITE_LIFF_MOCK: "on" },
    },
  ],
});
