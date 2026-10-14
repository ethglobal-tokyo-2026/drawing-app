import { expect, test } from "@playwright/test";

test("concealing artwork immediately discards its old laminate even when replacement loading fails", async ({
  page,
}) => {
  await page.goto("/e2e/stickerLaminate.html?conceal=1");
  const coat = page.locator("[data-conceal] canvas.sticker-material");
  await expect(coat).toHaveAttribute("data-state", "ready");
  let release: () => void = () => {};
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  let heard: () => void = () => {};
  const request = new Promise<void>((resolve) => {
    heard = resolve;
  });
  await page.route("**/concealed-print.svg", async (route) => {
    heard();
    await held;
    await route.fulfill({ status: 503, body: "Concealed print temporarily unavailable" });
  });
  try {
    await page.evaluate(() =>
      window.laminateFixture.update({ print: "/concealed-print.svg", veiled: true }),
    );
    await request;
    await expect(
      coat,
      "A veiled sticker must never retain its previous unblurred material",
    ).toHaveAttribute("data-state", "loading");
    await expect(coat).toHaveCSS("visibility", "hidden");
  } finally {
    release();
  }
  await expect(coat).toHaveAttribute("data-state", "failed");
  await expect(coat).toHaveCSS("visibility", "hidden");
});
