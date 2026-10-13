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
  it("creates a short-lived ES256 token for an authorized LINE identity", async () => {
    const issuer = createLinePrivyJwtIssuer(baseOptions);
    const { jwt, subject, expiresAt } = await issuer.issueAuthorized("line-user-1", 1_800_000_300);
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
    const first = createLinePrivyJwtIssuer(baseOptions);
    const otherChannel = createLinePrivyJwtIssuer({
      ...baseOptions,
      channelId: "another-channel",
    });

    await expect(first.issueAuthorized("line-user-1", 1_800_000_300)).resolves.toMatchObject({
      subject: (await first.issueAuthorized("line-user-1", 1_800_000_300)).subject,
    });
    expect((await otherChannel.issueAuthorized("line-user-1", 1_800_000_300)).subject).not.toBe(
      (await first.issueAuthorized("line-user-1", 1_800_000_300)).subject,
    );
  });

  it("signs the subject the API's smart wallet lookup asks Privy for", async () => {
    const issuer = createLinePrivyJwtIssuer({
      ...baseOptions,
    });

    const { subject } = await issuer.issueAuthorized("line-user-1", 1_800_000_300);
    expect(subject).toBe(privySubject(baseOptions.channelId, "line-user-1"));
  });

  it("caps JWT expiry and refuses expired authorization", async () => {
    const issuer = createLinePrivyJwtIssuer(baseOptions);
    expect((await issuer.issueAuthorized("line-user-1", 1_800_000_012)).expiresAt).toBe(
      1_800_000_012,
    );
    expect((await issuer.issueAuthorized("line-user-1", 1_800_005_000)).expiresAt).toBe(
      1_800_000_300,
    );
    await expect(issuer.issueAuthorized("line-user-1", 1_800_000_000)).rejects.toThrow();
  });
});
