import { describe, expect, it } from "vitest";
import { deviceFactRows, type DeviceFacts } from "./deviceFacts";

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

describe("the device's facts", () => {
  it("read as a row a fact, with whether the app lays out for a large screen last", () => {
    expect(deviceFactRows(ipadInSafari, large)).toEqual([
      ["User agent", ipadInSafari.userAgent],
      ["Platform", "MacIntel · 5 touch points"],
      ["Viewport", "1180×760 · visual 1180×460 at 0,0, scale 1"],
      ["Screen", "1180×820 at 2x landscape-primary"],
      ["Safe areas", "top 0 · right 0 · bottom 20 · left 0"],
      ["Media", "hover none · any-hover none · pointer coarse · any-pointer fine coarse"],
      ["Large screen", "yes"],
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
    expect(rows.get("Platform")).toBe("none · 5 touch points");
    expect(rows.get("Viewport")).toBe("1180×760 · no visual viewport");
    expect(rows.get("Screen")).toBe("1180×820 at 2x");
    expect(rows.get("Media")).toBe("any-pointer nothing");
  });
});
