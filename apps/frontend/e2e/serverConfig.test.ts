import { EventEmitter } from "node:events";
import { describe, expect, it } from "vitest";
import { createE2eServerConfig } from "./serverConfig.ts";
import { assertSessionPersisted } from "./sessionPersistence.ts";

function forwardedCookies(https: boolean, headers: string[]) {
  const config = createE2eServerConfig(
    https ? { https: { key: "test-key", cert: "test-cert" } } : {},
  );
  const proxy = config.server?.proxy?.["/api"];
  if (!proxy || typeof proxy === "string") throw new Error("The /api proxy is missing");
  const events = new EventEmitter();
  // The test only emits the proxy events used by this configuration.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  proxy.configure?.(events as Parameters<NonNullable<typeof proxy.configure>>[0], {} as never);
  const response = { headers: { "set-cookie": [...headers] } };
  events.emit("proxyRes", response);
  return response.headers["set-cookie"];
}

describe("E2E session cookie proxy", () => {
  const headers = [
    "session=secret; HttpOnly; SameSite=Lax; Secure; Path=/",
    "other=public; Secure; Path=/",
  ];

  it("removes only Secure attributes on HTTP", () => {
    expect(
      forwardedCookies(false, headers).join("|") ===
        "session=secret; HttpOnly; SameSite=Lax; Path=/|other=public; Path=/",
    ).toBe(true);
  });

  it("preserves the complete Set-Cookie headers on HTTPS", () => {
    expect(forwardedCookies(true, headers).join("|") === headers.join("|")).toBe(true);
  });
});

describe("session persistence assertion", () => {
  const before = { cookie: "before", created: 1 };
  it("accepts the same cookie and count with a live session", () => {
    expect(() =>
      assertSessionPersisted(before, { cookie: "before", created: 1, meStatus: 200 }),
    ).not.toThrow();
  });
  it("identifies reauthentication without exposing the cookie", () => {
    expect(() =>
      assertSessionPersisted(before, { cookie: "after", created: 2, meStatus: 200 }),
    ).toThrow(/reauthentication/);
  });
  it("identifies a missing cookie", () => {
    expect(() => assertSessionPersisted(before, { cookie: "", created: 1, meStatus: 200 })).toThrow(
      /cookie is missing/,
    );
  });
  it("identifies a changed cookie", () => {
    expect(() =>
      assertSessionPersisted(before, { cookie: "after", created: 1, meStatus: 200 }),
    ).toThrow(/cookie changed/);
  });
  it("identifies a failed account check", () => {
    expect(() =>
      assertSessionPersisted(before, { cookie: "before", created: 1, meStatus: 401 }),
    ).toThrow(/api\/me failed/);
  });
});
