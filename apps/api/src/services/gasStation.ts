import { TransactionDataBuilder } from "@mysten/sui/transactions";
import { fromBase64, toBase64 } from "@mysten/sui/utils";
import { z } from "zod";
import { failureCause, logFailure } from "../diagnostics.ts";
import { SponsorshipError, type GasStation } from "../sui/types.ts";

/** Shinami's Gas Station on Sui, in the region its keys default to. */
export const SHINAMI_GAS_STATION_URL = "https://api.us1.shinami.com/sui/gas/v1";
/**
 * A request's two attempts and the pause between them, together. Packaging and the checkout build
 * a kind and then wait on this inside the app's own request limit (REQUEST_TIMEOUT_MS in the
 * frontend's httpApi.ts), so their answer, which can carry a Gift Claim Token, still reaches it.
 */
export const GAS_STATION_DEADLINE_MS = 6_000;
/** The pause before the one retry of a request Shinami couldn't answer, as it asks of rate limits. */
const GAS_STATION_RETRY_MS = 500;
/** Each attempt's share of the deadline, so a stalled first attempt leaves its retry as long. */
const ATTEMPT_TIMEOUT_MS = (GAS_STATION_DEADLINE_MS - GAS_STATION_RETRY_MS) / 2;

/** gas_sponsorTransactionBlock's answer. */
const sponsoredSchema = z.object({
  txBytes: z.base64(),
  txDigest: z.string().min(1),
  signature: z.base64(),
  /** Unix seconds. */
  expireAtTime: z.number().int().positive(),
});

/** gas_getFund's answer, in MIST. */
const fundSchema = z.object({
  balance: z.number().int().nonnegative(),
  inFlight: z.number().int().nonnegative(),
});

const rpcErrorSchema = z.object({
  error: z.object({
    code: z.number().int(),
    message: z.string(),
    data: z.union([z.string(), z.looseObject({ details: z.string().optional() })]).optional(),
  }),
});
const rpcResultSchema = z.object({ result: z.unknown() });

/** A JSON-RPC error in Shinami's words: its message, and the details it adds. */
function shinamiWords({ error }: z.infer<typeof rpcErrorSchema>): string {
  const details = typeof error.data === "string" ? error.data : error.data?.details;
  return details ? `${error.message}: ${details}` : error.message;
}

/**
 * What a JSON-RPC error means for the caller. Shinami answers these over HTTP 200: a refused dry
 * run is invalid params, and the rest are its documented codes. Any other code means this server
 * sent something Shinami doesn't take, which only a fix here mends.
 */
function rpcFailure(method: string, answer: z.infer<typeof rpcErrorSchema>): Error {
  const words = shinamiWords(answer);
  switch (answer.error.code) {
    case -32602:
      return new SponsorshipError("refused", words);
    case -2:
      return new SponsorshipError("fund_empty", words);
    // No gas object free, rate limited, or Shinami's own internal error.
    case -1:
    case -32010:
    case -32603:
      return new SponsorshipError("unavailable", words);
    default:
      return new Error(
        `Shinami's ${method} failed with JSON-RPC error ${answer.error.code}: ${words}`,
      );
  }
}

/**
 * Shinami Gas Station over its JSON-RPC API. Each request gets one retry when Shinami couldn't
 * answer it. A refused access key rejects with a plain Error: only the server's settings mend it.
 */
export function createShinamiGasStation({
  accessKey,
  url = SHINAMI_GAS_STATION_URL,
  fetchImpl = fetch,
}: {
  accessKey: string;
  url?: string;
  fetchImpl?: typeof fetch;
}): GasStation {
  async function request<T>(method: string, params: unknown[], schema: z.ZodType<T>): Promise<T> {
    const unavailable = (why: string, cause?: unknown) =>
      new SponsorshipError("unavailable", `Shinami's ${method} ${why}`, { cause });
    // The timeout covers reading the body too.
    const signal = AbortSignal.timeout(ATTEMPT_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetchImpl(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Api-Key": accessKey },
        body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
        signal,
      });
    } catch (error) {
      throw unavailable(`couldn't be reached: ${failureCause(error)}`, error);
    }
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Shinami refused the access key for ${method} (HTTP ${response.status})`);
    }
    if (response.status === 429 || response.status >= 500) {
      throw unavailable(`answered HTTP ${response.status}`);
    }
    if (!response.ok) throw new Error(`Shinami's ${method} answered HTTP ${response.status}`);
    let body: unknown;
    try {
      body = await response.json();
    } catch (error) {
      throw unavailable(
        `answered with a body that couldn't be read: ${failureCause(error)}`,
        error,
      );
    }
    const failed = rpcErrorSchema.safeParse(body);
    if (failed.success) throw rpcFailure(method, failed.data);
    const answered = rpcResultSchema.safeParse(body);
    const result = answered.success ? schema.safeParse(answered.data.result) : null;
    if (!result?.success) {
      throw unavailable(`answered in a shape this server doesn't read`, result?.error);
    }
    return result.data;
  }

  async function withOneRetry<T>(method: string, attempt: () => Promise<T>): Promise<T> {
    try {
      try {
        return await attempt();
      } catch (error) {
        if (!(error instanceof SponsorshipError) || error.reason !== "unavailable") throw error;
        logFailure("sponsor.retrying", error, { stage: method });
        await new Promise((resolve) => setTimeout(resolve, GAS_STATION_RETRY_MS));
        return await attempt();
      }
    } catch (error) {
      logFailure("sponsor.failed", error, {
        stage: method,
        reason: error instanceof SponsorshipError ? error.reason : undefined,
      });
      throw error;
    }
  }

  return {
    sponsor: (kind, sender) =>
      withOneRetry("gas_sponsorTransactionBlock", async () => {
        const sponsored = await request(
          "gas_sponsorTransactionBlock",
          [toBase64(kind), sender],
          sponsoredSchema,
        );
        // Every row is followed by its digest, so it must be the one the bytes hash to.
        const digest = TransactionDataBuilder.getDigestFromBytes(fromBase64(sponsored.txBytes));
        if (digest !== sponsored.txDigest) {
          throw new Error(
            `Shinami named digest ${sponsored.txDigest} for a transaction whose digest is ${digest}`,
          );
        }
        return {
          digest,
          txBytes: sponsored.txBytes,
          sponsorSignature: sponsored.signature,
          expiresAt: new Date(sponsored.expireAtTime * 1000),
        };
      }),
    available: () =>
      withOneRetry("gas_getFund", async () => {
        const fund = await request("gas_getFund", [], fundSchema);
        return BigInt(fund.balance) - BigInt(fund.inFlight);
      }),
  };
}
