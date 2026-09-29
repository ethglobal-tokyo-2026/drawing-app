import { createLineChatMenu } from "../chatMenu/lineChatMenu.ts";
import type { ChatMenuIds } from "../chatMenu/menus.ts";
import { createGiverNotice } from "../gifts/giverNotice.ts";
import { createLineMessaging, type BatchPhase, type MenuMove } from "../services/lineMessaging.ts";
import type { TestBase } from "./createTestApp.ts";

/** A made-up Messaging API channel. */
export const TEST_CHANNEL = { channelId: "2000000001", channelSecret: "test-channel-secret" };

/** A rich menu ID as LINE writes them, `richmenu-` and 32 lowercase hex digits: `name` in hex. */
const richMenuId = (name: string) =>
  `richmenu-${Buffer.from(name).toString("hex").padEnd(32, "0")}`;

/** Every chat menu in both languages, named for what it is, as deploy/line/menus.json maps them. */
export const TEST_CHAT_MENU_IDS = {
  en: {
    plain: richMenuId("en-plain"),
    "3": richMenuId("en-3"),
    "2": richMenuId("en-2"),
    "1": richMenuId("en-1"),
    reserve: richMenuId("en-reserve"),
    none: richMenuId("en-none"),
  },
  ja: {
    plain: richMenuId("ja-plain"),
    "3": richMenuId("ja-3"),
    "2": richMenuId("ja-2"),
    "1": richMenuId("ja-1"),
    reserve: richMenuId("ja-reserve"),
    none: richMenuId("ja-none"),
  },
  default: richMenuId("default"),
} satisfies ChatMenuIds;

/** Every rich menu ID in `ids`. */
const menuIdsIn = (ids: ChatMenuIds) =>
  [ids.default, ...Object.values(ids.en ?? {}), ...Object.values(ids.ja ?? {})].filter(
    (id): id is string => typeof id === "string",
  );

/** The calls a test can make fail. */
type Route = "token" | "link" | "read" | "unlink" | "batch" | "progress" | "push";

/** A text message LINE took for someone, with the retry key it came with. */
interface Push {
  to: string;
  text: string;
  retryKey: string | null;
}

/** What a call names: a person and a menu, or a batch's request ID. */
interface Target {
  lineUserId?: string;
  richMenuId?: string;
  requestId?: string | null;
}

interface Batch {
  requestId: string;
  resumeRequestKey: string;
  moves: MenuMove[];
  /** What the next progress calls report; the last one repeats. */
  phases: BatchPhase[];
  ran: boolean;
}

/** How long the fake's channel access tokens last, in seconds. */
export const TOKEN_LIFETIME_S = 900;
const RESUME_KEY = /^[a-zA-Z0-9_-]{1,100}$/;
const MAX_BATCH_OPERATIONS = 1000;
/** A retry key as LINE takes one: a UUID in hexadecimal. */
const RETRY_KEY = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_TEXT_LENGTH = 5000;

const field = (body: unknown, name: string): unknown =>
  body && typeof body === "object" ? Reflect.get(body, name) : undefined;

const isMove = (operation: unknown): operation is MenuMove & { type: "link" } =>
  field(operation, "type") === "link" &&
  typeof field(operation, "from") === "string" &&
  typeof field(operation, "to") === "string";

const refuse = (status: number, message: string) => Response.json({ message }, { status });

/**
 * LINE's Messaging API for chat menus and pushes, in memory, as a fetch function. It keeps who is
 * linked to which menu, and runs a batch's moves when its progress first reports it succeeded, as
 * LINE runs them some time after taking the batch. Linking someone in `strangers`, who hasn't added
 * the account, answers 200 and links nothing, as LINE does. A push with a retry key it took before
 * answers 409. `calls` lists every call, in order.
 */
export function createFakeLine({ menus = menuIdsIn(TEST_CHAT_MENU_IDS) } = {}) {
  const links = new Map<string, string>();
  const strangers = new Set<string>();
  const calls: string[] = [];
  const failures = new Map<Route, (Response | Error)[]>();
  const holds = new Map<Route, Promise<void>[]>();
  const lostAnswers = new Map<Route, number>();
  const batches: Batch[] = [];
  const pushes: Push[] = [];
  const tokens = new Set<string>();
  /** What the next batch's progress calls report. */
  let nextPhases: BatchPhase[] = ["succeeded"];

  async function issueToken(request: Request) {
    const form = new URLSearchParams(await request.text());
    if (
      form.get("grant_type") !== "client_credentials" ||
      form.get("client_id") !== TEST_CHANNEL.channelId ||
      form.get("client_secret") !== TEST_CHANNEL.channelSecret
    ) {
      return Response.json(
        { error: "invalid_client", error_description: "Invalid client_id or client_secret" },
        { status: 400 },
      );
    }
    const token = `fake-channel-token-${tokens.size + 1}`;
    tokens.add(token);
    return Response.json({
      token_type: "Bearer",
      access_token: token,
      expires_in: TOKEN_LIFETIME_S,
    });
  }

  function run(batch: Batch) {
    if (batch.ran) return;
    batch.ran = true;
    for (const [lineUserId, menu] of links) {
      const move = batch.moves.find(({ from }) => from === menu);
      if (move) links.set(lineUserId, move.to);
    }
  }

  async function takeBatch(request: Request) {
    const body: unknown = await request.json();
    const operations = field(body, "operations");
    const resumeRequestKey = field(body, "resumeRequestKey");
    if (
      !Array.isArray(operations) ||
      operations.length === 0 ||
      operations.length > MAX_BATCH_OPERATIONS ||
      !operations.every(isMove) ||
      typeof resumeRequestKey !== "string" ||
      !RESUME_KEY.test(resumeRequestKey)
    ) {
      return refuse(400, "The request body has 1 error(s)");
    }
    const moves = operations.map(({ from, to }) => ({ from, to }));
    if (moves.some(({ from, to }) => !menus.includes(from) || !menus.includes(to))) {
      return refuse(400, "richmenu not found");
    }
    const requestId = `fake-request-${batches.length + 1}`;
    batches.push({ requestId, resumeRequestKey, moves, phases: nextPhases, ran: false });
    nextPhases = ["succeeded"];
    return Response.json({}, { status: 202, headers: { "x-line-request-id": requestId } });
  }

  function reportProgress(requestId: string | null | undefined) {
    const batch = batches.find((sent) => sent.requestId === requestId);
    if (!batch) return refuse(404, "Not found");
    const phase = batch.phases.length > 1 ? batch.phases.shift() : batch.phases[0];
    if (phase === "succeeded") run(batch);
    return Response.json({ phase, acceptedTime: "2026-09-27T15:00:00.000Z" });
  }

  async function takePush(request: Request) {
    const retryKey = request.headers.get("x-line-retry-key");
    const body: unknown = await request.json();
    const to = field(body, "to");
    const messages = field(body, "messages");
    const message: unknown = Array.isArray(messages) ? messages[0] : undefined;
    const text = field(message, "text");
    if (
      (retryKey !== null && !RETRY_KEY.test(retryKey)) ||
      typeof to !== "string" ||
      !Array.isArray(messages) ||
      messages.length !== 1 ||
      field(message, "type") !== "text" ||
      typeof text !== "string" ||
      text.length === 0 ||
      text.length > MAX_TEXT_LENGTH
    ) {
      return refuse(400, "The request body has 1 error(s)");
    }
    if (retryKey !== null && pushes.some((push) => push.retryKey === retryKey)) {
      return refuse(409, "The retry key is already accepted");
    }
    pushes.push({ to, text, retryKey });
    return Response.json({ sentMessages: [{ id: String(pushes.length) }] });
  }

  async function respond(
    route: Route,
    request: Request,
    { lineUserId = "", richMenuId = "", requestId }: Target,
  ): Promise<Response> {
    if (route === "token") return issueToken(request);
    const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
    if (!token || !tokens.has(token)) return refuse(401, "Authentication failed");
    switch (route) {
      case "link":
        if (!menus.includes(richMenuId)) return refuse(404, "Not found");
        if (!strangers.has(lineUserId)) links.set(lineUserId, richMenuId);
        return Response.json({});
      case "read": {
        const linked = links.get(lineUserId);
        return linked
          ? Response.json({ richMenuId: linked })
          : refuse(404, "the user has no richmenu");
      }
      case "unlink":
        links.delete(lineUserId);
        return Response.json({});
      case "batch":
        return takeBatch(request);
      case "progress":
        return reportProgress(requestId);
      case "push":
        return takePush(request);
    }
  }

  async function answer(
    route: Route,
    request: Request,
    call: string,
    target: Target = {},
  ): Promise<Response> {
    calls.push(call);
    await holds.get(route)?.shift();
    const failure = failures.get(route)?.shift();
    if (failure instanceof Error) throw failure;
    if (failure) return failure;
    const response = await respond(route, request, target);
    const lost = lostAnswers.get(route) ?? 0;
    if (lost > 0) {
      lostAnswers.set(route, lost - 1);
      throw new TypeError("fetch failed: the answer was lost");
    }
    return response;
  }

  const fetchImpl: typeof fetch = async (input, init) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    const { method } = request;
    const user = /^\/v2\/bot\/user\/([^/]+)\/richmenu(?:\/([^/]+))?$/.exec(url.pathname);
    if (url.origin === "https://api.line.me" && user?.[1]) {
      const lineUserId = decodeURIComponent(user[1]);
      const richMenuId = user[2] === undefined ? undefined : decodeURIComponent(user[2]);
      if (method === "POST" && richMenuId) {
        return answer("link", request, `link ${lineUserId} ${richMenuId}`, {
          lineUserId,
          richMenuId,
        });
      }
      if (method === "GET" && !richMenuId) {
        return answer("read", request, `read ${lineUserId}`, { lineUserId });
      }
      if (method === "DELETE" && !richMenuId) {
        return answer("unlink", request, `unlink ${lineUserId}`, { lineUserId });
      }
    }
    const route = `${method} ${url.origin}${url.pathname}`;
    if (route === "POST https://api.line.me/oauth2/v3/token") {
      return answer("token", request, "token");
    }
    if (route === "POST https://api.line.me/v2/bot/richmenu/batch") {
      return answer("batch", request, "batch");
    }
    if (route === "GET https://api.line.me/v2/bot/richmenu/progress/batch") {
      const requestId = url.searchParams.get("requestId");
      return answer("progress", request, `progress ${requestId}`, { requestId });
    }
    if (route === "POST https://api.line.me/v2/bot/message/push") {
      return answer("push", request, `push ${request.headers.get("x-line-retry-key")}`);
    }
    throw new Error(`The fake LINE has no answer for ${method} ${url.href}`);
  };

  return {
    fetch: fetchImpl,
    /** Each person's linked menu, by LINE user ID. */
    links,
    /** People who haven't added the account, or blocked it. */
    strangers,
    calls,
    batches,
    /** The text messages LINE took, in order. */
    pushes,
    /** The next call to `route` answers `failure`: a response, or an Error for no answer. */
    failNext(route: Route, failure: Response | Error) {
      failures.set(route, [...(failures.get(route) ?? []), failure]);
    },
    /** The next call to `route` does what it asks, but its answer never arrives. */
    loseNextAnswer(route: Route) {
      lostAnswers.set(route, (lostAnswers.get(route) ?? 0) + 1);
    },
    /** The next call to `route` waits to be answered until the returned function is called. */
    holdNext(route: Route) {
      let release = () => {};
      const held = new Promise<void>((resolve) => {
        release = resolve;
      });
      holds.set(route, [...(holds.get(route) ?? []), held]);
      return release;
    },
    /** What the next batch's progress calls report, in turn; the last one repeats. */
    reportNextBatch(phases: BatchPhase[]) {
      nextPhases = [...phases];
    },
    /** The calls made since the last time this was asked, so a test sees only its own. */
    newCalls() {
      return calls.splice(0);
    },
  };
}

export type FakeLine = ReturnType<typeof createFakeLine>;

/** The Messaging API channel's calls, made to `line`. */
export const lineMessagingThrough = (line: FakeLine, now?: () => number) =>
  createLineMessaging({ ...TEST_CHANNEL, fetchImpl: line.fetch, now });

/** For createTestApp: the chat menu, linking through `line` on the test app's database and clock. */
export const chatMenuThrough =
  (line: FakeLine, ids: ChatMenuIds = TEST_CHAT_MENU_IDS) =>
  ({ db, clock }: TestBase) => ({
    lineChatMenu: createLineChatMenu({ db, clock, ids, line: lineMessagingThrough(line) }),
  });

/** For createTestApp: the giver's messages, pushed through `line` on the test app's database and clock. */
export const giverNoticeThrough =
  (line: FakeLine) =>
  ({ db, clock }: TestBase) => ({
    giverNotice: createGiverNotice({ db, clock, line: lineMessagingThrough(line) }),
  });
