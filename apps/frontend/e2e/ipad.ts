import type { BrowserContextOptions } from "@playwright/test";

/** An 11-inch iPad's page in Safari, held upright: a large screen (src/ui/largeScreen.ts). */
export const ipad = {
  viewport: { width: 820, height: 1094 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale: "en-US",
} satisfies BrowserContextOptions;
