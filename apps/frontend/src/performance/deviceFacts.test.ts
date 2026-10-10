import { describe, expect, it, onTestFinished } from "vitest";
import { i18next } from "../i18n/i18n";
import { deviceFactRows, formatDeviceDetails, type DeviceFacts } from "./deviceFacts";

/** Safari on an 11-inch iPad Air in landscape with a Pencil paired, as WebKit's source answers. */
const ipadInSafari: DeviceFacts = {
  userAgent:
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko)",
  platform: "MacIntel",
  touchPoints: 5,
  viewport: { width: 1180, height: 760 },
  visualViewport: { width: 1180, height: 459.5, left: 0, top: 0, scale: 1 },
  screen: { width: 1180, height: 820, orientation: "landscape-primary" },
  pixelRatio: 2,
  safeArea: { top: 0, right: 0, bottom: 20, left: 0 },
  media: [
    { feature: "hover", matches: ["none"] },
    { feature: "any-hover", matches: ["none"] },
    { feature: "pointer", matches: ["coarse"] },
    { feature: "any-pointer", matches: ["fine", "coarse"] },
  ],
};
const large = true;

const label = {
  userAgent: i18next.t(($) => $.stickerBoard.developer.device.userAgent.label),
  platform: i18next.t(($) => $.stickerBoard.developer.device.platform.label),
  viewport: i18next.t(($) => $.stickerBoard.developer.device.viewport.label),
  screen: i18next.t(($) => $.stickerBoard.developer.device.screen.label),
  safeAreas: i18next.t(($) => $.stickerBoard.developer.device.safeAreas.label),
  media: i18next.t(($) => $.stickerBoard.developer.device.media.label),
  largeScreen: i18next.t(($) => $.stickerBoard.developer.device.largeScreen.label),
};
const FIVE_TOUCH_POINTS = i18next.t(($) => $.stickerBoard.developer.device.platform.touchPoints, {
  touchPoints: 5,
});
const AT_PIXEL_RATIO = i18next.t(($) => $.stickerBoard.developer.device.screen.pixelRatio, {
  pixelRatio: "2x",
});

describe("the device's facts", () => {
  it("read as a row a fact, with whether the app lays out for a large screen last", () => {
    expect(deviceFactRows(ipadInSafari, large)).toEqual([
      [label.userAgent, ipadInSafari.userAgent],
      [label.platform, `MacIntel · ${FIVE_TOUCH_POINTS}`],
      [
        label.viewport,
        `1180×760 · ${i18next.t(($) => $.stickerBoard.developer.device.viewport.visual, {
          size: "1180×460",
          offset: "0,0",
          scale: 1,
        })}`,
      ],
      [label.screen, `1180×820 ${AT_PIXEL_RATIO} landscape-primary`],
      [label.safeAreas, "top 0 · right 0 · bottom 20 · left 0"],
      [label.media, "hover none · any-hover none · pointer coarse · any-pointer fine coarse"],
      [label.largeScreen, i18next.t(($) => $.stickerBoard.developer.device.largeScreen.yes)],
    ]);
  });

  it("say what a browser leaves out", () => {
    const bare: DeviceFacts = {
      ...ipadInSafari,
      platform: "",
      visualViewport: null,
      screen: { width: 1180, height: 820, orientation: null },
      media: [{ feature: "any-pointer", matches: [] }],
    };
    const rows = new Map(deviceFactRows(bare, large));
    expect(rows.get(label.platform)).toBe(
      `${i18next.t(($) => $.stickerBoard.developer.device.platform.none)} · ${FIVE_TOUCH_POINTS}`,
    );
    expect(rows.get(label.viewport)).toBe(
      `1180×760 · ${i18next.t(($) => $.stickerBoard.developer.device.viewport.noVisual)}`,
    );
    expect(rows.get(label.screen)).toBe(`1180×820 ${AT_PIXEL_RATIO}`);
    expect(rows.get(label.media)).toBe(
      `any-pointer ${i18next.t(($) => $.stickerBoard.developer.device.media.nothing)}`,
    );
  });

  it("stay English while the app is in Japanese, so a report reads the same", async () => {
    const takenAt = new Date(0);
    const english = formatDeviceDetails(ipadInSafari, large, takenAt);
    await i18next.changeLanguage("ja");
    onTestFinished(async () => {
      await i18next.changeLanguage("en");
    });
    expect(formatDeviceDetails(ipadInSafari, large, takenAt)).toBe(english);
  });
});
