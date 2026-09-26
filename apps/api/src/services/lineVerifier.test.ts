import { describe, expect, it } from "vitest";
import { LineTokenInvalidError, type LineProfile } from "../deps.ts";
import { createLineVerifier } from "./lineVerifier.ts";

const CHANNEL_ID = "channel";

/** A verifier whose LINE answers with `status` and `body`; `sent` holds the forms LINE was sent. */
const verifierAnswering = (status: number, body: unknown) => {
  const sent: Array<Record<string, string>> = [];
  const verifier = createLineVerifier(CHANNEL_ID, (_url, init) => {
    if (init?.body instanceof URLSearchParams) sent.push(Object.fromEntries(init.body));
    return Promise.resolve(new Response(JSON.stringify(body), { status }));
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

  it("tells a refused token from LINE being unreachable", async () => {
    const refusal = { error: "invalid_request", error_description: "IdToken expired." };
    const refused = verifierAnswering(400, refusal).verifier.verifyIdToken("token");
    await expect(refused).rejects.toBeInstanceOf(LineTokenInvalidError);
    const outage = verifierAnswering(503, {}).verifier.verifyIdToken("token");
    await expect(outage).rejects.toThrow();
    await expect(outage).rejects.not.toBeInstanceOf(LineTokenInvalidError);
  });
});
