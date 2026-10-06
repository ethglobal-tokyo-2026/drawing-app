import { describe, expect, it } from "vitest";
import { createLineVerifier } from "../src/line.js";

const channelId = "line-channel-123";
const profile = { sub: "line-user-1", name: "Alice", picture: "https://profile.line-scdn.net/a" };
const validClaims = {
  iss: "https://access.line.me",
  aud: channelId,
  exp: Math.floor(Date.now() / 1000) + 3600,
  ...profile,
};

/** A verifier whose LINE answers every request with `body`. */
const verifierAnswering = (body: unknown, init?: ResponseInit) =>
  createLineVerifier({ channelId, fetchImpl: async () => Response.json(body, init) });

describe("LINE ID token verification", () => {
  it("binds verification to the Login Channel, and returns who the token names", async () => {
    let request: RequestInit | undefined;
    const verify = createLineVerifier({
      channelId,
      fetchImpl: async (_input, options) => {
        request = options;
        return Response.json(validClaims);
      },
    });

    await expect(verify("valid-line-id-token")).resolves.toEqual(profile);
    const requestBody = request?.body;
    if (!(requestBody instanceof URLSearchParams)) {
      throw new Error("LINE verification request did not contain form data");
    }
    expect(requestBody.get("client_id")).toBe(channelId);
    expect(requestBody.get("id_token")).toBe("valid-line-id-token");
  });

  it("accepts a profile without a picture", async () => {
    const { picture: _, ...withoutPicture } = validClaims;
    await expect(verifierAnswering(withoutPicture)("valid-line-id-token")).resolves.toEqual({
      sub: profile.sub,
      name: profile.name,
    });
  });

  it.each([
    [{ ...validClaims, iss: "https://another.example" }, "issuer_mismatch"],
    [{ ...validClaims, aud: "another-channel" }, "audience_mismatch"],
    [{ ...validClaims, exp: 0 }, "token_expired"],
  ])("rejects invalid verified claims with reason %s", async (claims, reason) => {
    await expect(verifierAnswering(claims)("valid-line-id-token")).rejects.toMatchObject({
      details: { code: "line_auth_failed", reason },
    });
  });

  it.each([
    ["IdToken expired.", "token_expired"],
    ["Invalid IdToken.", "token_invalid"],
    ["JWS format error", "token_invalid"],
    ["JWS verification failed", "token_invalid"],
    ["Invalid IdToken Audience.", "audience_mismatch"],
    ["Invalid IdToken Issuer.", "issuer_mismatch"],
    ["Invalid IdToken Nonce.", "nonce_mismatch"],
    ["Invalid IdToken Subject Identifier.", "subject_mismatch"],
  ])("records a fixed diagnostic label for LINE rejection %s", async (description, reason) => {
    const verify = verifierAnswering(
      { error: "invalid_request", error_description: description },
      { status: 400 },
    );
    await expect(verify("valid-line-id-token")).rejects.toMatchObject({
      details: { code: "line_auth_failed", reason, upstreamStatus: 400 },
    });
  });

  it.each([
    null,
    [],
    {},
    { ...validClaims, sub: "" },
    { ...validClaims, exp: "tomorrow" },
    { ...validClaims, name: undefined },
    { ...validClaims, name: 7 },
    { ...validClaims, picture: null },
  ])("treats malformed provider claims as unavailable", async (claims) => {
    await expect(verifierAnswering(claims)("valid-line-id-token")).rejects.toMatchObject({
      details: { code: "line_unavailable", reason: "invalid_claims" },
    });
  });
});
