import { defineConfig } from "@playwright/test";
import { platform } from "node:process";
import original from "./playwright.config.ts";

/** Use installed Chrome and native presentation instead of the default software GPU test path. */
export default defineConfig({
  ...original,
  workers: 1,
  // DOM snapshots and continuous trace screenshots distort first-interaction timing.
  // The drag fixture offers an explicit Chrome timeline capture when attribution is needed.
  use: { ...original.use, headless: false, trace: "off" },
  projects: original.projects?.map((project) =>
    project.name === "chromium"
      ? {
          ...project,
          name: "chrome",
          use: {
            ...project.use,
            channel: "chrome",
            launchOptions: {
              args:
                platform === "darwin" ? ["--use-angle=metal", "--enable-gpu"] : ["--enable-gpu"],
            },
          },
        }
      : project,
  ),
});
