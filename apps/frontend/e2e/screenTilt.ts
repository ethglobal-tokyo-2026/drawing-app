import { expect, type Page } from "@playwright/test";

/** The laminate fixture's tilts mean a portrait screen, which WebKit reports turned; a turned screen turns the room. */
export const holdPortrait = (page: Page) =>
  page.addInitScript(() => {
    if (typeof ScreenOrientation === "function")
      Object.defineProperty(ScreenOrientation.prototype, "angle", {
        get: () => 0,
        configurable: true,
      });
  });

/**
 * On the laminate fixture: the light glides to the device's absolute pose and comes to rest on the
 * reading, within the light's half-degree tremor step. A pause, such as a remounted sticker letting go
 * of the light, drops an unfinished glide, so each look delivers the reading again, as a real sensor
 * keeps doing.
 */
export const expectLanded = async (page: Page, [beta, gamma]: number[]) => {
  let previous = "";
  await expect
    .poll(async () => {
      const pose = await page.evaluate(
        ([beta, gamma]) => {
          window.laminateFixture.tilt(beta, gamma);
          return window.laminateFixture.getPose();
        },
        [beta, gamma],
      );
      const now = JSON.stringify(pose);
      const resting = now === previous;
      previous = now;
      return (
        resting &&
        Math.abs(pose.beta - beta) < 0.5 &&
        Math.abs(pose.gamma - gamma) < 0.5 &&
        pose.screenAngle === 0
      );
    })
    .toBe(true);
};

/** Shares a complete rotation relative to a 40° held screen, in the displayed axes; returns the reading. */
export async function tiltScreen(page: Page, beta: number, gamma: number) {
  return page.evaluate(
    ({ beta, gamma }) => {
      const radians = Math.PI / 180;
      const reportedAngle = screen.orientation?.angle ?? Reflect.get(window, "orientation");
      const angle =
        typeof reportedAngle === "number" && Number.isFinite(reportedAngle)
          ? reportedAngle * radians
          : 0;
      const rx = (a: number) => [
        1,
        0,
        0,
        0,
        Math.cos(a),
        -Math.sin(a),
        0,
        Math.sin(a),
        Math.cos(a),
      ];
      const ry = (a: number) => [
        Math.cos(a),
        0,
        Math.sin(a),
        0,
        1,
        0,
        -Math.sin(a),
        0,
        Math.cos(a),
      ];
      const rz = (a: number) => [
        Math.cos(a),
        -Math.sin(a),
        0,
        Math.sin(a),
        Math.cos(a),
        0,
        0,
        0,
        1,
      ];
      const multiply = (a: number[], b: number[]) =>
        Array.from({ length: 9 }, (_, i) => {
          const row = Math.floor(i / 3),
            column = i % 3;
          return (
            a[row * 3] * b[column] + a[row * 3 + 1] * b[column + 3] + a[row * 3 + 2] * b[column + 6]
          );
        });
      // R0 * Rz(-screen) * Rx(up) * Ry(across) * Rz(screen).
      const matrix = [
        rx(40 * radians),
        rz(-angle),
        rx((beta - 40) * radians),
        ry(gamma * radians),
        rz(angle),
      ].reduce(multiply);
      const clamp = (value: number) => Math.max(-1, Math.min(1, value));
      const reading = {
        alpha: Math.atan2(-matrix[1], matrix[4]) / radians,
        beta: Math.asin(clamp(matrix[7])) / radians,
        gamma: Math.atan2(-matrix[6], matrix[8]) / radians,
      };
      window.dispatchEvent(Object.assign(new Event("deviceorientation"), reading));
      return reading;
    },
    { beta, gamma },
  );
}
