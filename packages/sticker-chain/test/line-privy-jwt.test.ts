import { createPublicKey, generateKeyPairSync, verify } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  createLinePrivyJwtIssuer,
  PRIVY_JWT_LIFETIME_S,
  privySubject,
} from "../src/line-privy-jwt.js";

const { privateKey } = generateKeyPairSync("ec", { namedCurve: "prime256v1" });
const privateKeyPem = privateKey.export({ type: "pkcs8", format: "pem" }).toString();
const baseOptions = {
  channelId: "line-channel-123",
  issuer: "https://drawing.example",
  audience: "privy-app-123",
  privateKeyPem,
  keyId: "test-key",
  now: () => 1_800_000_000,
};

function parseJsonObject(value: string) {
  const parsed: unknown = JSON.parse(value);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Expected a JSON object");
  }
  return parsed;
}

function firstJwk<T>(keys: T[]): T {
  const [key] = keys;
  if (!key) throw new Error("Issuer published no JWKS keys");
  return key;
}

describe("LINE to Privy JWT", () => {
  it("creates a short-lived ES256 token after LINE verification", async () => {
    let checkedToken = "";
    const issuer = createLinePrivyJwtIssuer({
      ...baseOptions,
      verifyLineIdToken: async (token) => {
        checkedToken = token;
        return { sub: "line-user-1" };
      },
    });

    const { jwt, subject, expiresAt } = await issuer.issue("line-id-token");
    expect(checkedToken).toBe("line-id-token");
    expect(expiresAt).toBe(baseOptions.now() + PRIVY_JWT_LIFETIME_S);
    expect(subject).toMatch(/^line_[A-Za-z0-9_-]{43}$/);
    expect(issuer.jwks.keys[0]?.d).toBeUndefined();

    const tokenParts = jwt.split(".");
    expect(tokenParts).toHaveLength(3);
    const [headerPart, payloadPart, signaturePart] = tokenParts;
    if (!headerPart || !payloadPart || !signaturePart) throw new Error("Invalid JWT structure");
    const header = parseJsonObject(Buffer.from(headerPart, "base64url").toString());
    const payload = parseJsonObject(Buffer.from(payloadPart, "base64url").toString());
    expect(header).toEqual({ alg: "ES256", typ: "JWT", kid: baseOptions.keyId });
    expect(Reflect.get(payload, "sub")).toBe(subject);
    expect(Number(Reflect.get(payload, "exp")) - Number(Reflect.get(payload, "iat"))).toBe(
      PRIVY_JWT_LIFETIME_S,
    );
    expect(
      verify(
        "sha256",
        Buffer.from(`${headerPart}.${payloadPart}`),
        {
          key: createPublicKey({ key: firstJwk(issuer.jwks.keys), format: "jwk" }),
          dsaEncoding: "ieee-p1363",
        },
        Buffer.from(signaturePart, "base64url"),
      ),
    ).toBe(true);
  });

  it("creates a stable channel-scoped identity", async () => {
    const verifyLineIdToken = async () => ({ sub: "line-user-1" });
    const first = createLinePrivyJwtIssuer({ ...baseOptions, verifyLineIdToken });
    const otherChannel = createLinePrivyJwtIssuer({
      ...baseOptions,
      channelId: "another-channel",
      verifyLineIdToken,
    });

    await expect(first.issue("first")).resolves.toMatchObject({
      subject: (await first.issue("second")).subject,
    });
    expect((await otherChannel.issue("first")).subject).not.toBe(
      (await first.issue("first")).subject,
    );
  });

  it("signs the subject the API's smart wallet lookup asks Privy for", async () => {
    const issuer = createLinePrivyJwtIssuer({
      ...baseOptions,
      verifyLineIdToken: async () => ({ sub: "line-user-1" }),
    });

    const { subject } = await issuer.issue("line-id-token");
    expect(subject).toBe(privySubject(baseOptions.channelId, "line-user-1"));
  });

  it("does not issue a token when LINE rejects authentication", async () => {
    const issuer = createLinePrivyJwtIssuer({
      ...baseOptions,
      verifyLineIdToken: async () => {
        throw new Error("LINE rejected token");
      },
    });
    await expect(issuer.issue("rejected-token")).rejects.toThrow("LINE rejected token");
  });
});
