import { describe, expect, it, vi } from "vitest";
import { createLineVerifier, MIN_ACCESS_TOKEN_LENGTH } from "../src/line.js";
import { CHANNEL_ID, LINE_PROFILE, lineAnswering, verifiedFor } from "./helpers/line-api.js";

const ACCESS_TOKEN = "live-line-access-token";
const verifier = (fetchImpl: typeof fetch) =>
  createLineVerifier({ channelId: CHANNEL_ID, fetchImpl });
const failure = (code: string, reason: string) => ({ details: { code, reason } });

describe("LINE access token verification", () => {
  it("checks the token with LINE, then names who LINE's profile says it's for", async () => {
    const asked: { url: string; headers: Headers }[] = [];
    await expect(verifier(lineAnswering({ asked }))(ACCESS_TOKEN)).resolves.toEqual({
      sub: LINE_PROFILE.userId,
      name: LINE_PROFILE.displayName,
      picture: LINE_PROFILE.pictureUrl,
    });
    const [verify, profile] = asked;
    expect(new URL(verify?.url ?? "").searchParams.get("access_token")).toBe(ACCESS_TOKEN);
    expect(profile?.headers.get("authorization")).toBe(`Bearer ${ACCESS_TOKEN}`);
  });

  it("accepts a profile without a picture", async () => {
    const { pictureUrl: _, ...withoutPicture } = LINE_PROFILE;
    const verify = verifier(lineAnswering({ profile: () => Response.json(withoutPicture) }));
    await expect(verify(ACCESS_TOKEN)).resolves.toEqual({
      sub: LINE_PROFILE.userId,
      name: LINE_PROFILE.displayName,
    });
  });

  it.each([
    {
      name: "another channel's token",
      verify: () => verifiedFor("another-channel"),
      reason: "channel_mismatch",
    },
    {
      name: "a token with no time left",
      verify: () => Response.json({ scope: "profile", client_id: CHANNEL_ID, expires_in: 0 }),
      reason: "token_expired",
    },
    {
      name: "an expired token",
      verify: () =>
        Response.json(
          { error: "invalid_request", error_description: "access token expired" },
          { status: 400 },
        ),
      reason: "token_expired",
    },
    {
      name: "a malformed or revoked token",
      verify: () =>
        Response.json(
          { error: "invalid_request", error_description: "invalid access token" },
          { status: 400 },
        ),
      reason: "token_invalid",
    },
    {
      name: "a token revoked between LINE's two answers",
      profile: () => Response.json({ message: "Authentication failed" }, { status: 401 }),
      reason: "token_invalid",
    },
  ])("refuses $name", async ({ verify, profile, reason }) => {
    const fetchImpl = vi.fn(lineAnswering({ verify, profile }));
    await expect(verifier(fetchImpl)(ACCESS_TOKEN)).rejects.toMatchObject(
      failure("line_auth_failed", reason),
    );
  });

  it("refuses a token of impossible length without asking LINE", async () => {
    const fetchImpl = vi.fn(lineAnswering());
    await expect(
      verifier(fetchImpl)("x".repeat(MIN_ACCESS_TOKEN_LENGTH - 1)),
    ).rejects.toMatchObject(failure("invalid_request", "access_token_format"));
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    { verify: () => Response.json({}), reason: "invalid_verification" },
    {
      verify: () => Response.json({ client_id: CHANNEL_ID, expires_in: "soon" }),
      reason: "invalid_verification",
    },
    { profile: () => Response.json({ ...LINE_PROFILE, userId: "" }), reason: "invalid_profile" },
    {
      profile: () => Response.json({ ...LINE_PROFILE, displayName: 7 }),
      reason: "invalid_profile",
    },
    {
      profile: () => Response.json({ ...LINE_PROFILE, pictureUrl: null }),
      reason: "invalid_profile",
    },
    {
      verify: () => Response.json({ error: "server_error" }, { status: 500 }),
      reason: "http_error",
    },
    { profile: () => Response.json({}, { status: 503 }), reason: "http_error" },
    { profile: () => new Response("not json"), reason: "invalid_response" },
  ])(
    "treats an answer it can't read as LINE being unavailable: $reason",
    async ({ verify, profile, reason }) => {
      await expect(
        verifier(lineAnswering({ verify, profile }))(ACCESS_TOKEN),
      ).rejects.toMatchObject(failure("line_unavailable", reason));
    },
  );
});
