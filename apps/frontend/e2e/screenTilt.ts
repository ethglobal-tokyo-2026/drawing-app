import type { Page } from "@playwright/test";

/** Shares a complete rotation relative to a 40° held screen, in the displayed axes. */
export async function tiltScreen(page: Page, beta: number, gamma: number) {
  await page.evaluate(
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
      window.dispatchEvent(
        Object.assign(new Event("deviceorientation"), {
          alpha: Math.atan2(-matrix[1], matrix[4]) / radians,
          beta: Math.asin(clamp(matrix[7])) / radians,
          gamma: Math.atan2(-matrix[6], matrix[8]) / radians,
        }),
      );
    },
    { beta, gamma },
  );
}
