import type { Page } from "@playwright/test";

/** A rotation from the device's axes to the earth's, row-major 3×3. */
export type Rotation = readonly number[];

const RAD = Math.PI / 180;

/** Turns by `degrees` about x, y or z, right-handed. */
export const about = {
  x: (degrees: number): Rotation => {
    const c = Math.cos(degrees * RAD),
      s = Math.sin(degrees * RAD);
    return [1, 0, 0, 0, c, -s, 0, s, c];
  },
  y: (degrees: number): Rotation => {
    const c = Math.cos(degrees * RAD),
      s = Math.sin(degrees * RAD);
    return [c, 0, s, 0, 1, 0, -s, 0, c];
  },
  z: (degrees: number): Rotation => {
    const c = Math.cos(degrees * RAD),
      s = Math.sin(degrees * RAD);
    return [c, -s, 0, s, c, 0, 0, 0, 1];
  },
};

/** Rotations applied right to left: a later one turns about the device's own axes. */
export const compose = (...rotations: Rotation[]): Rotation =>
  rotations.reduce((a, b) =>
    Array.from({ length: 9 }, (_, i) => {
      const row = Math.floor(i / 3),
        column = i % 3;
      return (
        a[row * 3] * b[column] + a[row * 3 + 1] * b[column + 3] + a[row * 3 + 2] * b[column + 6]
      );
    }),
  );

/**
 * The DeviceOrientation angles for a rotation, R = Rz(α)·Rx(β)·Ry(γ) (W3C), on the branch with β
 * within ±90°, which covers every pose held in front of a face.
 */
function orientationAngles(r: Rotation) {
  const alpha = Math.atan2(-r[1], r[4]) / RAD;
  return {
    alpha: (alpha + 360) % 360,
    beta: Math.asin(Math.max(-1, Math.min(1, r[7]))) / RAD,
    gamma: Math.atan2(-r[6], r[8]) / RAD,
  };
}

/** Sends the reading a device held at this rotation gives. */
export async function sendReading(page: Page, rotation: Rotation) {
  await page.evaluate((angles) => {
    window.dispatchEvent(Object.assign(new Event("deviceorientation"), angles));
  }, orientationAngles(rotation));
}
