import { defineConfig } from "@playwright/test";
import { platform } from "node:process";
import original from "./playwright.config.ts";

/** Use installed Chrome and native presentation instead of the default software GPU test path. */
export default defineConfig({
  ...original,
  workers: 1,
  use: { ...original.use, headless: false },
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
