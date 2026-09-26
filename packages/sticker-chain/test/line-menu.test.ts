import { inspect } from "node:util";
import { describe, expect, it, onTestFinished } from "vitest";
import { createLineMenuSwitch } from "../src/line-menu.js";
import { privySubject, type LinePrivyJwtIssuer } from "../src/line-privy-jwt.js";
import { APP_ORIGIN, startAuthServer } from "./helpers/auth-server.js";

const LOGIN_CHANNEL_ID = "login-channel-123";
const LINE_USER_ID = "U0123456789abcdef0123456789abcdef";
const ID_TOKEN = "line-id-token-from-liff";
const PRIVY_APP_ID = "privy-app-123";
const PRIVY_APP_SECRET = "privy-app-secret-456";
const MESSAGING_CHANNEL_ID = "messaging-channel-789";
const MESSAGING_CHANNEL_SECRET = "messaging-channel-secret-abc";
const CHANNEL_TOKEN = "channel-access-token-def";
const CHANNEL_TOKEN_LIFETIME_S = 900;
const RICH_MENU_ID = "richmenu-returning";

// The fake fetch answers each upstream request by its method and URL.
const VERIFY = "POST https://api.line.me/oauth2/v2.1/verify";
const PRIVY_LOOKUP = "POST https://api.privy.io/v1/users/custom_auth/id";
const ISSUE_TOKEN = "POST https://api.line.me/oauth2/v3/token";
const LINK = `POST https://api.line.me/v2/bot/user/${LINE_USER_ID}/richmenu/${RICH_MENU_ID}`;
const READ_BACK = `GET https://api.line.me/v2/bot/user/${LINE_USER_ID}/richmenu`;

type Upstream = () => Response | Promise<Response>;

// Someone with an account who has added the official account as a friend.
const RETURNING_FRIEND: Record<string, Upstream> = {
  [VERIFY]: () =>
    Response.json({
      iss: "https://access.line.me",
      aud: LOGIN_CHANNEL_ID,
      sub: LINE_USER_ID,
      exp: Math.floor(Date.now() / 1000) + 3600,
    }),
  [PRIVY_LOOKUP]: () => Response.json({ id: "did:privy:returning", linked_accounts: [] }),
  [ISSUE_TOKEN]: () =>
    Response.json({
      token_type: "Bearer",
      access_token: CHANNEL_TOKEN,
      expires_in: CHANNEL_TOKEN_LIFETIME_S,
    }),
  [LINK]: () => Response.json({}),
  [READ_BACK]: () => Response.json({ richMenuId: RICH_MENU_ID }),
};

const unusedIssuer: LinePrivyJwtIssuer = {
  jwks: { keys: [] },
  issue: () => Promise.reject(new Error("These tests don't issue Privy JWTs")),
};

function postLineMenu(url: string, body: object = { idToken: ID_TOKEN }, origin = APP_ORIGIN) {
  return fetch(`${url}/v1/auth/line-menu`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Serves the menu switch over a fake fetch that answers from `upstreams`, falling back to a
 * returning friend's answers, and records each request. After the test it checks that no ID
 * token, secret, channel token or user ID reached the log.
 */
async function startMenuServer(upstreams: Record<string, Upstream> = {}, now?: () => number) {
  const requests: { key: string; request: Request; signal: AbortSignal | null | undefined }[] = [];
  const fetchImpl: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const key = `${request.method} ${request.url}`;
    requests.push({ key, request, signal: init?.signal });
    const answer = upstreams[key] ?? RETURNING_FRIEND[key];
    if (!answer) throw new Error(`The fake fetch has no answer for ${key}`);
    return answer();
  };
  const server = await startAuthServer({
    issuer: unusedIssuer,
    switchLineMenu: createLineMenuSwitch({
      loginChannelId: LOGIN_CHANNEL_ID,
      privyAppId: PRIVY_APP_ID,
      privyAppSecret: PRIVY_APP_SECRET,
      messagingChannelId: MESSAGING_CHANNEL_ID,
      messagingChannelSecret: MESSAGING_CHANNEL_SECRET,
      returningRichMenuId: RICH_MENU_ID,
      fetchImpl,
      now,
    }),
  });
  onTestFinished(() => {
    const logged = inspect([server.info, server.errors], { depth: null });
    for (const secret of [
      ID_TOKEN,
      PRIVY_APP_SECRET,
      btoa(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`),
      MESSAGING_CHANNEL_SECRET,
      CHANNEL_TOKEN,
      LINE_USER_ID,
      privySubject(LOGIN_CHANNEL_ID, LINE_USER_ID),
    ]) {
      expect(logged).not.toContain(secret);
    }
  });
  return {
    ...server,
    post: (body?: object, origin?: string) => postLineMenu(server.url, body, origin),
    requested: () => requests.map(({ key }) => key),
    signals: () => requests.map(({ signal }) => signal),
    requestTo: (key: string) => {
      const found = requests.find((request) => request.key === key);
      if (!found) throw new Error(`Nothing requested ${key}`);
      return found.request;
    },
  };
}

describe("LINE chat menu switch", () => {
  it("links the returning-user menu for someone with an account, once reading it back confirms it", async () => {
    const menu = await startMenuServer();
    const response = await menu.post();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ menu: "returning" });
    expect(menu.requested()).toEqual([VERIFY, PRIVY_LOOKUP, ISSUE_TOKEN, LINK, READ_BACK]);
    expect(menu.signals().every((signal) => signal instanceof AbortSignal)).toBe(true);
    expect(menu.info).toEqual([expect.stringContaining("returning")]);
  });

  it("sends Privy and LINE the subject, credentials and token each expects", async () => {
    const menu = await startMenuServer();
    await menu.post();

    const lookup = menu.requestTo(PRIVY_LOOKUP);
    expect(lookup.headers.get("authorization")).toBe(
      `Basic ${btoa(`${PRIVY_APP_ID}:${PRIVY_APP_SECRET}`)}`,
    );
    expect(lookup.headers.get("privy-app-id")).toBe(PRIVY_APP_ID);
    expect(lookup.headers.get("content-type")).toBe("application/json");
    expect(lookup.headers.get("user-agent")).toBeTruthy();
    await expect(lookup.json()).resolves.toEqual({
      custom_user_id: privySubject(LOGIN_CHANNEL_ID, LINE_USER_ID),
    });

    const tokenForm = new URLSearchParams(await menu.requestTo(ISSUE_TOKEN).text());
    expect(Object.fromEntries(tokenForm)).toEqual({
      grant_type: "client_credentials",
      client_id: MESSAGING_CHANNEL_ID,
      client_secret: MESSAGING_CHANNEL_SECRET,
    });
    for (const key of [LINK, READ_BACK]) {
      expect(menu.requestTo(key).headers.get("authorization")).toBe(`Bearer ${CHANNEL_TOKEN}`);
    }
  });

  it("leaves someone without an account on the default menu, and links nothing", async () => {
    const menu = await startMenuServer({
      [PRIVY_LOOKUP]: () =>
        Response.json({ error: "User not found with provided custom auth ID." }, { status: 404 }),
    });
    const response = await menu.post();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ menu: "new", reason: "not_signed_up" });
    expect(menu.requested()).toEqual([VERIFY, PRIVY_LOOKUP]);
    expect(menu.info).toEqual([expect.stringContaining("not_signed_up")]);
  });

  it.each([
    [
      "no menu of their own",
      () => Response.json({ message: "the user has no richmenu", details: [] }, { status: 404 }),
    ],
    ["another menu", () => Response.json({ richMenuId: "richmenu-other" })],
  ])(
    "answers not_a_friend when LINE accepts the link but reads back %s",
    async (_case, readBack) => {
      const menu = await startMenuServer({ [READ_BACK]: readBack });
      const response = await menu.post();

      expect(response.status).toBe(200);
      await expect(response.json()).resolves.toEqual({ menu: "new", reason: "not_a_friend" });
      expect(menu.requested()).toContain(LINK);
      expect(menu.info).toEqual([expect.stringContaining("not_a_friend")]);
    },
  );

  it("answers 401 when LINE rejects the ID token or the request has none", async () => {
    const menu = await startMenuServer({
      [VERIFY]: () =>
        Response.json(
          { error: "invalid_request", error_description: "IdToken expired." },
          { status: 400 },
        ),
    });

    for (const body of [{ idToken: ID_TOKEN }, {}]) {
      const response = await menu.post(body);
      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({ error: "line_auth_failed" });
    }
    expect(menu.requested()).toEqual([VERIFY]);
    expect(menu.errors).toHaveLength(2);
    expect(String(menu.errors[0])).toContain("IdToken expired.");
  });

  it("answers 403 to another origin without calling LINE or Privy", async () => {
    const menu = await startMenuServer();
    const response = await menu.post({ idToken: ID_TOKEN }, "https://other.example");

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "origin_not_allowed" });
    expect(menu.requested()).toEqual([]);
  });

  it("answers 503 when the server was started without a menu switch", async () => {
    const { url } = await startAuthServer({ issuer: unusedIssuer });
    const response = await postLineMenu(url);

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "menu_switching_off" });
  });

  it.each([
    [
      "refuses the app's credentials",
      () => Response.json({ error: "Invalid app ID or app secret." }, { status: 401 }),
      /Privy.*401.*Invalid app ID or app secret\./,
    ],
    [
      "times out",
      () =>
        Promise.reject(
          new DOMException("The operation was aborted due to timeout", "TimeoutError"),
        ),
      /Privy.*timeout/,
    ],
  ])("answers 502 privy_lookup_failed when Privy %s", async (_case, lookup, logged) => {
    const menu = await startMenuServer({ [PRIVY_LOOKUP]: lookup });
    const response = await menu.post();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "privy_lookup_failed" });
    expect(menu.requested()).not.toContain(LINK);
    expect(menu.errors.map(String)).toEqual([expect.stringMatching(logged)]);
  });

  it.each([
    [
      "LINE refuses the Messaging API channel's credentials",
      ISSUE_TOKEN,
      () =>
        Response.json(
          { error: "invalid_request", error_description: "Invalid 'client_credentials'." },
          { status: 400 },
        ),
      /token.*400.*Invalid 'client_credentials'\./,
    ],
    [
      "the menu doesn't exist",
      LINK,
      () => Response.json({ message: "Not found" }, { status: 404 }),
      /link.*404.*Not found/,
    ],
    [
      "reading the menu back fails",
      READ_BACK,
      () => Response.json({ message: "Internal server error" }, { status: 500 }),
      /read-back.*500.*Internal server error/,
    ],
  ])("answers 502 line_menu_link_failed when %s", async (_case, key, answer, logged) => {
    const menu = await startMenuServer({ [key]: answer });
    const response = await menu.post();

    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "line_menu_link_failed" });
    expect(menu.errors.map(String)).toEqual([expect.stringMatching(logged)]);
  });

  it("reuses the channel access token until shortly before it expires", async () => {
    let now = 0;
    const menu = await startMenuServer({}, () => now);
    const switchAt = async (time: number) => {
      now = time;
      await expect((await menu.post()).json()).resolves.toEqual({ menu: "returning" });
    };
    const tokensIssued = () => menu.requested().filter((key) => key === ISSUE_TOKEN).length;

    await switchAt(0);
    await switchAt(60_000);
    expect(tokensIssued()).toBe(1);
    await switchAt((CHANNEL_TOKEN_LIFETIME_S - 30) * 1000);
    expect(tokensIssued()).toBe(2);
  });
});
