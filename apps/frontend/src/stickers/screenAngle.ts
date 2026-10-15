import { isAppleMobile } from "../ui/deviceForLight";

/** What the browser says about how the screen is turned. */
export interface ScreenAngleFacts {
  /** iOS or iPadOS, whose motion sensors are in portrait's axes whatever the screen calls natural. */
  appleMobile: boolean;
  /** The page is laid out taller than wide. */
  portrait: boolean;
  /** `window.orientation`, where the browser still has it. */
  windowOrientation: unknown;
  orientationType: string | undefined;
  orientationAngle: number | undefined;
}

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** An orientation type's turn from portrait, which is the same on every device. */
function typeAngle(type: string | undefined): number | undefined {
  if (type === "portrait-primary") return 0;
  if (type === "landscape-primary") return 90;
  if (type === "portrait-secondary") return 180;
  if (type === "landscape-secondary") return -90;
  return undefined;
}

/**
 * The angle, in degrees, from DeviceOrientation's axes to the screen's, for a reading of `beta` and
 * `gamma`. Android's sensors and its screen angle share the device's natural orientation. On Apple
 * devices the angle disagrees with the sensors, which stay in portrait's axes: iPadOS calls landscape
 * natural, and iOS turns the angle the other way. There `window.orientation` names the turn, else the
 * orientation type where the page's shape agrees.
 */
export function screenAngleFrom(facts: ScreenAngleFacts, beta: number, gamma: number): number {
  const legacy = facts.windowOrientation;
  if (!facts.appleMobile) {
    if (finite(facts.orientationAngle)) return facts.orientationAngle;
    return finite(legacy) ? legacy : 0;
  }
  if (finite(legacy)) return legacy;
  const typed = typeAngle(facts.orientationType);
  if (typed !== undefined && (Math.abs(typed) === 90) !== facts.portrait) return typed;
  // Nothing names the turn: the page's shape gives portrait or landscape, the higher edge which way.
  const b = (beta * Math.PI) / 180,
    g = (gamma * Math.PI) / 180;
  if (facts.portrait) return Math.sin(b) < 0 ? 180 : 0;
  return -Math.cos(b) * Math.sin(g) < 0 ? -90 : 90;
}

/** The screen angle to read a DeviceOrientation event of `beta` and `gamma` at. */
export function screenAngleOf(win: typeof window, beta: number, gamma: number): number {
  return screenAngleFrom(
    {
      appleMobile: isAppleMobile(win.navigator),
      portrait: win.matchMedia("(orientation: portrait)").matches,
      windowOrientation: Reflect.get(win, "orientation"),
      orientationType: win.screen.orientation?.type,
      orientationAngle: win.screen.orientation?.angle,
    },
    beta,
    gamma,
  );
}
