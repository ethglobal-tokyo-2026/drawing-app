import { MIN_ACCESS_TOKEN_LENGTH } from "@drawing-app/line-auth/line";
import { describe, expect, it, vi } from "vitest";
import { LineTokenInvalidError, LineUnavailableError, type LineProfile } from "../deps.ts";
import { createLineVerifier } from "./lineVerifier.ts";

const CHANNEL_ID = "channel";
const ACCESS_TOKEN = "line-access-token";
const profile: LineProfile = { sub: "U1", name: "Alice", picture: "https://profile.test/a" };

/** A verifier whose LINE verifies with `verify`, and answers the profile endpoint with `profile`'s. */
const verifierAnswering = (verify: () => Response) =>
  createLineVerifier(CHANNEL_ID, async (input) =>
    new URL(input instanceof Request ? input.url : input).pathname === "/v2/profile"
      ? Response.json({
          userId: profile.sub,
          displayName: profile.name,
          pictureUrl: profile.picture,
        })
      : verify(),
  );

const live = () => Response.json({ scope: "profile", client_id: CHANNEL_ID, expires_in: 3600 });
const refusal = (description: string) =>
  Response.json({ error: "invalid_request", error_description: description }, { status: 400 });

describe("the LINE verifier", () => {
  it("returns the profile LINE says the token names", async () => {
    await expect(verifierAnswering(live).verifyAccessToken(ACCESS_TOKEN)).resolves.toEqual(profile);
  });

  it.each([
    { description: "access token expired", reason: "expired" },
    { description: "invalid access token", reason: "invalid" },
  ])(
    "reads LINE's refusal, $description, as a refused token: $reason",
    async ({ description, reason }) => {
      const refused = verifierAnswering(() => refusal(description)).verifyAccessToken(ACCESS_TOKEN);
      await expect(refused).rejects.toBeInstanceOf(LineTokenInvalidError);
      await expect(refused).rejects.toMatchObject({ reason });
    },
  );

  it("refuses a token too short to be LINE's without asking LINE", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const refused = createLineVerifier(CHANNEL_ID, fetchImpl).verifyAccessToken(
      "x".repeat(MIN_ACCESS_TOKEN_LENGTH - 1),
    );
    await expect(refused).rejects.toBeInstanceOf(LineTokenInvalidError);
    await expect(refused).rejects.toMatchObject({ reason: "invalid" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    {
      failure: "a server error",
      fetchImpl: async () => Response.json({}, { status: 503 }),
      reason: "http_error",
    },
    {
      failure: "a network error",
      fetchImpl: () => Promise.reject(new TypeError("Network unavailable")),
      reason: "network_error",
    },
    {
      failure: "a timeout",
      fetchImpl: () => Promise.reject(new DOMException("Timed out", "TimeoutError")),
      reason: "timeout",
    },
  ])(
    "tells LINE being unreachable, through $failure, from a refused token",
    async ({ fetchImpl, reason }) => {
      const outage = createLineVerifier(CHANNEL_ID, fetchImpl).verifyAccessToken(ACCESS_TOKEN);
      await expect(outage).rejects.toThrow(reason);
      await expect(outage).rejects.toBeInstanceOf(LineUnavailableError);
    },
  );
});
