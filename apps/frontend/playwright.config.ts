import { fileURLToPath } from "node:url";
import { defineConfig } from "@playwright/test";
import { E2E_DATA_DIR, E2E_DATABASE } from "./e2e/dataDir.ts";
import { phone } from "./e2e/phone.ts";
import { E2E_API_PORT, E2E_APP_PORT } from "./e2e/ports.ts";

const appOrigin = `http://localhost:${E2E_APP_PORT}`;
const braveExecutable = process.env.BRAVE_EXECUTABLE_PATH;

export default defineConfig({
  testDir: "e2e",
  testMatch: "**/*.e2e.ts",
  outputDir:
    process.env.E2E_RESULTS_DIR ??
    fileURLToPath(new URL("../../data/e2e-results", import.meta.url)),
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
    // Blink's forced darkening is a Chromium capability; WebKit does not collect that case.
    {
      name: "webkit",
      testIgnore: "**/forcedDark.e2e.ts",
      use: { ...phone, browserName: "webkit" },
    },
    // An installed Brave can exercise its normal privacy protections without changing the defaults.
    ...(braveExecutable
      ? [
          {
            name: "brave",
            use: {
              ...phone,
              browserName: "chromium" as const,
              launchOptions: { executablePath: braveExecutable },
            },
          },
        ]
      : []),
  ],
  // Each server is exec'd rather than run through pnpm, whose children leave Playwright's process
  // group and outlive the run.
  webServer: [
    {
      // The API as its dev script runs it, minus a developer's private .env, on a database and image
      // folder wiped first, with LIFF Mock's dev ID tokens trusted and nothing sent to Sui.
      command: "exec node --env-file=.env.example ../frontend/e2e/startApi.ts",
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
        E2E_DATA_DIR,
        PERSON_SWITCHING_MODE: "live",
        PERSON_SWITCH_OPERATOR_USER_ID: "d5984df6-db28-44f2-801c-2f2f5b565463",
        PERSON_SWITCH_HANA_USER_ID: "bef03287-50ee-4e51-aaef-a9dc1303b854",
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
