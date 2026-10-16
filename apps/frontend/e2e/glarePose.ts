import type { Locator, Page } from "@playwright/test";
import type { DevicePose } from "../src/stickers/lightMode";
import type { Reading } from "./deviceRotation";

/** A point on screen, in CSS px from the visual viewport's center, y down. */
export interface ScreenPoint {
  x: number;
  y: number;
}

/**
 * A point of the ceiling light, in its radii along its plane's across (level, the viewer's right) and
 * down axes: its middle at 0, 0, and its rim where across² + down² is 1.
 */
export interface LightPoint {
  across: number;
  down: number;
}

const MIDDLE: LightPoint = { across: 0, down: 0 };
/** The ceiling light's rim on the viewer's right, level with its middle. */
export const RIGHT_RIM: LightPoint = { across: 1, down: 0 };

/**
 * Where `at` of the ceiling light (`light` is ROOM.light) mirrors on a flat screen in a room frame
 * (sharedRoom.ts): the eye's place plus the point's direction, scaled to reach the screen. The rim is where the
 * shader's disc ends, its down foreshortened by the light's aspect. Null behind the screen. Pure, so
 * the page imports it too.
 */
export function mirrored(
  frame: Record<"eye" | "light" | "across" | "down", readonly number[]>,
  light: { radius: number; aspect: number },
  at: LightPoint,
): ScreenPoint | null {
  const { eye, across, down } = frame;
  const d = frame.light.map(
    (l, i) => l + light.radius * (at.across * across[i] + light.aspect * at.down * down[i]),
  );
  if (d[2] <= 0) return null;
  return { x: eye[0] + (d[0] * eye[2]) / d[2], y: eye[1] + (d[1] * eye[2]) / d[2] };
}

/**
 * In the page, so the room and viewer are its own device class's: the reading, at `rest`'s heading,
 * that puts `at` of the ceiling light's glare, its middle unless given, at `target`, with the viewer
 * centered on `rest`, the first reading. Solved by Newton's method on beta and gamma.
 */
export const glareReading = (
  page: Page,
  rest: Reading,
  screenAngle: number,
  target: ScreenPoint = { x: 0, y: 0 },
  at: LightPoint = MIDDLE,
): Promise<Reading> =>
  page.evaluate(
    async ({ rest, screenAngle, target, at }) => {
      const { roomFrame, ROOM } = await import("../src/stickers/sharedRoom.ts");
      const { attitudeOf, inverse, multiply } = await import("../src/stickers/lightMode.ts");
      const { mirrored } = await import("./glarePose.ts");
      const restAttitude = attitudeOf(rest.alpha, rest.beta, rest.gamma);
      const missBy = (beta: number, gamma: number) => {
        const turn = multiply(inverse(attitudeOf(rest.alpha, beta, gamma)), restAttitude);
        const point = mirrored(roomFrame({ beta, gamma, screenAngle, turn }), ROOM.light, at);
        if (!point) throw new Error(`The light is behind the screen at β ${beta}, γ ${gamma}`);
        return [point.x - target.x, point.y - target.y];
      };
      const step = 0.01;
      let { beta, gamma } = rest;
      for (let i = 0; i < 20; i++) {
        const [x, y] = missBy(beta, gamma);
        if (Math.hypot(x, y) < 0.5) return { alpha: rest.alpha, beta, gamma };
        const [bx, by] = missBy(beta + step, gamma);
        const [gx, gy] = missBy(beta, gamma + step);
        const [xb, xg, yb, yg] = [
          (bx - x) / step,
          (gx - x) / step,
          (by - y) / step,
          (gy - y) / step,
        ];
        const det = xb * yg - xg * yb;
        beta -= (yg * x - xg * y) / det;
        gamma -= (xb * y - yb * x) / det;
      }
      throw new Error(
        `No reading near ${JSON.stringify(rest)} puts the glare's ${JSON.stringify(at)} at ${JSON.stringify(target)}`,
      );
    },
    { rest, screenAngle, target, at },
  );

/** In the page: where `at` of the ceiling light's glare shows at a published pose. */
export const glarePoint = (page: Page, pose: DevicePose, at: LightPoint = MIDDLE) =>
  page.evaluate(
    async ({ pose, at }) => {
      const { roomFrame, ROOM } = await import("../src/stickers/sharedRoom.ts");
      const { mirrored } = await import("./glarePose.ts");
      const point = mirrored(roomFrame(pose), ROOM.light, at);
      if (!point) throw new Error(`The light is behind the screen at ${JSON.stringify(pose)}`);
      return point;
    },
    { pose, at },
  );

/** Where an element's middle shows, as the renderer places a sticker: from the visual viewport's center. */
export const screenPointOf = (element: Locator): Promise<ScreenPoint> =>
  element.evaluate((el) => {
    const box = el.getBoundingClientRect();
    const viewport = visualViewport;
    return {
      x:
        (box.left + box.right) / 2 -
        (viewport ? viewport.offsetLeft + viewport.width / 2 : innerWidth / 2),
      y:
        (box.top + box.bottom) / 2 -
        (viewport ? viewport.offsetTop + viewport.height / 2 : innerHeight / 2),
    };
  });
