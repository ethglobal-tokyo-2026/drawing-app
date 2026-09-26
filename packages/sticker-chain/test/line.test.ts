import { describe, expect, it } from "vitest";
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

  it("rejects the wrong audience, expired tokens, and provider failures", async () => {
    const wrongAudience = createLineVerifier({
      channelId,
      fetchImpl: async () => Response.json({ ...validClaims, aud: "another-channel" }),
    });
    const expired = createLineVerifier({
      channelId,
      fetchImpl: async () =>
        Response.json({
          ...validClaims,
          exp: Math.floor(Date.now() / 1000) - 1,
        }),
    });
    const rejected = createLineVerifier({
      channelId,
      fetchImpl: async () => new Response(null, { status: 401 }),
    });

    await expect(wrongAudience("valid-line-id-token")).rejects.toThrow("Invalid LINE token claims");
    await expect(expired("valid-line-id-token")).rejects.toThrow("Invalid LINE token claims");
    await expect(rejected("valid-line-id-token")).rejects.toThrow("status 401");
  });

  it("keeps LINE's reason for a rejection, for the server log", async () => {
    const rejected = createLineVerifier({
      channelId,
      fetchImpl: async () =>
        Response.json(
          { error: "invalid_request", error_description: "IdToken expired." },
          { status: 400 },
        ),
    });

    await expect(rejected("valid-line-id-token")).rejects.toThrow("status 400: IdToken expired.");
  });
});
