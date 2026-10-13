import { personSwitchSessions } from "@drawing-app/db";
import { insertUser } from "@drawing-app/db/testing";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { LineTokenInvalidError } from "../deps.ts";
import { SESSION_MAX_AGE_S } from "../session.ts";
import { createLineVerifier } from "../services/lineVerifier.ts";
import { createPrivyJwtService } from "../services/privyJwt.ts";
import { z } from "zod";
import { BIGWHEEL_ID, HANA_ID } from "../session/personSwitch.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { oneAtATime } from "../sui/oneAtATime.ts";

let test: TestApp;
let headers: Record<string, string>;
let logs: LogLines;
beforeEach(async () => {
  logs = captureLogLines();
  test = await createTestApp({
    personSwitch: { mode: "verify", operatorUserId: BIGWHEEL_ID, hanaUserId: HANA_ID },
  });
  insertUser(test.db, { id: BIGWHEEL_ID, lineUserId: "line-bigwheel" });
  insertUser(test.db, { id: HANA_ID, lineUserId: "dev-video-hana" });
  headers = await test.signInAs(BIGWHEEL_ID);
  test.deps.line = { verifyAccessToken: async () => ({ sub: "line-bigwheel", name: "BIGWHEEL" }) };
  test.deps.privyJwt = {
    issue: async (assertion) => ({
      jwt: "private-jwt",
      subject: assertion.selectedLineUserId,
      expiresAt: assertion.expiresAt,
    }),
  };
});
afterEach(() => {
  test.sqlite.close();
  vi.restoreAllMocks();
});
const issue = (body: unknown = { accessToken: "private-access-token" }, sent = headers) =>
  test.send("POST", "/api/session/privy-jwt", { headers: sent, body });
it("requires a session and current actor/version", async () => {
  expect((await issue(undefined, {})).status).toBe(401);
  expect((await issue(undefined, { Cookie: headers.Cookie })).status).toBe(409);
  expect((await issue()).status).toBe(200);
});
it("prevents caching of authentication and input refusals", async () => {
  for (const response of [
    await issue(undefined, {}),
    await issue(undefined, { Cookie: headers.Cookie }),
    await issue({ accessToken: "short" }),
  ]) {
    expect(response.headers.get("cache-control")).toBe("no-store");
  }
});
it.each(["subject", "lineUserId", "suiAddress", "selectedUserId"])(
  "rejects browser supplied %s",
  async (field) => {
    expect((await issue({ accessToken: "private-access-token", [field]: "forged" })).status).toBe(
      400,
    );
  },
);
it("checks LINE against the authenticated principal, including selected Hana in verify mode", async () => {
  test.deps.line = { verifyAccessToken: async () => ({ sub: "dev-video-hana", name: "Hana" }) };
  expect((await issue()).status).toBe(403);
  test.deps.line = { verifyAccessToken: async () => ({ sub: "line-bigwheel", name: "BIGWHEEL" }) };
  const response = await test.send("POST", "/api/session/person", {
    headers,
    body: { userId: HANA_ID },
  });
  const body = z.object({ selectionVersion: z.string() }).parse(await response.json());
  headers = {
    ...headers,
    "x-croquis-user-id": HANA_ID,
    "x-croquis-selection-version": body.selectionVersion,
  };
  const result = await issue();
  expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({ subject: "dev-video-hana" });
});
it.each(["LINE", "issuer"])("rechecks same-account versions after %s", async (stage) => {
  await test.send("POST", "/api/session/person", { headers, body: { userId: BIGWHEEL_ID } });
  const row = test.db.select().from(personSwitchSessions).get();
  if (!row) throw new Error("Selection missing");
  headers["x-croquis-selection-version"] = row.selectionVersion;
  const change = () =>
    test.db.update(personSwitchSessions).set({ selectionVersion: "new-version" }).run();
  if (stage === "LINE")
    test.deps.line = {
      verifyAccessToken: async () => {
        change();
        return { sub: "line-bigwheel", name: "BIGWHEEL" };
      },
    };
  else
    test.deps.privyJwt = {
      issue: async (assertion) => {
        change();
        return { jwt: "private-jwt", subject: "subject", expiresAt: assertion.expiresAt };
      },
    };
  expect((await issue()).status).toBe(409);
});
it("caps issuance at session expiry and preserves ordinary identity", async () => {
  test.deps.personSwitch.mode = "off";
  delete headers["x-croquis-selection-version"];
  test.deps.privyJwt = {
    issue: async (assertion) => {
      expect(assertion.selectedUserId).toBe(BIGWHEEL_ID);
      expect(assertion.selectionVersion).toBeNull();
      expect(assertion.expiresAt - assertion.issuedAt).toBe(300);
      return {
        jwt: "private-jwt",
        subject: assertion.selectedLineUserId,
        expiresAt: assertion.expiresAt,
      };
    },
  };
  expect((await issue()).status).toBe(200);
});
it("sanitizes unexpected issuer errors", async () => {
  test.deps.privyJwt = {
    issue: async () => {
      throw new Error("private-access-token private-jwt");
    },
  };
  const response = await issue();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "auth_unavailable" });
  expect(logs.raw.join()).not.toContain("private-access-token");
  expect(logs.raw.join()).not.toContain("private-jwt");
});
it("caps assertion expiry at the signed cookie expiry", async () => {
  const signedAt = test.clock.now().getTime();
  test.clock.advance((SESSION_MAX_AGE_S - 12) * 1000);
  test.deps.privyJwt = {
    issue: async (assertion) => {
      expect(assertion.expiresAt).toBe(Math.floor(signedAt / 1000) + SESSION_MAX_AGE_S);
      expect(assertion.expiresAt - assertion.issuedAt).toBe(12);
      return { jwt: "private-jwt", subject: "subject", expiresAt: assertion.expiresAt };
    },
  };
  expect((await issue()).status).toBe(200);
});
it("uses one total deadline through both LINE requests and issuer delegation", async () => {
  const controller = new AbortController();
  const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
  const signals: (AbortSignal | null | undefined)[] = [];
  test.deps.line = createLineVerifier("test-channel", async (input, options) => {
    signals.push(options?.signal);
    return new URL(input instanceof Request ? input.url : input).pathname === "/v2/profile"
      ? Response.json({ userId: "line-bigwheel", displayName: "BIGWHEEL" })
      : Response.json({ client_id: "test-channel", expires_in: 3600 });
  });
  test.deps.privyJwt = createPrivyJwtService({
    url: "http://127.0.0.1:8787/_internal/privy-jwt",
    secret: "a".repeat(64),
    fetchImpl: async (_input, options) => {
      signals.push(options?.signal);
      controller.abort(new Error("private-access-token"));
      options?.signal?.throwIfAborted();
      throw new Error("Deadline was not enforced");
    },
  });
  const response = await issue();
  expect(response.status).toBe(503);
  expect(await response.json()).toEqual({ error: "auth_unavailable" });
  expect(signals).toEqual([controller.signal, controller.signal, controller.signal]);
  expect(timeout).toHaveBeenCalledTimes(1);
  expect(timeout).toHaveBeenCalledWith(10_000);
  expect(logs.raw.join()).not.toContain("private-access-token");
});
it("ends expired ownership waiting without later provider calls", async () => {
  const controller = new AbortController();
  const timeout = vi.spyOn(AbortSignal, "timeout").mockReturnValue(controller.signal);
  let release = () => {};
  const held = oneAtATime(
    `person-ownership:${BIGWHEEL_ID}:${HANA_ID}`,
    () =>
      new Promise<void>((resolve) => {
        release = resolve;
      }),
  );
  const line = vi.spyOn(test.deps.line, "verifyAccessToken");
  if (!test.deps.privyJwt) throw new Error("Issuer missing");
  const issuer = vi.spyOn(test.deps.privyJwt, "issue");
  let response: Response | undefined;
  const pending = issue().then((result) => {
    response = result;
    return result;
  });
  try {
    await vi.waitFor(() => expect(timeout).toHaveBeenCalledWith(10_000));
    controller.abort(new DOMException("Exchange deadline expired", "TimeoutError"));
    await vi.waitFor(() => expect(response?.status).toBe(503), { timeout: 100 });
    expect(await response?.json()).toEqual({ error: "auth_unavailable" });
    expect(line).not.toHaveBeenCalled();
    expect(issuer).not.toHaveBeenCalled();
  } finally {
    release();
    await held;
    await pending;
    await oneAtATime(`person-ownership:${BIGWHEEL_ID}:${HANA_ID}`, async () => {});
  }
  expect(line).not.toHaveBeenCalled();
  expect(issuer).not.toHaveBeenCalled();
});

it("logs successful selection and Privy authorization with only safe actor/version fields", async () => {
  const response = await test.send("POST", "/api/session/person", {
    headers,
    body: { userId: HANA_ID },
  });
  const envelope = z.object({ selectionVersion: z.string() }).parse(await response.json());
  const selectedHeaders = {
    ...headers,
    "x-croquis-user-id": HANA_ID,
    "x-croquis-selection-version": envelope.selectionVersion,
  };
  expect((await issue(undefined, selectedHeaders)).status).toBe(200);
  for (const event of ["person.selection", "privy.authorization"]) {
    expect(logs.entries).toContainEqual(
      expect.objectContaining({
        event,
        authenticatedUserId: BIGWHEEL_ID,
        selectedUserId: HANA_ID,
        selectionVersion: envelope.selectionVersion,
        outcome: "authorized",
      }),
    );
  }
  for (const value of [
    "private-access-token",
    "private-jwt",
    headers.Cookie,
    "line-bigwheel",
    "dev-video-hana",
  ])
    expect(logs.raw.join()).not.toContain(value);
});

it.each(["expired", "invalid"] as const)(
  "logs %s LINE authorization without provider credentials",
  async (reason) => {
    test.deps.line.verifyAccessToken = async () => {
      throw new LineTokenInvalidError("private-provider-body private-access-token", reason);
    };
    expect((await issue()).status).toBe(401);
    expect(logs.entries).toContainEqual(
      expect.objectContaining({
        event: "privy.authorization",
        authenticatedUserId: BIGWHEEL_ID,
        selectedUserId: BIGWHEEL_ID,
        selectionVersion: headers["x-croquis-selection-version"],
        outcome: reason === "expired" ? "line_token_expired" : "line_token_invalid",
      }),
    );
    expect(logs.raw.join()).not.toContain("private-access-token");
  },
);

it("logs provider availability failures with the rejected actor and fixed outcome", async () => {
  test.deps.privyJwt = {
    issue: async () => {
      throw new Error("private-provider-body private-access-token private-jwt");
    },
  };
  expect((await issue()).status).toBe(503);
  expect(logs.entries).toContainEqual(
    expect.objectContaining({
      event: "privy.authorization",
      authenticatedUserId: BIGWHEEL_ID,
      selectedUserId: BIGWHEEL_ID,
      selectionVersion: headers["x-croquis-selection-version"],
      outcome: "provider_unavailable",
    }),
  );
  for (const value of [
    "private-access-token",
    "private-jwt",
    "private-provider-body",
    headers.Cookie,
  ])
    expect(logs.raw.join()).not.toContain(value);
});
