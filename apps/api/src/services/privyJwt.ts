import {
  authenticatePrivyAssertion,
  type PrivyJwtAssertion,
  type PrivyJwtResult,
} from "@drawing-app/line-auth/internalAssertion";
import { z } from "zod";

export interface PrivyJwtService {
  issue: (assertion: PrivyJwtAssertion, signal: AbortSignal) => Promise<PrivyJwtResult>;
}
export class PrivyJwtUnavailableError extends Error {
  constructor() {
    super("Protected Privy issuer unavailable");
  }
}
const resultSchema = z
  .object({ jwt: z.string().min(1), subject: z.string().min(1), expiresAt: z.number().int() })
  .strict();

/** The API delegates only to the protected issuer on this machine. */
export function createPrivyJwtService({
  url,
  secret,
  fetchImpl = fetch,
}: {
  url: string;
  secret: string;
  fetchImpl?: typeof fetch;
}): PrivyJwtService {
  const destination = new URL(url);
  if (
    destination.protocol !== "http:" ||
    !["127.0.0.1", "[::1]"].includes(destination.hostname) ||
    destination.username ||
    destination.password ||
    destination.search ||
    destination.hash ||
    destination.pathname !== "/_internal/privy-jwt"
  ) {
    throw new Error("PRIVY_JWT_INTERNAL_URL must name the loopback protected issuer");
  }
  if (secret.length < 32)
    throw new Error("PRIVY_JWT_INTERNAL_SECRET must contain at least 32 characters");
  return {
    issue: async (assertion, signal) => {
      try {
        signal.throwIfAborted();
        const response = await fetchImpl(destination, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(authenticatePrivyAssertion(assertion, secret)),
          signal,
          redirect: "error",
        });
        if (!response.ok) throw new PrivyJwtUnavailableError();
        const result = resultSchema.parse(await response.json());
        signal.throwIfAborted();
        if (result.expiresAt > assertion.expiresAt || result.expiresAt <= assertion.issuedAt)
          throw new PrivyJwtUnavailableError();
        return result;
      } catch {
        // Upstream response bodies and exception messages may contain assertions or credentials.
        // The route logs this fixed failure and returns a persistent, reviewable unavailable error.
        throw new PrivyJwtUnavailableError();
      }
    },
  };
}
