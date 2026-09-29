import { users } from "@drawing-app/db";
import { and, eq, isNull } from "drizzle-orm";
import { Hono, type Context } from "hono";
import { z } from "zod";
import type { AppDeps, WorldId, WorldIdRpContext } from "../deps.ts";
import { failureCause, logFailure } from "../diagnostics.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import { liveUser, meOf } from "./session.ts";

/**
 * The World ID action age verification proves. A nullifier is the same for one World ID and one
 * action, so it's what stops one World ID verifying several accounts.
 */
export const AGE_VERIFICATION_ACTION = "croquis-age-18";
/**
 * The credential that counts as 18 or older: the Orb's, since World verifies no one under 18 at an
 * Orb. World ID 3.0 and 4.0 name it alike.
 */
const ORB_CREDENTIAL = "proof_of_human";

const hexSchema = z.string().regex(/^0x[0-9a-fA-F]{1,64}$/);

/**
 * IDKit's result, which the app forwards as IDKit gave it. Only the fields the server reads are
 * checked; World checks the rest, so everything goes to World as it came.
 */
const ageProofSchema = z.looseObject({
  protocol_version: z.enum(["3.0", "4.0"]),
  nonce: z.string().min(1),
  action: z.literal(AGE_VERIFICATION_ACTION),
  environment: z.string(),
  responses: z.array(z.looseObject({ identifier: z.string(), nullifier: hexSchema })).min(1),
});

/** IDKit's result, as POST /api/me/age-verification takes it. */
export type AgeProof = z.input<typeof ageProofSchema>;

/** POST /api/me/age-verification/request's answer: IDKit's request settings. */
export interface AgeVerificationRequest {
  appId: WorldId["appId"];
  action: string;
  environment: WorldId["environment"];
  rpContext: WorldIdRpContext;
}

/** A nullifier as one decimal string, so two spellings of one hex value can't both be stored. */
const decimalNullifier = (hex: string) => BigInt(hex).toString(10);

/** The answer when this server has no World ID app, so age verification is off. */
const notConfigured = (c: Context) =>
  apiError(c, 404, "age_verification_not_configured", "This server has no World ID app");

/** Age verification: proving with an Orb-verified World ID that you're 18 or older. */
export const ageVerificationRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    /** What IDKit needs to ask World App for the proof, signed with our RP key. */
    .post("/me/age-verification/request", (c) => {
      const { worldId } = deps;
      if (!worldId) return notConfigured(c);
      const user = liveUser(deps.db, c.var.userId);
      if (!user) return apiError(c, 401, "signed_out");
      if (user.ageVerifiedAt) return apiError(c, 409, "already_age_verified");
      const request: AgeVerificationRequest = {
        appId: worldId.appId,
        action: AGE_VERIFICATION_ACTION,
        environment: worldId.environment,
        rpContext: worldId.signRequest(AGE_VERIFICATION_ACTION),
      };
      return c.json(request, 200);
    })
    .post("/me/age-verification", validate("json", ageProofSchema), async (c) => {
      const { worldId } = deps;
      if (!worldId) return notConfigured(c);
      const proof = c.req.valid("json");
      // One response only: World answers 200 when any one of several proofs holds.
      const [response, ...others] = proof.responses;
      if (others.length > 0 || response.identifier !== ORB_CREDENTIAL) {
        return apiError(
          c,
          422,
          "age_not_proven",
          `responses: one ${ORB_CREDENTIAL} proof, from an Orb-verified World ID`,
        );
      }
      if (proof.environment !== worldId.environment) {
        return apiError(
          c,
          422,
          "age_not_proven",
          `environment: a ${proof.environment} proof, and this server takes ${worldId.environment} ones`,
        );
      }
      let verdict;
      try {
        verdict = await worldId.verifyProof(proof);
      } catch (error) {
        logFailure("world_id.verify.failed", error, { userId: c.var.userId });
        return apiError(
          c,
          502,
          "world_id_unavailable",
          `World couldn't check the proof: ${failureCause(error)}`,
        );
      }
      if (!verdict.verified) {
        return apiError(c, 422, "age_verification_refused", `${verdict.code}: ${verdict.detail}`);
      }
      // A World ID's 3.0 and 4.0 nullifiers differ, so one World ID could verify one account with each.
      const nullifier = decimalNullifier(verdict.nullifier ?? response.nullifier);
      const userId = c.var.userId;
      const outcome = deps.db.transaction(
        (tx) => {
          const holder = tx
            .select({ id: users.id })
            .from(users)
            .where(eq(users.ageVerificationNullifier, nullifier))
            .get();
          if (holder && holder.id !== userId) return "used" as const;
          return tx
            .update(users)
            .set({ ageVerifiedAt: deps.clock.now(), ageVerificationNullifier: nullifier })
            .where(and(eq(users.id, userId), isNull(users.deletedAt), isNull(users.ageVerifiedAt)))
            .returning()
            .get();
        },
        { behavior: "immediate" },
      );
      if (outcome === "used") {
        return apiError(c, 409, "age_verification_used", "This World ID verified another account");
      }
      // Already verified: the proof changes nothing, and the answer is the account as it is.
      const user = outcome ?? liveUser(deps.db, userId);
      if (!user) return apiError(c, 401, "signed_out");
      return c.json({ me: meOf(deps.db, user) }, 200);
    });
