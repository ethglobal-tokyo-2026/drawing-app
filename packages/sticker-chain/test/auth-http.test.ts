import { generateKeyPairSync, sign } from "node:crypto";
import { inspect } from "node:util";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_AUTH_BODY_BYTES } from "../src/auth-http.js";
import { createLinePrivyJwtIssuer, type LinePrivyJwtIssuer } from "../src/line-privy-jwt.js";
import { createLineVerifier, MAX_ID_TOKEN_LENGTH, MIN_ID_TOKEN_LENGTH } from "../src/line.js";
import { APP_ORIGIN, startAuthServer } from "./helpers/auth-server.js";

vi.mock("node:crypto", async (importOriginal) => {
  const original = await importOriginal<typeof import("node:crypto")>();
  return { ...original, sign: vi.fn(original.sign) };
});

const ID_TOKEN = "private-line-id-token";
const CHANNEL_ID = "line-channel-123";
const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();

const verifiedClaims = () => ({
  iss: "https://access.line.me",
  aud: CHANNEL_ID,
  sub: "private-line-user-id",
  exp: Math.floor(Date.now() / 1000) + 3600,
});

function startVerifiedAuthServer(fetchImpl: typeof fetch) {
  return startAuthServer({
    issuer: createLinePrivyJwtIssuer({
      verifyLineIdToken: createLineVerifier({ channelId: CHANNEL_ID, fetchImpl }),
      channelId: CHANNEL_ID,
      issuer: APP_ORIGIN,
      audience: "privy-app-123",
      privateKeyPem,
      keyId: "test-key",
    }),
  });
}

function postJwt(
  url: string,
  body = JSON.stringify({ idToken: ID_TOKEN }),
  contentType = "application/json",
) {
  return fetch(`${url}/v1/auth/privy-jwt`, {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

beforeEach(() => vi.clearAllMocks());

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

  it("answers a path that isn't a URL with 404", async () => {
    const { url } = await startVerifiedAuthServer(vi.fn<typeof fetch>());
    const response = await fetch(`${url}//`);

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "not_found" });
  });

  it.each([
    {
      name: "expired LINE token",
      fetchImpl: async () =>
        Response.json(
          { error: "invalid_request", error_description: "IdToken expired." },
          { status: 400 },
        ),
      status: 401,
      code: "line_auth_failed",
      reason: "token_expired",
    },
    {
      name: "invalid LINE signature",
      fetchImpl: async () =>
        Response.json(
          { error: "invalid_request", error_description: "Invalid IdToken." },
          { status: 401 },
        ),
      status: 401,
      code: "line_auth_failed",
      reason: "token_invalid",
    },
    {
      name: "LINE network failure",
      fetchImpl: async () => {
        throw new TypeError(`Network failure ${ID_TOKEN}`);
      },
      status: 502,
      code: "line_unavailable",
      reason: "network_error",
    },
    {
      name: "LINE timeout",
      fetchImpl: async () => {
        throw new DOMException(`Timeout ${ID_TOKEN}`, "TimeoutError");
      },
      status: 502,
      code: "line_unavailable",
      reason: "timeout",
    },
    {
      name: "LINE server failure",
      fetchImpl: async () => Response.json({ error: ID_TOKEN }, { status: 503 }),
      status: 502,
      code: "line_unavailable",
      reason: "http_error",
    },
    {
      name: "LINE rate limit",
      fetchImpl: async () => Response.json({ error: ID_TOKEN }, { status: 429 }),
      status: 502,
      code: "line_unavailable",
      reason: "http_error",
    },
    {
      name: "malformed provider JSON",
      fetchImpl: async () => new Response(ID_TOKEN),
      status: 502,
      code: "line_unavailable",
      reason: "invalid_response",
    },
    {
      name: "malformed provider rejection",
      fetchImpl: async () => new Response(ID_TOKEN, { status: 400 }),
      status: 502,
      code: "line_unavailable",
      reason: "invalid_response",
    },
    {
      name: "unrecognized provider rejection",
      fetchImpl: async () =>
        Response.json({ error: "invalid_request", error_description: ID_TOKEN }, { status: 400 }),
      status: 502,
      code: "line_unavailable",
      reason: "http_error",
    },
    {
      name: "malformed provider claims",
      fetchImpl: async () => Response.json({ sub: ID_TOKEN }),
      status: 502,
      code: "line_unavailable",
      reason: "invalid_claims",
    },
  ])(
    "classifies $name through the real verifier and HTTP handler",
    async ({ fetchImpl, status, code, reason }) => {
      const { url, errors } = await startVerifiedAuthServer(fetchImpl);
      const response = await postJwt(url);

      expect(response.status).toBe(status);
      await expect(response.json()).resolves.toEqual({ error: code });
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(errors).toEqual([expect.objectContaining({ code, reason })]);
      expect(inspect(errors, { depth: null })).not.toContain(ID_TOKEN);
      expect(sign).not.toHaveBeenCalled();
    },
  );

  it("returns an internal failure if signing fails after successful LINE verification", async () => {
    const fetchImpl = vi.fn<typeof fetch>(async () => Response.json(verifiedClaims()));
    vi.mocked(sign).mockImplementationOnce(() => {
      throw Object.assign(new TypeError(`Signing failed ${ID_TOKEN} ${privateKeyPem}`), {
        code: "ERR_INVALID_ARG_TYPE",
      });
    });
    const { url, errors } = await startVerifiedAuthServer(fetchImpl);
    const response = await postJwt(url);

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: "auth_unavailable" });
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(sign).toHaveBeenCalledOnce();
    expect(errors).toEqual([
      {
        code: "auth_unavailable",
        reason: "unexpected_error",
        errorName: "TypeError",
        errorCode: "ERR_INVALID_ARG_TYPE",
      },
    ]);
    expect(inspect(errors, { depth: null })).not.toContain(ID_TOKEN);
    expect(inspect(errors, { depth: null })).not.toContain(privateKeyPem);
  });

  it.each([
    { body: "{", contentType: "application/json", reason: "invalid_json" },
    { body: "[]", contentType: "application/json", reason: "invalid_body" },
    { body: "{}", contentType: "application/json", reason: "id_token_required" },
    {
      body: JSON.stringify({ idToken: "x".repeat(MIN_ID_TOKEN_LENGTH - 1) }),
      contentType: "application/json",
      reason: "id_token_format",
    },
    {
      body: JSON.stringify({ idToken: "x".repeat(MAX_ID_TOKEN_LENGTH + 1) }),
      contentType: "application/json",
      reason: "id_token_format",
    },
    {
      // Three bytes a character: under the limit in characters, over it in bytes.
      body: JSON.stringify({ idToken: "あ".repeat(MAX_AUTH_BODY_BYTES / 2) }),
      contentType: "application/json",
      reason: "body_too_large",
    },
    {
      body: JSON.stringify({ idToken: ID_TOKEN }),
      contentType: "text/plain",
      reason: "content_type_required",
    },
  ])(
    "rejects malformed input with $reason before verification or signing",
    async ({ body, contentType, reason }) => {
      const fetchImpl = vi.fn<typeof fetch>();
      const { url, errors } = await startVerifiedAuthServer(fetchImpl);
      const response = await postJwt(url, body, contentType);

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
      expect(errors).toEqual([{ code: "invalid_request", reason }]);
      expect(fetchImpl).not.toHaveBeenCalled();
      expect(sign).not.toHaveBeenCalled();
    },
  );

  it("issues a JWT after the real verifier accepts LINE's claims", async () => {
    const { url } = await startVerifiedAuthServer(async () => Response.json(verifiedClaims()));
    const response = await postJwt(url);

    expect(response.status).toBe(200);
    const body: unknown = await response.json();
    if (!body || typeof body !== "object") throw new Error("JWT response must be an object");
    expect(Reflect.get(body, "jwt")).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
    expect(Reflect.get(body, "expiresAt")).toBeGreaterThan(Date.now() / 1000);
    expect(sign).toHaveBeenCalledOnce();
  });
});
