import { once } from "node:events";
import type { Server } from "node:http";
import { afterEach, describe, expect, it } from "vitest";
import { createAuthHttpServer } from "../src/auth-http.js";
import type { LinePrivyJwtIssuer } from "../src/line-privy-jwt.js";

let activeServer: Server | undefined;

afterEach(async () => {
  if (!activeServer) return;
  const server = activeServer;
  activeServer = undefined;
  await new Promise<void>((resolve, reject) => {
    server.close((error) => error ? reject(error) : resolve());
  });
});

async function startServer(issuer: LinePrivyJwtIssuer, errors: unknown[]) {
  activeServer = createAuthHttpServer({
    issuer,
    appOrigin: "https://drawing.example",
    logger: { error: (_message, details) => errors.push(details.error) },
  });
  activeServer.listen(0, "127.0.0.1");
  await once(activeServer, "listening");
  const address = activeServer.address();
  if (!address || typeof address === "string") throw new Error("Test server has no TCP address");
  return `http://127.0.0.1:${address.port}`;
}

describe("LINE authentication HTTP server", () => {
  it("serves public keys and restricts token issuance to the app origin", async () => {
    const issuer: LinePrivyJwtIssuer = {
      jwks: { keys: [{ kid: "test-key", kty: "EC" }] },
      issue: async (token) => {
        expect(token).toBe("verified-line-token");
        return { jwt: "signed.jwt.here", subject: "line_subject", expiresAt: 123 };
      },
    };
    const url = await startServer(issuer, []);

    const keys = await fetch(`${url}/.well-known/jwks.json`);
    expect(keys.status).toBe(200);
    await expect(keys.json()).resolves.toEqual(issuer.jwks);

    const auth = await fetch(`${url}/v1/auth/privy-jwt`, {
      method: "POST",
      headers: { origin: "https://drawing.example", "content-type": "application/json" },
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
    const errors: unknown[] = [];
    const providerError = new Error("provider details");
    const issuer: LinePrivyJwtIssuer = {
      jwks: { keys: [] },
      issue: async () => { throw providerError; },
    };
    const url = await startServer(issuer, errors);
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
