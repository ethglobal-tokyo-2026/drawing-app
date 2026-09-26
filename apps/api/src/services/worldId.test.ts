import { describe, expect, it } from "vitest";
import { createWorldId } from "./worldId.ts";

/** World ID whose verify endpoint answers `status` and `body`; `sent` holds each request. */
function worldIdAnswering(status: number, body: string) {
  const sent: { url: string; body: unknown }[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const url = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
    sent.push({ url, body: typeof init?.body === "string" ? JSON.parse(init.body) : init?.body });
    return Promise.resolve(new Response(body, { status }));
  };
  const worldId = createWorldId(
    {
      appId: "app_test",
      rpId: "rp_test",
      signingKey: `0x${"11".repeat(32)}`,
      environment: "production",
    },
    fetchImpl,
  );
  return { worldId, sent };
}

const PROOF = { protocol_version: "4.0", nonce: "0x01" };

describe("World ID's verify endpoint", () => {
  it("sends the proof to our RP's endpoint and takes World's nullifier", async () => {
    const { worldId, sent } = worldIdAnswering(
      200,
      '{"success":true,"results":[],"nullifier":"0x05"}',
    );
    expect(await worldId.verifyProof(PROOF)).toEqual({ verified: true, nullifier: "0x05" });
    expect(sent).toEqual([
      { url: "https://developer.world.org/api/v4/verify/rp_test", body: PROOF },
    ]);
  });

  it.each([400, 404])(
    "gives World's code and detail for a proof it refuses with %i",
    async (status) => {
      const { worldId } = worldIdAnswering(
        status,
        '{"success":false,"code":"all_verifications_failed","detail":"All proof verifications failed."}',
      );
      expect(await worldId.verifyProof(PROOF)).toEqual({
        verified: false,
        code: "all_verifications_failed",
        detail: "All proof verifications failed.",
      });
    },
  );

  it("rejects, with what came back, an answer that's neither", async () => {
    await expect(worldIdAnswering(502, "Bad Gateway").worldId.verifyProof(PROOF)).rejects.toThrow(
      /502, not JSON: Bad Gateway/,
    );
    await expect(
      worldIdAnswering(200, '{"success":false}').worldId.verifyProof(PROOF),
    ).rejects.toThrow(/answered 200/);
  });

  it("signs requests as IDKit's rp_context for our RP", () => {
    const context = worldIdAnswering(200, "{}").worldId.signRequest("croquis-age-18");
    expect(context.rp_id).toBe("rp_test");
    expect(context.expires_at).toBeGreaterThan(context.created_at);
  });
});
