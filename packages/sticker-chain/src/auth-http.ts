import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
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
  line_auth_failed: 401,
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
  if (typeof idToken !== "string") throw new Error("idToken is required");
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
      logger.error("LINE authentication failed", { error });
      sendJson(response, 401, { error: "line_auth_failed" });
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
      logger.error("LINE chat menu switch failed", { error });
      // A request without a readable ID token fails LINE authentication, as it does for privy-jwt.
      const failure = error instanceof LineMenuSwitchError ? error.failure : "line_auth_failed";
      sendJson(response, LINE_MENU_FAILURE_STATUS[failure], { error: failure });
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
