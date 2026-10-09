import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AuthError, AUTH_FAILURE_STATUS, authFailureOf } from "./auth-error.js";
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

// The route takes LIFF's access token, which lives as long as LIFF counts the person logged in.
async function readAccessToken(request: IncomingMessage) {
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
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new AuthError({ code: "invalid_request", reason: "invalid_body" });
  }
  const accessToken: unknown = Reflect.get(parsed, "accessToken");
  if (typeof accessToken !== "string") {
    throw new AuthError({ code: "invalid_request", reason: "access_token_required" });
  }
  return accessToken;
}

/**
 * The LINE → Privy auth server: trades LIFF's access token for a Privy JWT, and serves the keys Privy
 * checks it with.
 */
export function createAuthHttpServer({
  issuer,
  appOrigin,
  logger = console,
}: {
  issuer: LinePrivyJwtIssuer;
  appOrigin: string;
  logger?: Logger;
}) {
  if (!appOrigin) throw new Error("APP_ORIGIN is required");

  async function answerPrivyJwt(request: IncomingMessage, response: ServerResponse) {
    try {
      const { jwt, expiresAt } = await issuer.issue(await readAccessToken(request));
      sendJson(response, 200, { jwt, expiresAt });
    } catch (error) {
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
    if (request.method !== "POST" || pathname !== "/v1/auth/privy-jwt") {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (request.headers.origin && request.headers.origin !== appOrigin) {
      sendJson(response, 403, { error: "origin_not_allowed" });
      return;
    }
    await answerPrivyJwt(request, response);
  }

  return createServer(async (request, response) => {
    // A rejection escaping this async handler would be unhandled, and that ends the process.
    try {
      await answer(request, response);
    } catch (error) {
      logger.error("Auth request failed", { error: authFailureOf(error) });
      if (response.headersSent) response.destroy();
      else sendJson(response, AUTH_FAILURE_STATUS.auth_unavailable, { error: "auth_unavailable" });
    }
  });
}
