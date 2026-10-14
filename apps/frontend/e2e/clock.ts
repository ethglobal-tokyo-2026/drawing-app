import type { Page } from "@playwright/test";

/**
 * Installs the page's clock and pauses it at `time`, so only the test's runFor moves it after. pauseAt
 * alone refuses a time the page's running clock has passed, and how far it has run by the time pauseAt
 * arrives is up to the machine's load; fixing Date first holds the page's time at exactly `time`.
 */
export async function pauseClock(page: Page, time = new Date()) {
  await page.clock.install({ time });
  await page.clock.setFixedTime(time);
  await page.clock.pauseAt(time);
  // Lets Date follow runFor again; the clock stays paused.
  await page.clock.setSystemTime(time);
}
