import { MIN_ID_TOKEN_LENGTH } from "@drawing-app/sticker-chain/line";
import { describe, expect, it, vi } from "vitest";
import { LineTokenInvalidError, LineUnavailableError, type LineProfile } from "../deps.ts";
import { createLineVerifier } from "./lineVerifier.ts";

const CHANNEL_ID = "channel";
const ID_TOKEN = "line-id-token";

/** A verifier whose LINE answers every request with `body` and `status`. */
const verifierAnswering = (body: unknown, status = 200) =>
  createLineVerifier(CHANNEL_ID, async () => Response.json(body, { status }));

const refusal = (description: string) => ({
  error: "invalid_request",
  error_description: description,
});

describe("the LINE verifier", () => {
  it("returns the profile LINE says the token names", async () => {
    const profile: LineProfile = { sub: "U1", name: "Alice", picture: "https://profile.test/a" };
    const claims = {
      iss: "https://access.line.me",
      aud: CHANNEL_ID,
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...profile,
    };
    await expect(verifierAnswering(claims).verifyIdToken(ID_TOKEN)).resolves.toEqual(profile);
  });

  it.each([
    { status: 400, description: "IdToken expired.", reason: "expired" },
    { status: 401, description: "Invalid IdToken.", reason: "invalid" },
  ])(
    "reads LINE's $status refusal, $description, as a refused token: $reason",
    async ({ status, description, reason }) => {
      const refused = verifierAnswering(refusal(description), status).verifyIdToken(ID_TOKEN);
      await expect(refused).rejects.toBeInstanceOf(LineTokenInvalidError);
      await expect(refused).rejects.toMatchObject({ reason });
    },
  );

  it("refuses a token too short to be LINE's without asking LINE", async () => {
    const fetchImpl = vi.fn<typeof fetch>();
    const refused = createLineVerifier(CHANNEL_ID, fetchImpl).verifyIdToken(
      "x".repeat(MIN_ID_TOKEN_LENGTH - 1),
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
      const outage = createLineVerifier(CHANNEL_ID, fetchImpl).verifyIdToken(ID_TOKEN);
      await expect(outage).rejects.toThrow(reason);
      await expect(outage).rejects.toBeInstanceOf(LineUnavailableError);
    },
  );
});
