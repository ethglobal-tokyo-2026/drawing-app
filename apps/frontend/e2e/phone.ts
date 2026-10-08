import type { BrowserContextOptions } from "@playwright/test";

/** A phone the size of an iPhone 13, held in portrait: the screen Croquis is designed for. */
export const phone = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 3,
  isMobile: true,
  hasTouch: true,
  locale: "en-US",
} satisfies BrowserContextOptions;
