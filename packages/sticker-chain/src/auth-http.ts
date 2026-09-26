import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { AuthError, AUTH_FAILURE_STATUS, authFailureOf } from "./auth-error.js";
import {
  LineMenuSwitchError,
  menuLanguageOf,
  type LineMenuFailure,
  type SwitchLineMenu,
} from "./line-menu.js";
import type { LinePrivyJwtIssuer } from "./line-privy-jwt.js";

interface Logger {
  info: (message: string) => void;
  error: (message: string, details: { error: unknown }) => void;
}

const LINE_MENU_FAILURE_STATUS: Record<LineMenuFailure, number> = {
  privy_lookup_failed: 502,
  line_menu_link_failed: 502,
};

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

// Both routes take LINE's ID token; only the chat menu's uses the app's language.
async function readBody(request: IncomingMessage) {
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
  return { idToken, language: menuLanguageOf(Reflect.get(parsed, "language")) };
}

export function createAuthHttpServer({
  issuer,
  switchLineMenu,
  appOrigin,
  logger = console,
}: {
  issuer: LinePrivyJwtIssuer;
  /** Absent when the server lacks the menu switch's credentials or menu ID. */
  switchLineMenu?: SwitchLineMenu;
  appOrigin: string;
  logger?: Logger;
}) {
  if (!appOrigin) throw new Error("APP_ORIGIN is required");

  async function answerPrivyJwt(request: IncomingMessage, response: ServerResponse) {
    try {
      const { idToken } = await readBody(request);
      const { jwt, expiresAt } = await issuer.issue(idToken);
      sendJson(response, 200, { jwt, expiresAt });
    } catch (error) {
      const failure = authFailureOf(error);
      logger.error("Privy JWT issuance failed", { error: failure });
      sendJson(response, AUTH_FAILURE_STATUS[failure.code], { error: failure.code });
    }
  }

  async function answerLineMenu(request: IncomingMessage, response: ServerResponse) {
    if (!switchLineMenu) {
      sendJson(response, 503, { error: "menu_switching_off" });
      return;
    }
    try {
      const { idToken, language } = await readBody(request);
      const outcome = await switchLineMenu(idToken, language);
      logger.info(
        `LINE chat menu: ${outcome.menu === "returning" ? "returning" : `new, ${outcome.reason}`}`,
      );
      sendJson(response, 200, outcome);
    } catch (error) {
      if (error instanceof LineMenuSwitchError) {
        logger.error("LINE chat menu switch failed", { error });
        sendJson(response, LINE_MENU_FAILURE_STATUS[error.failure], { error: error.failure });
      } else {
        const failure = authFailureOf(error);
        logger.error("LINE chat menu switch failed", { error: failure });
        sendJson(response, AUTH_FAILURE_STATUS[failure.code], { error: failure.code });
      }
    }
  }

  const postRoutes = new Map([
    ["/v1/auth/privy-jwt", answerPrivyJwt],
    ["/v1/auth/line-menu", answerLineMenu],
  ]);

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
