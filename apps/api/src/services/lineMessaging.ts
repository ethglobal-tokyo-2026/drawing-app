const LINE_TOKEN_URL = "https://api.line.me/oauth2/v3/token";
const LINE_BOT_URL = "https://api.line.me/v2/bot";
const UPSTREAM_TIMEOUT_MS = 5000;
// Replaced a minute early, so no request goes out with a token about to expire.
const TOKEN_REPLACE_MARGIN_MS = 60_000;

/** One move of LINE's batch: everyone whose chat menu is `from` gets `to`. */
export interface MenuMove {
  from: string;
  to: string;
}

/** How far LINE has got with a batch. */
export type BatchPhase = "ongoing" | "succeeded" | "failed";
const isBatchPhase = (value: unknown): value is BatchPhase =>
  value === "ongoing" || value === "succeeded" || value === "failed";

/** The Messaging API channel's calls that set each person's chat menu. */
export interface LineMessaging {
  /** Links a person's chat menu. LINE also answers 200 for someone who hasn't added the account. */
  linkMenu: (lineUserId: string, richMenuId: string) => Promise<void>;
  /** The chat menu linked to the person; null when none is. */
  linkedMenu: (lineUserId: string) => Promise<string | null>;
  /** Unlinks a person's chat menu, so LINE shows them the default one. */
  unlinkMenu: (lineUserId: string) => Promise<void>;
  /**
   * Starts a batch that moves everyone linked to each `from` onto its `to`. A second call with the
   * same `resumeRequestKey` resumes the first. Resolves with the request ID LINE reports progress by.
   */
  moveMenus: (moves: readonly MenuMove[], resumeRequestKey: string) => Promise<string>;
  /** The phase of the batch with that request ID. */
  batchPhase: (requestId: string) => Promise<BatchPhase>;
}

/** LINE answered with an error, or didn't answer: `status` is 0 then. */
export class LineApiError extends Error {
  name = "LineApiError";
  readonly status: number;

  constructor(status: number, message: string, options?: ErrorOptions) {
    super(message, options);
    this.status = status;
  }

  /** Whether asking again later can help: no answer, a rate limit, or LINE's own failure. */
  get retryable() {
    return this.status === 0 || this.status === 429 || this.status >= 500;
  }
}

function field(body: unknown, name: string): unknown {
  return body && typeof body === "object" ? Reflect.get(body, name) : undefined;
}

// Only LINE's own error text is kept, never the request, which carries the credentials.
async function responseError(step: string, response: Response, textField = "message") {
  const body: unknown = await response.json().catch(() => null);
  const text = field(body, textField);
  return new LineApiError(
    response.status,
    `${step}: HTTP ${response.status}${typeof text === "string" ? `: ${text}` : ""}`,
  );
}

// An unread body keeps its connection busy until garbage collection.
async function discardBody(response: Response) {
  await response.body?.cancel();
}

/**
 * The Messaging API channel's chat menu calls, with its channel access token: a stateless one,
 * issued from the channel's ID and secret and kept until shortly before it expires.
 */
export function createLineMessaging({
  channelId,
  channelSecret,
  fetchImpl = fetch,
  now = Date.now,
}: {
  channelId: string;
  channelSecret: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}): LineMessaging {
  if (!channelId || !channelSecret) {
    throw new Error("The Messaging API channel's ID and secret are required");
  }
  let channelToken: { value: string; replaceAt: number } | undefined;

  /** One call to LINE, bounded in time; no answer is a LineApiError with status 0. */
  async function call(step: string, url: string, init: RequestInit) {
    try {
      return await fetchImpl(url, { ...init, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) });
    } catch (error) {
      throw new LineApiError(
        0,
        `${step}: no answer: ${error instanceof Error ? error.message : String(error)}`,
        { cause: error },
      );
    }
  }

  async function channelAccessToken() {
    if (channelToken && now() < channelToken.replaceAt) return channelToken.value;
    const step = "LINE channel access token request";
    const requestedAt = now();
    const response = await call(step, LINE_TOKEN_URL, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: channelId,
        client_secret: channelSecret,
      }),
    });
    if (!response.ok) throw await responseError(step, response, "error_description");
    const body: unknown = await response.json();
    const value = field(body, "access_token");
    const expiresIn = field(body, "expires_in");
    if (typeof value !== "string" || !value || typeof expiresIn !== "number") {
      throw new LineApiError(response.status, `${step}: no access_token or expires_in`);
    }
    channelToken = { value, replaceAt: requestedAt + expiresIn * 1000 - TOKEN_REPLACE_MARGIN_MS };
    return value;
  }

  /** A call with the channel access token. */
  async function bot(step: string, path: string, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("authorization", `Bearer ${await channelAccessToken()}`);
    return call(step, `${LINE_BOT_URL}${path}`, { ...init, headers });
  }

  const userMenu = (lineUserId: string) => `/user/${encodeURIComponent(lineUserId)}/richmenu`;

  return {
    async linkMenu(lineUserId, richMenuId) {
      const step = "LINE rich menu link";
      const path = `${userMenu(lineUserId)}/${encodeURIComponent(richMenuId)}`;
      const response = await bot(step, path, { method: "POST" });
      if (!response.ok) throw await responseError(step, response);
      await discardBody(response);
    },

    async linkedMenu(lineUserId) {
      const step = "LINE rich menu read-back";
      const response = await bot(step, userMenu(lineUserId));
      // 404: no menu of their own.
      if (response.status === 404) {
        await discardBody(response);
        return null;
      }
      if (!response.ok) throw await responseError(step, response);
      const richMenuId = field(await response.json(), "richMenuId");
      return typeof richMenuId === "string" ? richMenuId : null;
    },

    async unlinkMenu(lineUserId) {
      const step = "LINE rich menu unlink";
      const response = await bot(step, userMenu(lineUserId), { method: "DELETE" });
      // 404: nothing was linked.
      if (!response.ok && response.status !== 404) throw await responseError(step, response);
      await discardBody(response);
    },

    async moveMenus(moves, resumeRequestKey) {
      const step = "LINE rich menu batch";
      const response = await bot(step, "/richmenu/batch", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          operations: moves.map(({ from, to }) => ({ type: "link", from, to })),
          resumeRequestKey,
        }),
      });
      if (!response.ok) throw await responseError(step, response);
      await discardBody(response);
      const requestId = response.headers.get("x-line-request-id");
      if (!requestId) throw new LineApiError(response.status, `${step}: no x-line-request-id`);
      return requestId;
    },

    async batchPhase(requestId) {
      const step = "LINE rich menu batch progress";
      const query = new URLSearchParams({ requestId });
      const response = await bot(step, `/richmenu/progress/batch?${query.toString()}`);
      if (!response.ok) throw await responseError(step, response);
      const phase = field(await response.json(), "phase");
      if (!isBatchPhase(phase)) {
        throw new LineApiError(response.status, `${step}: unknown phase ${String(phase)}`);
      }
      return phase;
    },
  };
}
