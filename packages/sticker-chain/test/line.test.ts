import { describe, expect, it, vi } from "vitest";
import { AuthError } from "../src/auth-error.js";
import { createLineVerifier } from "../src/line.js";

const channelId = "line-channel-123";
const validClaims = {
  iss: "https://access.line.me",
  aud: channelId,
  sub: "line-user-1",
  exp: Math.floor(Date.now() / 1000) + 3600,
};

describe("LINE ID token verification", () => {
  it("binds verification to the configured Login Channel", async () => {
    let request: RequestInit | undefined;
    const verify = createLineVerifier({
      channelId,
      fetchImpl: async (_input, options) => {
        request = options;
        return Response.json(validClaims);
      },
    });

    await expect(verify("valid-line-id-token")).resolves.toEqual({ sub: "line-user-1" });
    const requestBody = request?.body;
    if (!(requestBody instanceof URLSearchParams)) {
      throw new Error("LINE verification request did not contain form data");
    }
    expect(requestBody.get("client_id")).toBe(channelId);
    expect(requestBody.get("id_token")).toBe("valid-line-id-token");
  });

  it.each([
    [{ ...validClaims, iss: "https://another.example" }, "issuer_mismatch"],
    [{ ...validClaims, aud: "another-channel" }, "audience_mismatch"],
    [{ ...validClaims, exp: 0 }, "token_expired"],
  ])("rejects invalid verified claims with reason %s", async (claims, reason) => {
    const verify = createLineVerifier({ channelId, fetchImpl: async () => Response.json(claims) });
    await expect(verify("valid-line-id-token")).rejects.toMatchObject({
      details: { code: "line_auth_failed", reason },
    });
  });

  it.each([
    ["IdToken expired.", "token_expired"],
    ["Invalid IdToken.", "token_invalid"],
    ["Invalid IdToken Audience.", "audience_mismatch"],
    ["Invalid IdToken Issuer.", "issuer_mismatch"],
    ["Invalid IdToken Nonce.", "nonce_mismatch"],
    ["Invalid IdToken Subject Identifier.", "subject_mismatch"],
  ])("records a fixed diagnostic label for LINE rejection %s", async (description, reason) => {
    const verify = createLineVerifier({
      channelId,
      fetchImpl: async () =>
        Response.json(
          { error: "invalid_request", error_description: description },
          { status: 400 },
        ),
    });

    await expect(verify("valid-line-id-token")).rejects.toMatchObject({
      details: { code: "line_auth_failed", reason, upstreamStatus: 400 },
    });
  });

  it.each([null, [], {}, { ...validClaims, sub: "" }, { ...validClaims, exp: "tomorrow" }])(
    "treats malformed provider claims as unavailable",
    async (claims) => {
      const verify = createLineVerifier({
        channelId,
        fetchImpl: async () => Response.json(claims),
      });
      await expect(verify("valid-line-id-token")).rejects.toMatchObject({
        details: { code: "line_unavailable", reason: "invalid_claims" },
      });
    },
  );

  it.each(["short", "x".repeat(6001)])(
    "rejects malformed input before calling LINE",
    async (token) => {
      const fetchImpl = vi.fn<typeof fetch>();
      const verify = createLineVerifier({ channelId, fetchImpl });

      await expect(verify(token)).rejects.toEqual(
        new AuthError({ code: "invalid_request", reason: "id_token_format" }),
      );
      expect(fetchImpl).not.toHaveBeenCalled();
    },
  );
});
