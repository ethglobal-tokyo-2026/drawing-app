import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import type { LinePrivyJwtIssuer } from "./line-privy-jwt.js";

interface ErrorLogger {
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

async function readJson(request: IncomingMessage) {
  if (!request.headers["content-type"]?.startsWith("application/json")) {
    throw new Error("JSON content type is required");
  }
  let body = "";
  for await (const chunk of request) {
    body += String(chunk);
    if (body.length > 8000) throw new Error("Request body exceeds 8000 bytes");
  }
  const parsed: unknown = JSON.parse(body);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("JSON body must be an object");
  }
  const idToken: unknown = Reflect.get(parsed, "idToken");
  return { idToken };
}

export function createAuthHttpServer({
  issuer,
  appOrigin,
  logger = console,
}: {
  issuer: LinePrivyJwtIssuer;
  appOrigin: string;
  logger?: ErrorLogger;
}) {
  if (!appOrigin) throw new Error("APP_ORIGIN is required");
  return createServer(async (request, response) => {
    const pathname = new URL(request.url ?? "/", "http://localhost").pathname;
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
    try {
      const { idToken } = await readJson(request);
      if (typeof idToken !== "string") throw new Error("idToken is required");
      const { jwt, expiresAt } = await issuer.issue(idToken);
      sendJson(response, 200, { jwt, expiresAt });
    } catch (error) {
      logger.error("LINE authentication failed", { error });
      sendJson(response, 401, { error: "line_auth_failed" });
    }
  });
}
