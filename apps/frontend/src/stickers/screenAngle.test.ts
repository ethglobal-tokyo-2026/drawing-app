import { describe, expect, it } from "vitest";
import { screenAngleFrom, type ScreenAngleFacts } from "./screenAngle";

/** The usual reading pose: held upright enough that the screen's top is the higher edge. */
const BETA = 55;

/** Readings from iOS 27 Simulator's Safari, turned with devicectl. */
const IPAD_DESKTOP_MODE = [
  {
    portrait: true,
    orientationType: "portrait-primary",
    orientationAngle: 90,
    windowOrientation: 0,
  },
  {
    portrait: false,
    orientationType: "landscape-primary",
    orientationAngle: 0,
    windowOrientation: 90,
  },
  {
    portrait: true,
    orientationType: "portrait-secondary",
    orientationAngle: 270,
    windowOrientation: 180,
  },
];
const IPHONE = [
  {
    portrait: true,
    orientationType: "portrait-primary",
    orientationAngle: 0,
    windowOrientation: 0,
  },
  {
    portrait: false,
    orientationType: "landscape-secondary",
    orientationAngle: 270,
    windowOrientation: -90,
  },
];

const apple = (reading: Omit<ScreenAngleFacts, "appleMobile">): ScreenAngleFacts => ({
  appleMobile: true,
  ...reading,
});
/** The same turn, as `upOnScreen` reads it. */
const turn = (degrees: number) => ((degrees % 360) + 360) % 360;

describe("screenAngleFrom", () => {
  it("reads iOS and iPadOS by window.orientation, whatever the screen calls natural", () => {
    for (const reading of [...IPAD_DESKTOP_MODE, ...IPHONE])
      expect(screenAngleFrom(apple(reading), BETA, 0)).toBe(reading.windowOrientation);
  });

  it("reads the orientation type in portrait's axes where window.orientation is gone", () => {
    for (const { windowOrientation, ...reading } of [...IPAD_DESKTOP_MODE, ...IPHONE])
      expect(
        turn(screenAngleFrom(apple({ ...reading, windowOrientation: undefined }), BETA, 0)),
      ).toBe(turn(windowOrientation));
  });

  it("takes the page's shape over a type that contradicts it, and the higher edge for which way", () => {
    // A portrait page whose screen API follows the iPad's tilt instead of its turn.
    const tilted = apple({
      portrait: true,
      orientationType: "landscape-primary",
      orientationAngle: 0,
      windowOrientation: undefined,
    });
    expect(screenAngleFrom(tilted, BETA, 0)).toBe(0);
    expect(screenAngleFrom(tilted, -BETA, 0)).toBe(180);
    const sideways = { ...tilted, portrait: false, orientationType: "portrait-primary" };
    expect(screenAngleFrom(sideways, 10, -60)).toBe(90);
    expect(screenAngleFrom(sideways, 10, 60)).toBe(-90);
  });

  it("keeps Android's angle, whose natural orientation its sensors share", () => {
    const tablet = {
      appleMobile: false,
      portrait: false,
      orientationType: "landscape-primary",
      orientationAngle: 0,
      windowOrientation: 0,
    };
    expect(screenAngleFrom(tablet, BETA, 0)).toBe(0);
    expect(
      screenAngleFrom({ ...tablet, orientationAngle: undefined, windowOrientation: 90 }, BETA, 0),
    ).toBe(90);
  });
});
