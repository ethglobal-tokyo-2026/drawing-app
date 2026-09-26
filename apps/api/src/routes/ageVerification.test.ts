import { insertUser } from "@drawing-app/db/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { WorldIdVerdict } from "../deps.ts";
import { errorBodySchema } from "../errors.ts";
import { meSchema } from "../shapes.ts";
import { createTestApp } from "../testing/createTestApp.ts";
import { fakeWorldId } from "../testing/fakes.ts";
import { AGE_VERIFICATION_ACTION } from "./ageVerification.ts";

const NULLIFIER = "0x04e5f6";

/** IDKit's result for an Orb-verified World ID 4.0; `overrides` replace its fields. */
const ageProof = (overrides: Record<string, unknown> = {}) => ({
  protocol_version: "4.0",
  nonce: "0x01",
  action: AGE_VERIFICATION_ACTION,
  environment: "production",
  responses: [{ identifier: "proof_of_human", proof: ["0x1a"], nullifier: NULLIFIER }],
  ...overrides,
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** The app with World answering `verdict`, and a signed-in person; `worldId: null` turns it off. */
async function setUp(verdict?: WorldIdVerdict | Error | null) {
  const worldId = verdict === null ? null : fakeWorldId(verdict);
  const test = await createTestApp({ worldId });
  const signIn = async () => test.signInAs(insertUser(test.db));
  const post = async (path: string, headers: Record<string, string>, body?: unknown) =>
    test.app.request(`/api/me/age-verification${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  return {
    test,
    worldId,
    signIn,
    requestProof: (headers: Record<string, string>) => post("/request", headers),
    sendProof: (headers: Record<string, string>, body: unknown = ageProof()) =>
      post("", headers, body),
  };
}

const refusal = async (response: Response) => ({
  status: response.status,
  ...errorBodySchema.parse(await response.json()),
});

async function meIn(response: Response) {
  expect(response.status).toBe(200);
  return z.object({ me: meSchema }).parse(await response.json()).me;
}

describe("asking for a proof", () => {
  it("signs a request for the age action", async () => {
    const { signIn, requestProof } = await setUp();
    const response = await requestProof(await signIn());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      appId: "app_test",
      action: AGE_VERIFICATION_ACTION,
      rpContext: { rp_id: "rp_test" },
    });
  });

  it("is refused without a World ID app, and once you're verified", async () => {
    const off = await setUp(null);
    expect(await refusal(await off.requestProof(await off.signIn()))).toMatchObject({
      status: 404,
      error: "age_verification_not_configured",
    });

    const on = await setUp();
    const headers = await on.signIn();
    await on.sendProof(headers);
    expect(await refusal(await on.requestProof(headers))).toMatchObject({
      status: 409,
      error: "already_age_verified",
    });
  });
});

describe("sending the proof", () => {
  it("marks you verified once World checks it, with the proof sent to World as the app gave it", async () => {
    const { test, worldId, signIn, sendProof } = await setUp();
    const headers = await signIn();
    expect((await meIn(await sendProof(headers))).ageVerifiedAt).toBe(
      test.clock.now().toISOString(),
    );
    expect(worldId?.proofs).toEqual([ageProof()]);
  });

  it("takes a World ID 3.0's Orb proof too", async () => {
    const { signIn, sendProof } = await setUp();
    const legacy = ageProof({
      protocol_version: "3.0",
      responses: [
        { identifier: "proof_of_human", proof: "0x1a", merkle_root: "0x1b", nullifier: NULLIFIER },
      ],
    });
    expect((await meIn(await sendProof(await signIn(), legacy))).ageVerifiedAt).not.toBeNull();
  });

  it.each([
    {
      refused: "a proof of anything but the Orb's",
      proof: ageProof({ responses: [{ identifier: "passport", nullifier: NULLIFIER }] }),
    },
    {
      refused: "an Orb proof beside another, since World takes any one that holds",
      proof: ageProof({
        responses: [
          { identifier: "proof_of_human", proof: ["0x1a"], nullifier: NULLIFIER },
          { identifier: "passport", nullifier: "0x09" },
        ],
      }),
    },
    { refused: "a proof from another environment", proof: ageProof({ environment: "staging" }) },
  ])("refuses $refused without asking World", async ({ proof }) => {
    const { worldId, signIn, sendProof } = await setUp();
    expect(await refusal(await sendProof(await signIn(), proof))).toMatchObject({
      status: 422,
      error: "age_not_proven",
    });
    expect(worldId?.proofs).toEqual([]);
  });

  it("passes on World's refusal, and says World couldn't be asked when it can't", async () => {
    const refused = await setUp({ verified: false, code: "invalid_proof", detail: "bad" });
    expect(await refusal(await refused.sendProof(await refused.signIn()))).toEqual({
      status: 422,
      error: "age_verification_refused",
      detail: "invalid_proof: bad",
    });

    vi.spyOn(console, "error").mockImplementation(() => {});
    const down = await setUp(new Error("timed out"));
    expect(await refusal(await down.sendProof(await down.signIn()))).toMatchObject({
      status: 502,
      error: "world_id_unavailable",
    });
  });

  it("lets one World ID verify one live account, whichever way its nullifier is spelled", async () => {
    const { test, signIn, sendProof } = await setUp();
    const first = await signIn();
    await meIn(await sendProof(first));

    const respelled = ageProof({
      responses: [{ identifier: "proof_of_human", nullifier: "0x0004E5F6" }],
    });
    const second = await signIn();
    expect(await refusal(await sendProof(second, respelled))).toMatchObject({
      status: 409,
      error: "age_verification_used",
    });

    // Deleting the first account frees the World ID for another.
    expect((await test.app.request("/api/me", { method: "DELETE", headers: first })).status).toBe(
      204,
    );
    expect((await meIn(await sendProof(second, respelled))).ageVerifiedAt).not.toBeNull();
  });
});
