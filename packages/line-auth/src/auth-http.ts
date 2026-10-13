import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AuthError, AUTH_FAILURE_STATUS, authFailureOf } from "./auth-error.js";
import { PrivyAssertionError, verifyPrivyAssertion } from "./internalAssertion.ts";
import type { LinePrivyJwtIssuer } from "./line-privy-jwt.js";

/** The largest request body the Privy JWT route reads. */
export const MAX_AUTH_BODY_BYTES = 8000;

interface Logger {
  error: (message: string, details: { error: unknown }) => void;
}

function sendJson(
  response: ServerResponse,
  status: number,
  body: object,
  headers: Record<string, string> = {},
) {
  response.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    ...headers,
  });
  response.end(JSON.stringify(body));
}

// Only authenticated internal assertions reach the signing key.
async function readAssertion(request: IncomingMessage) {
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    throw new AuthError({ code: "invalid_request", reason: "content_type_required" });
  }
  let body = "";
  for await (const chunk of request) {
    body += String(chunk);
    if (Buffer.byteLength(body) > MAX_AUTH_BODY_BYTES) {
      throw new AuthError({ code: "invalid_request", reason: "body_too_large" });
    }
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch {
    throw new AuthError({ code: "invalid_request", reason: "invalid_json" });
  }
  return parsed;
}

/**
 * The protected Privy issuer serves public verification keys and signs API-authorized identities.
 */
export function createAuthHttpServer({
  issuer,
  internalSecret,
  logger = console,
}: {
  issuer: LinePrivyJwtIssuer;
  internalSecret: string;
  logger?: Logger;
}) {
  if (internalSecret.length < 32) throw new Error("PRIVY_JWT_INTERNAL_SECRET is required");

  async function answerPrivyJwt(request: IncomingMessage, response: ServerResponse) {
    try {
      const assertion = verifyPrivyAssertion(
        await readAssertion(request),
        internalSecret,
        Math.floor(Date.now() / 1000),
      );
      const result = await issuer.issueAuthorized(
        assertion.selectedLineUserId,
        assertion.expiresAt,
      );
      sendJson(response, 200, result);
    } catch (error) {
      if (error instanceof PrivyAssertionError) {
        logger.error("Privy authorization refused", { error: { code: "internal_auth_forbidden" } });
        sendJson(response, 403, { error: "internal_auth_forbidden" });
        return;
      }
      const failure = authFailureOf(error);
      logger.error("Privy JWT issuance failed", { error: failure });
      sendJson(response, AUTH_FAILURE_STATUS[failure.code], { error: failure.code });
    }
  }

  async function answer(request: IncomingMessage, response: ServerResponse) {
    // URL.parse returns null for a path such as "//", where new URL throws.
    const pathname = URL.parse(request.url ?? "/", "http://localhost")?.pathname;
    if (request.method === "GET" && pathname === "/.well-known/jwks.json") {
      sendJson(response, 200, issuer.jwks, { "cache-control": "public, max-age=300" });
      return;
    }
    if (request.method !== "POST" || pathname !== "/_internal/privy-jwt") {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    await answerPrivyJwt(request, response);
  }

  const server = createServer(async (request, response) => {
    // A rejection escaping this async handler would be unhandled, and that ends the process.
    try {
      await answer(request, response);
    } catch (error) {
      logger.error("Auth request failed", { error: authFailureOf(error) });
      if (response.headersSent) response.destroy();
      else sendJson(response, AUTH_FAILURE_STATUS.auth_unavailable, { error: "auth_unavailable" });
    }
  });
  server.requestTimeout = 10_000;
  server.headersTimeout = 10_000;
  server.setTimeout(10_000, (socket) => {
    logger.error("Auth request timed out", {
      error: { code: "auth_unavailable", reason: "timeout" },
    });
    socket.destroy();
  });
  return server;
}
