import { signRequest } from "@worldcoin/idkit-server";
import { z } from "zod";
import type { WorldId } from "../deps.ts";

const VERIFY_TIMEOUT_MS = 15_000;

const verifiedSchema = z.object({ success: z.literal(true), nullifier: z.string().optional() });
const refusedSchema = z.object({ success: z.literal(false), code: z.string(), detail: z.string() });

interface WorldIdConfig {
  appId: `app_${string}`;
  rpId: string;
  /** The Developer Portal's RP signing key, hex. */
  signingKey: string;
  environment: WorldId["environment"];
}

/** World ID through the Developer Portal: requests signed with our RP key, proofs checked at its verify endpoint. */
export function createWorldId(config: WorldIdConfig, fetchImpl: typeof fetch = fetch): WorldId {
  const verifyUrl = `https://developer.world.org/api/v4/verify/${config.rpId}`;
  return {
    appId: config.appId,
    environment: config.environment,
    signRequest: (action) => {
      const signed = signRequest({ signingKeyHex: config.signingKey, action });
      return {
        rp_id: config.rpId,
        nonce: signed.nonce,
        created_at: signed.createdAt,
        expires_at: signed.expiresAt,
        signature: signed.sig,
      };
    },
    verifyProof: async (proof) => {
      const response = await fetchImpl(verifyUrl, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(proof),
        signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS),
      });
      const text = await response.text();
      let body: unknown;
      try {
        body = JSON.parse(text);
      } catch {
        throw new Error(`World's verify endpoint answered ${response.status}, not JSON: ${text}`);
      }
      const verified = verifiedSchema.safeParse(body);
      if (response.ok && verified.success) {
        return { verified: true, nullifier: verified.data.nullifier ?? null };
      }
      const refused = refusedSchema.safeParse(body);
      if (!response.ok && refused.success) {
        return { verified: false, code: refused.data.code, detail: refused.data.detail };
      }
      throw new Error(`World's verify endpoint answered ${response.status} with ${text}`);
    },
  };
}
