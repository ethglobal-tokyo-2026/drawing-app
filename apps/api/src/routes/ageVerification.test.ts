import { insertUser } from "@drawing-app/db/testing";
import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import type { WorldIdVerdict } from "../deps.ts";
import { meSchema } from "../shapes.ts";
import { createTestApp } from "../testing/createTestApp.ts";
import { fakeWorldId } from "../testing/fakes.ts";
import { bodyOf, refusalOf } from "../testing/responses.ts";
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

/** The app with World answering `verdict`; `worldId: null` turns it off. */
async function setUp(verdict?: WorldIdVerdict | Error | null) {
  const worldId = verdict === null ? null : fakeWorldId(verdict);
  const test = await createTestApp({ worldId });
  return {
    test,
    worldId,
    /** A new person, who the proofs below are sent as. */
    newPerson: () => insertUser(test.db),
    requestProof: (userId: string) =>
      test.send("POST", "/api/me/age-verification/request", { as: userId }),
    sendProof: (userId: string, body: unknown = ageProof()) =>
      test.send("POST", "/api/me/age-verification", { as: userId, body }),
  };
}

const meIn = async (response: Response) => (await bodyOf(response, z.object({ me: meSchema }))).me;

describe("asking for a proof", () => {
  it("signs a request for the age action", async () => {
    const { worldId, newPerson, requestProof } = await setUp();
    const response = await requestProof(newPerson());
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      appId: worldId?.appId,
      action: AGE_VERIFICATION_ACTION,
      rpContext: worldId?.signRequest(AGE_VERIFICATION_ACTION),
    });
  });

  it("is refused without a World ID app, and once you're verified", async () => {
    const off = await setUp(null);
    expect(await refusalOf(await off.requestProof(off.newPerson()))).toMatchObject({
      status: 404,
      error: "age_verification_not_configured",
    });

    const on = await setUp();
    const userId = on.newPerson();
    await on.sendProof(userId);
    expect(await refusalOf(await on.requestProof(userId))).toMatchObject({
      status: 409,
      error: "already_age_verified",
    });
  });
});

describe("sending the proof", () => {
  it("marks you verified once World checks it, with the proof sent to World as the app gave it", async () => {
    const { test, worldId, newPerson, sendProof } = await setUp();
    expect(await meIn(await sendProof(newPerson()))).toMatchObject({
      ageVerifiedAt: test.clock.now().toISOString(),
      ageStatus: "adult",
    });
    expect(worldId?.proofs).toEqual([ageProof()]);
  });

  it("takes a World ID 3.0's Orb proof too", async () => {
    const { newPerson, sendProof } = await setUp();
    const legacy = ageProof({
      protocol_version: "3.0",
      responses: [
        { identifier: "proof_of_human", proof: "0x1a", merkle_root: "0x1b", nullifier: NULLIFIER },
      ],
    });
    expect((await meIn(await sendProof(newPerson(), legacy))).ageVerifiedAt).not.toBeNull();
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
    const { worldId, newPerson, sendProof } = await setUp();
    expect(await refusalOf(await sendProof(newPerson(), proof))).toMatchObject({
      status: 422,
      error: "age_not_proven",
    });
    expect(worldId?.proofs).toEqual([]);
  });

  it("passes on World's refusal, and says World couldn't be asked when it can't", async () => {
    const refused = await setUp({ verified: false, code: "invalid_proof", detail: "bad" });
    expect(await refusalOf(await refused.sendProof(refused.newPerson()))).toEqual({
      status: 422,
      error: "age_verification_refused",
      detail: "invalid_proof: bad",
    });

    vi.spyOn(console, "error").mockImplementation(() => {});
    const down = await setUp(new Error("timed out"));
    expect(await refusalOf(await down.sendProof(down.newPerson()))).toMatchObject({
      status: 502,
      error: "world_id_unavailable",
    });
  });

  it("lets one World ID verify one live account, whichever way its nullifier is spelled", async () => {
    const { test, newPerson, sendProof } = await setUp();
    const first = newPerson();
    await meIn(await sendProof(first));

    const respelled = ageProof({
      responses: [{ identifier: "proof_of_human", nullifier: "0x0004E5F6" }],
    });
    const second = newPerson();
    expect(await refusalOf(await sendProof(second, respelled))).toMatchObject({
      status: 409,
      error: "age_verification_used",
    });

    // Deleting the first account frees the World ID for another.
    expect((await test.send("DELETE", "/api/me", { as: first })).status).toBe(204);
    expect((await meIn(await sendProof(second, respelled))).ageVerifiedAt).not.toBeNull();
  });
});
