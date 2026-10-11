// Retain with the review until the iPad Safari reload check distinguishes resuming from signing in.
import { expect, test } from "../../../../apps/frontend/node_modules/@playwright/test/index.mjs";
import { signIn } from "../../../../apps/frontend/e2e/helpers.ts";
import { strings } from "../../../../apps/frontend/src/i18n/strings/index.ts";

test("the Safari reload assertion also passes after the session cookie is lost", async ({
  page,
  context,
}) => {
  await signIn(page, "review-cookie", "en");
  expect((await context.cookies()).some((cookie) => cookie.name === "session")).toBe(true);
  let signIns = 0;
  page.on("request", (request) => {
    if (request.method() === "POST" && new URL(request.url()).pathname === "/api/session")
      signIns++;
  });
  await context.clearCookies();
  expect((await context.cookies()).some((cookie) => cookie.name === "session")).toBe(false);
  await page.reload();
  // The same observable condition as ipadSafari.ts: wait for the board, then read /api/me.
  await expect(
    page.getByRole("region", { name: strings.stickerBoard.board.label.en }),
  ).toBeVisible();
  const status = await page.evaluate(async () => (await fetch("/api/me")).status);
  expect(status).toBe(200);
  expect(signIns).toBe(1);
  console.log(`Removed session cookie: reload check returned ${status}; new sign-ins: ${signIns}`);
});
