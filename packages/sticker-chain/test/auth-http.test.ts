import { describe, expect, it } from "vitest";
import type { LinePrivyJwtIssuer } from "../src/line-privy-jwt.js";
import { APP_ORIGIN, startAuthServer } from "./helpers/auth-server.js";

describe("LINE authentication HTTP server", () => {
  it("serves public keys and restricts token issuance to the app origin", async () => {
    const issuer: LinePrivyJwtIssuer = {
      jwks: { keys: [{ kid: "test-key", kty: "EC" }] },
      issue: async (token) => {
        expect(token).toBe("verified-line-token");
        return { jwt: "signed.jwt.here", subject: "line_subject", expiresAt: 123 };
      },
    };
    const { url } = await startAuthServer({ issuer });

    const keys = await fetch(`${url}/.well-known/jwks.json`);
    expect(keys.status).toBe(200);
    await expect(keys.json()).resolves.toEqual(issuer.jwks);

    const auth = await fetch(`${url}/v1/auth/privy-jwt`, {
      method: "POST",
      headers: { origin: APP_ORIGIN, "content-type": "application/json" },
      body: JSON.stringify({ idToken: "verified-line-token" }),
    });
    expect(auth.status).toBe(200);
    expect(auth.headers.get("cache-control")).toBe("no-store");
    await expect(auth.json()).resolves.toEqual({ jwt: "signed.jwt.here", expiresAt: 123 });

    const crossOrigin = await fetch(`${url}/v1/auth/privy-jwt`, {
      method: "POST",
      headers: { origin: "https://other.example", "content-type": "application/json" },
      body: JSON.stringify({ idToken: "verified-line-token" }),
    });
    expect(crossOrigin.status).toBe(403);
  });

  it("returns a stable error and records provider failures", async () => {
    const providerError = new Error("provider details");
    const issuer: LinePrivyJwtIssuer = {
      jwks: { keys: [] },
      issue: async () => {
        throw providerError;
      },
    };
    const { url, errors } = await startAuthServer({ issuer });
    const response = await fetch(`${url}/v1/auth/privy-jwt`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken: "private-line-token" }),
    });

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "line_auth_failed" });
    expect(errors).toEqual([providerError]);
  });
});
