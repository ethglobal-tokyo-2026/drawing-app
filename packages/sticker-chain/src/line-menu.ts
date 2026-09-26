import { createLineVerifier } from "./line.js";
import { privySubject } from "./line-privy-jwt.js";

const PRIVY_LOOKUP_URL = "https://api.privy.io/v1/users/custom_auth/id";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v3/token";
const LINE_USER_URL = "https://api.line.me/v2/bot/user";
const UPSTREAM_TIMEOUT_MS = 5000;
// Replaced a minute early, so no request goes out with a token about to expire.
const TOKEN_REPLACE_MARGIN_MS = 60_000;

type LineMenuOutcome =
  | { menu: "returning" }
  | { menu: "new"; reason: "not_signed_up" | "not_a_friend" };

export type LineMenuFailure = "line_auth_failed" | "privy_lookup_failed" | "line_menu_link_failed";

/** The languages the returning-user menu is drawn in. */
export type MenuLanguage = "en" | "ja";

/** The menu language for the app's language: Japanese for `ja`, English for anything else. */
export const menuLanguageOf = (value: unknown): MenuLanguage => (value === "ja" ? "ja" : "en");

export type SwitchLineMenu = (
  lineIdToken: string,
  language: MenuLanguage,
) => Promise<LineMenuOutcome>;

/** A switch that failed, named by the step that failed and carrying that step's error as its cause. */
export class LineMenuSwitchError extends Error {
  readonly failure: LineMenuFailure;

  constructor(failure: LineMenuFailure, step: string, cause: unknown) {
    super(`${step} failed: ${cause instanceof Error ? cause.message : String(cause)}`, { cause });
    this.name = "LineMenuSwitchError";
    this.failure = failure;
  }
}

interface LineMenuSwitchOptions {
  loginChannelId: string;
  privyAppId: string;
  privyAppSecret: string;
  messagingChannelId: string;
  messagingChannelSecret: string;
  /** The returning-user menu in each language; without a Japanese one, Japanese gets English. */
  returningRichMenuIds: { en: string; ja?: string };
  fetchImpl?: typeof fetch;
  now?: () => number;
}

async function step<T>(failure: LineMenuFailure, name: string, run: () => Promise<T>) {
  try {
    return await run();
  } catch (error) {
    throw new LineMenuSwitchError(failure, name, error);
  }
}

function field(body: unknown, name: string): unknown {
  return body && typeof body === "object" ? Reflect.get(body, name) : undefined;
}

// Only the upstream's own error text is kept, never the request, which carries the credentials.
async function responseError(response: Response, textField: string) {
  const body: unknown = await response.json().catch(() => null);
  const text = field(body, textField);
  return new Error(`HTTP ${response.status}${typeof text === "string" ? `: ${text}` : ""}`);
}

// An unread body keeps its connection busy until garbage collection.
async function discardBody(response: Response) {
  await response.body?.cancel();
}

/**
 * Switches someone with an account to the returning-user chat menu. Privy's users stand in for
 * accounts until the app has a users table.
 */
export function createLineMenuSwitch({
  loginChannelId,
  privyAppId,
  privyAppSecret,
  messagingChannelId,
  messagingChannelSecret,
  returningRichMenuIds,
  fetchImpl = fetch,
  now = Date.now,
}: LineMenuSwitchOptions): SwitchLineMenu {
  if (
    !loginChannelId ||
    !privyAppId ||
    !privyAppSecret ||
    !messagingChannelId ||
    !messagingChannelSecret ||
    !returningRichMenuIds.en
  ) {
    throw new Error("LINE chat menu switching configuration is incomplete");
  }
  const verifyLineIdToken = createLineVerifier({ channelId: loginChannelId, fetchImpl });
  const privyCredentials = Buffer.from(`${privyAppId}:${privyAppSecret}`).toString("base64");
  let channelToken: { value: string; replaceAt: number } | undefined;

  async function hasPrivyUser(subject: string) {
    const response = await fetchImpl(PRIVY_LOOKUP_URL, {
      method: "POST",
      headers: {
        authorization: `Basic ${privyCredentials}`,
        "privy-app-id": privyAppId,
        "content-type": "application/json",
        // Privy's API refuses some default user agents.
        "user-agent": "sticker-auth/1",
      },
      body: JSON.stringify({ custom_user_id: subject }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    // Privy answers 404 when no user has this custom auth ID.
    if (response.status !== 200 && response.status !== 404) {
      throw await responseError(response, "error");
    }
    await discardBody(response);
    return response.status === 200;
  }

  async function channelAccessToken() {
    if (channelToken && now() < channelToken.replaceAt) return channelToken.value;
    const requestedAt = now();
    const response = await fetchImpl(LINE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: messagingChannelId,
        client_secret: messagingChannelSecret,
      }),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!response.ok) throw await responseError(response, "error_description");
    const body: unknown = await response.json();
    const value = field(body, "access_token");
    const expiresIn = field(body, "expires_in");
    if (typeof value !== "string" || !value || typeof expiresIn !== "number") {
      throw new Error("LINE's token response lacks access_token or expires_in");
    }
    channelToken = { value, replaceAt: requestedAt + expiresIn * 1000 - TOKEN_REPLACE_MARGIN_MS };
    return value;
  }

  function userMenuUrl(lineUserId: string) {
    return `${LINE_USER_URL}/${encodeURIComponent(lineUserId)}/richmenu`;
  }

  async function linkReturningMenu(lineUserId: string, richMenuId: string, token: string) {
    const response = await fetchImpl(
      `${userMenuUrl(lineUserId)}/${encodeURIComponent(richMenuId)}`,
      {
        method: "POST",
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      },
    );
    if (!response.ok) throw await responseError(response, "message");
    await discardBody(response);
  }

  async function hasReturningMenu(lineUserId: string, richMenuId: string, token: string) {
    const response = await fetchImpl(userMenuUrl(lineUserId), {
      headers: { authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    // 404: the user has no menu of their own.
    if (response.status === 404) {
      await discardBody(response);
      return false;
    }
    if (!response.ok) throw await responseError(response, "message");
    return field(await response.json(), "richMenuId") === richMenuId;
  }

  return async function switchLineMenu(lineIdToken, language) {
    const { sub } = await step("line_auth_failed", "LINE ID token verification", () =>
      verifyLineIdToken(lineIdToken),
    );
    const signedUp = await step("privy_lookup_failed", "Privy user lookup", () =>
      hasPrivyUser(privySubject(loginChannelId, sub)),
    );
    if (!signedUp) return { menu: "new", reason: "not_signed_up" };
    const token = await step(
      "line_menu_link_failed",
      "LINE channel access token request",
      channelAccessToken,
    );
    const richMenuId = returningRichMenuIds[language] ?? returningRichMenuIds.en;
    // The Login and Messaging API channels share a provider, so both know the person by this user ID.
    await step("line_menu_link_failed", "LINE rich menu link", () =>
      linkReturningMenu(sub, richMenuId, token),
    );
    // LINE also answers 200 when it links nothing: the person hasn't added the account as a friend, or blocked it.
    const linked = await step("line_menu_link_failed", "LINE rich menu read-back", () =>
      hasReturningMenu(sub, richMenuId, token),
    );
    return linked ? { menu: "returning" } : { menu: "new", reason: "not_a_friend" };
  };
}
