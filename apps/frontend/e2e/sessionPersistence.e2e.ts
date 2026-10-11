import { expect } from "@playwright/test";
import { strings } from "../src/i18n/strings/index.ts";
import { drawKey, signIn, signedInUserId, tapKey, test } from "./helpers.ts";
import { assertSessionPersisted } from "./sessionPersistence.ts";

const board = strings.stickerBoard.board.label.en;

type Snapshot = { cookie: string; created: number };

async function snapshot(page: Parameters<typeof signIn>[0]): Promise<Snapshot> {
  const cookies = await page.context().cookies();
  const cookie = cookies.find((entry) => entry.name === "session");
  const response = await page.request.get("/__e2e/session-requests");
  expect(response.ok()).toBe(true);
  const body: unknown = await response.json();
  if (typeof body !== "object" || body === null || !("created" in body)) {
    throw new Error("The session probe returned no count");
  }
  const created = body.created;
  if (typeof created !== "number") throw new Error("The session probe returned an invalid count");
  return { cookie: cookie?.value ?? "", created };
}

async function startProbe(page: Parameters<typeof signIn>[0]) {
  const response = await page.request.post("/__e2e/session-probe");
  expect(response.ok()).toBe(true);
}

async function releaseProbe(page: Parameters<typeof signIn>[0]) {
  const response = await page.request.delete("/__e2e/session-probe");
  expect(response.ok()).toBe(true);
}

test("reload retains the HttpOnly session cookie without creating another session", async ({
  page,
}) => {
  await startProbe(page);
  try {
    await signIn(page, "persistent-session", "en");
    const before = await snapshot(page);
    expect(before.created).toBeGreaterThan(0);
    expect(before.cookie.length).toBeGreaterThan(0);
    expect(
      (await page.context().cookies()).find((cookie) => cookie.name === "session")?.httpOnly,
    ).toBe(true);

    await page.reload();
    await expect(page.getByRole("region", { name: board })).toBeVisible();
    const after = await snapshot(page);
    const meStatus = await page.evaluate(async () => (await fetch("/api/me")).status);
    assertSessionPersisted(before, { ...after, meStatus });
  } finally {
    await releaseProbe(page);
  }
});

test("reloading without the session cookie bootstraps a new session despite a restored board", async ({
  page,
}) => {
  await startProbe(page);
  try {
    await signIn(page, "lost-session", "en");
    const before = await snapshot(page);
    expect(before.cookie.length).toBeGreaterThan(0);
    await page.context().clearCookies({ name: "session" });
    expect((await page.context().cookies()).some((cookie) => cookie.name === "session")).toBe(
      false,
    );
    expect(
      (await page.context().cookies()).some((cookie) => cookie.name === "e2e_session_probe"),
    ).toBe(true);

    await page.reload();
    await expect(page.getByRole("region", { name: board })).toBeVisible();
    const after = await snapshot(page);
    const meStatus = await page.evaluate(async () => (await fetch("/api/me")).status);
    expect(meStatus).toBe(200);
    expect(after.created).toBeGreaterThan(before.created);
    expect(() => assertSessionPersisted(before, { ...after, meStatus })).toThrow(
      /reauthentication/,
    );
  } finally {
    await releaseProbe(page);
  }
});

test("another browser creating a session does not change this browser's probe", async ({
  page,
  friend,
}) => {
  await startProbe(page);
  try {
    await signIn(page, "probe-owner", "en");
    const before = await snapshot(page);
    await signIn(friend, "separate-browser", "en");
    const after = await snapshot(page);
    expect(after.created).toBe(before.created);
  } finally {
    await releaseProbe(page);
  }
});

test("post-ready expiry waits for Reload and preserves another tab's newer session", async ({
  page,
}) => {
  await startProbe(page);
  const otherTab = await page.context().newPage();
  try {
    await signIn(page, "expired-alice", "en");
    const before = await snapshot(page);
    const requests: string[] = [];
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path === "/api/me" || path === "/api/session") requests.push(path);
    });
    await page.context().clearCookies({ name: "session" });
    const refused = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/tickets/spend" && response.status() === 401,
    );
    await tapKey(drawKey(page, "en"));
    await refused;
    const reload = page.getByRole("button", { name: strings.api.signIn.reload.en, exact: true });
    await expect(reload).toBeVisible();
    await expect(page.getByRole("region", { name: board })).toHaveCount(0);
    expect((await snapshot(page)).created).toBe(before.created);
    expect(requests).toEqual([]);

    await signIn(otherTab, "newer-bob", "en");
    const bobId = await signedInUserId(otherTab);
    const bob = await snapshot(page);
    await expect(reload).toBeVisible();
    expect(await signedInUserId(otherTab)).toBe(bobId);
    const unchanged = await snapshot(page);
    // Compare as a boolean so failure diagnostics never print session cookies.
    expect(unchanged.cookie === bob.cookie).toBe(true);
    expect(unchanged.created).toBe(bob.created);
    expect(requests).toEqual([]);
    await Promise.all([page.waitForEvent("load"), reload.click()]);
    await expect(page.getByRole("region", { name: board })).toBeVisible();
    const after = await snapshot(page);
    expect(after.created).toBe(bob.created + 1);
    expect(await signedInUserId(page)).not.toBe(bobId);
  } finally {
    await otherTab.close();
    await releaseProbe(page);
  }
});
