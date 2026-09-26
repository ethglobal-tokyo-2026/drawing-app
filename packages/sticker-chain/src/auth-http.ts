import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AuthError, AUTH_FAILURE_STATUS, authFailureOf } from "./auth-error.js";
import type { LinePrivyJwtIssuer } from "./line-privy-jwt.js";

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

// The route takes LINE's ID token.
async function readIdToken(request: IncomingMessage) {
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    throw new AuthError({ code: "invalid_request", reason: "content_type_required" });
  }
  let body = "";
  for await (const chunk of request) {
    body += String(chunk);
    if (Buffer.byteLength(body) > 8000) {
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
  const idToken: unknown = Reflect.get(parsed, "idToken");
  if (typeof idToken !== "string") {
    throw new AuthError({ code: "invalid_request", reason: "id_token_required" });
  }
  return idToken;
}

/**
 * The LINE → Privy auth server: trades LINE's ID token for a Privy JWT, and serves the keys Privy
 * checks it with. The REST API links chat menus.
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
      const { jwt, expiresAt } = await issuer.issue(await readIdToken(request));
      sendJson(response, 200, { jwt, expiresAt });
    } catch (error) {
      const failure = authFailureOf(error);
      logger.error("Privy JWT issuance failed", { error: failure });
      sendJson(response, AUTH_FAILURE_STATUS[failure.code], { error: failure.code });
    }
  }

  const postRoutes = new Map([["/v1/auth/privy-jwt", answerPrivyJwt]]);

  return createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
    if (request.method === "GET" && pathname === "/.well-known/jwks.json") {
      sendJson(response, 200, issuer.jwks, { "cache-control": "public, max-age=300" });
      return;
    }
    const answer = request.method === "POST" ? postRoutes.get(pathname) : undefined;
    if (!answer) {
      sendJson(response, 404, { error: "not_found" });
      return;
    }
    if (request.headers.origin && request.headers.origin !== appOrigin) {
      sendJson(response, 403, { error: "origin_not_allowed" });
      return;
    }
    await answer(request, response);
  });
}
