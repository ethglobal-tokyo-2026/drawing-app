import { describe, expect, it } from "vitest";
import { LineTokenInvalidError, type LineProfile } from "../deps.ts";
import { createLineVerifier } from "./lineVerifier.ts";

const CHANNEL_ID = "channel";

/** A verifier whose LINE answers with `status` and `body`; `sent` holds the forms LINE was sent. */
const verifierAnswering = (status: number, body: unknown) => {
  const sent: Array<Record<string, string>> = [];
  const verifier = createLineVerifier(CHANNEL_ID, (_url, init) => {
    if (init?.body instanceof URLSearchParams) sent.push(Object.fromEntries(init.body));
    return Promise.resolve(
      new Response(typeof body === "string" ? body : JSON.stringify(body), { status }),
    );
  });
  return { verifier, sent };
};

describe("the LINE verifier", () => {
  it("sends LINE the token and our channel, and returns the profile the token names", async () => {
    const profile: LineProfile = { sub: "U1", name: "Alice", picture: "https://profile.test/a" };
    const claims = { iss: "https://access.line.me", aud: CHANNEL_ID, exp: 0, ...profile };
    const { verifier, sent } = verifierAnswering(200, claims);
    expect(await verifier.verifyIdToken("token")).toEqual(profile);
    expect(sent).toEqual([{ id_token: "token", client_id: CHANNEL_ID }]);
  });

  it.each([
    {
      body: { error: "invalid_request", error_description: "IdToken expired." },
      reason: "expired",
    },
    {
      body: { error: "invalid_request", error_description: "Invalid IdToken Audience." },
      reason: "invalid",
    },
    {
      body: { error: "invalid_request", error_description: "Invalid IdToken." },
      reason: "invalid",
    },
    { body: "IdToken expired.", reason: "invalid" },
    { body: { message: "IdToken expired." }, reason: "invalid" },
  ])("classifies a provider refusal as $reason from $body", async ({ body, reason }) => {
    const refused = verifierAnswering(400, body).verifier.verifyIdToken("token");
    await expect(refused).rejects.toBeInstanceOf(LineTokenInvalidError);
    await expect(refused).rejects.toMatchObject({ reason });
  });

  it("keeps the provider's reason without the submitted token or unrelated response fields", async () => {
    const token = "sensitive-id-token";
    const refused = verifierAnswering(400, {
      error: "invalid_request",
      error_description: `Invalid IdToken: ${token}`,
      access_token: "sensitive-access-token",
    }).verifier.verifyIdToken(token);
    await expect(refused).rejects.toMatchObject({
      message: "invalid_request: Invalid IdToken: [redacted-id-token]",
      reason: "invalid",
    });
  });

  it("tells a refused token from LINE being unreachable", async () => {
    const outage = verifierAnswering(503, {}).verifier.verifyIdToken("token");
    await expect(outage).rejects.toThrow();
    await expect(outage).rejects.not.toBeInstanceOf(LineTokenInvalidError);
    const disconnected = createLineVerifier(CHANNEL_ID, () =>
      Promise.reject(new TypeError("Network unavailable")),
    ).verifyIdToken("token");
    await expect(disconnected).rejects.toThrow("Network unavailable");
    await expect(disconnected).rejects.not.toBeInstanceOf(LineTokenInvalidError);
  });
});
