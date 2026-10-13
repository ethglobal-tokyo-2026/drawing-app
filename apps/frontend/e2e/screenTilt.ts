import type { Page } from "@playwright/test";

/** Shares an upright screen's tilt as device gravity at the browser's actual screen angle. */
export async function tiltScreen(page: Page, beta: number, gamma: number) {
  await page.evaluate(
    ({ beta, gamma }) => {
      const radians = Math.PI / 180;
      const reportedAngle = screen.orientation?.angle ?? Reflect.get(window, "orientation");
      const angle =
        typeof reportedAngle === "number" && Number.isFinite(reportedAngle)
          ? reportedAngle * radians
          : 0;
      const across = Math.cos(beta * radians) * Math.sin(gamma * radians);
      const up = Math.sin(beta * radians);
      // Turn the intended displayed gravity back into the device's sensor coordinates.
      const gx = across * Math.cos(angle) - up * Math.sin(angle);
      const gy = across * Math.sin(angle) + up * Math.cos(angle);
      const clamp = (value: number) => Math.max(-1, Math.min(1, value));
      const deviceBeta = Math.asin(clamp(gy));
      const deviceGamma = Math.asin(clamp(gx / Math.cos(deviceBeta)));
      window.dispatchEvent(
        Object.assign(new Event("deviceorientation"), {
          beta: deviceBeta / radians,
          gamma: deviceGamma / radians,
        }),
      );
    },
    { beta, gamma },
  );
}
