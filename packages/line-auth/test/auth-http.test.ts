import { generateKeyPairSync } from "node:crypto";
import { expect, it } from "vitest";
import { MAX_AUTH_BODY_BYTES } from "../src/auth-http.js";
import { authenticatePrivyAssertion, type PrivyJwtAssertion } from "../src/internalAssertion.ts";
import { createLinePrivyJwtIssuer } from "../src/line-privy-jwt.js";
import { startAuthServer } from "./helpers/auth-server.js";
const secret = "a".repeat(64);
const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const issuer = () =>
  createLinePrivyJwtIssuer({
    channelId: "channel",
    issuer: "https://example.test",
    audience: "app",
    keyId: "existing-key",
    privateKeyPem: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  });
const assertion = (): PrivyJwtAssertion => ({
  authenticatedUserId: "principal",
  authenticatedLineUserId: "line-principal",
  selectedUserId: "selected",
  selectedLineUserId: "line-selected",
  sessionId: "session",
  selectionVersion: "version",
  scope: "croquis-privy-jwt",
  issuedAt: Math.floor(Date.now() / 1000),
  expiresAt: Math.floor(Date.now() / 1000) + 300,
});
const post = (url: string, body: unknown) =>
  fetch(`${url}/_internal/privy-jwt`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
it("retires the anonymous exchange but keeps the configured JWKS", async () => {
  const configured = issuer();
  const { url } = await startAuthServer({ issuer: configured, internalSecret: secret });
  expect(
    (await fetch(`${url}/v1/auth/privy-jwt`, { method: "POST", body: "private-token" })).status,
  ).toBe(404);
  expect(await (await fetch(`${url}/.well-known/jwks.json`)).json()).toEqual(configured.jwks);
  const response = await post(url, authenticatePrivyAssertion(assertion(), secret));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const result: unknown = await response.json();
  if (!result || typeof result !== "object") throw new Error("Expected JWT result");
  expect(Reflect.get(result, "subject")).toMatch(/^line_/);
  expect(typeof Reflect.get(result, "jwt")).toBe("string");
});
it.each(["tampered", "expired", "lifetime", "scope", "future", "mac", "missing"])(
  "rejects %s internal assertion",
  async (kind) => {
    const { url, errors } = await startAuthServer({ issuer: issuer(), internalSecret: secret });
    const value = assertion();
    if (kind === "expired") value.expiresAt = value.issuedAt;
    if (kind === "lifetime") value.expiresAt += 1;
    if (kind === "future") value.issuedAt += 10;
    const signed = authenticatePrivyAssertion(value, secret);
    if (kind === "scope") Object.assign(signed.assertion, { scope: "private-token" });
    if (kind === "tampered") signed.assertion.selectedLineUserId = "private-token";
    if (kind === "mac") signed.mac = "0".repeat(64);
    const response = await post(url, kind === "missing" ? {} : signed);
    expect(response.status).toBe(403);
    expect(JSON.stringify(errors)).not.toContain("private-token");
    expect(JSON.stringify(errors)).not.toContain(secret);
  },
);
it("bounds request body before issuing", async () => {
  const { url } = await startAuthServer({ issuer: issuer(), internalSecret: secret });
  expect((await post(url, { data: "あ".repeat(MAX_AUTH_BODY_BYTES) })).status).toBe(400);
});
it("sanitizes signing failures", async () => {
  const configured = issuer();
  configured.issueAuthorized = async () => {
    throw new Error("private-token private-jwt");
  };
  const { url, errors } = await startAuthServer({ issuer: configured, internalSecret: secret });
  expect((await post(url, authenticatePrivyAssertion(assertion(), secret))).status).toBe(500);
  expect(JSON.stringify(errors)).not.toContain("private-token");
  expect(JSON.stringify(errors)).not.toContain("private-jwt");
});
