import type { AppType, ErrorBody, Me } from "@drawing-app/api/client";
import { hc, type InferRequestType } from "hono/client";
import { ApiError, type ApiClient, type GiftOpening } from "./apiClient";
import { startNftRequest } from "./httpDiagnostics";
import { reportSessionLost } from "./sessionLoss";

/** A request that hasn't answered by then fails with Try again, rather than hanging the screen. */
const REQUEST_TIMEOUT_MS = 15_000;
/** Sealing uploads five images, which takes longer on a phone's connection. */
const SEAL_TIMEOUT_MS = 60_000;
const RECEIVE_TIMEOUT_MS = 120_000;
/** A signed transaction's answer waits on the server sending it and Sui running it. */
const SIGNED_TIMEOUT_MS = 60_000;

const isErrorBody = (v: unknown): v is ErrorBody =>
  typeof v === "object" &&
  v !== null &&
  "error" in v &&
  typeof v.error === "string" &&
  (!("detail" in v) || v.detail === undefined || typeof v.detail === "string");

const urlOf = (input: RequestInfo | URL) =>
  typeof input === "string" ? input : input instanceof URL ? input.href : input.url;

const describe = (error: unknown) => (error instanceof Error ? error.message : String(error));

/**
 * The typed client over the REST API on this origin, so the session cookie goes along. A request
 * that gets no answer, or none in time, is an ApiError with status 0.
 */
export function createServerClient(fetchImpl: typeof fetch = fetch) {
  return hc<AppType>("/", {
    fetch: async (input: RequestInfo | URL, init?: RequestInit) => {
      const diagnostic = startNftRequest(
        urlOf(input),
        init?.method ?? (input instanceof Request ? input.method : "GET"),
      );
      try {
        const response = await fetchImpl(input, {
          ...init,
          credentials: "same-origin",
          signal: init?.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        diagnostic?.completed(response);
        return response;
      } catch (error) {
        diagnostic?.networkFailed();
        throw new ApiError(0, {
          error: "network",
          detail: `${init?.method ?? "GET"} ${urlOf(input)} got no answer: ${describe(error)}`,
        });
      }
    },
  }).api;
}

type ServerClient = ReturnType<typeof createServerClient>;

/**
 * A refusal as an ApiError with the server's code. An answer that isn't the API's error body
 * keeps its status, and says what came back instead.
 */
async function refusal(response: Response, what: string): Promise<ApiError> {
  const text = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    body = undefined;
  }
  const error = new ApiError(
    response.status,
    isErrorBody(body)
      ? body
      : {
          error: `http_${response.status}`,
          detail: `${what} answered ${response.status}: ${text}`,
        },
  );
  if (error.status === 401 && error.code === "signed_out") reportSessionLost(error);
  return error;
}

type GiftClaimToken = `0x${string}`;

/** Gift Claim Tokens are 0x and 64 lowercase hex digits; the server refuses anything else. */
const isGiftClaimToken = (token: string): token is GiftClaimToken => /^0x[0-9a-f]{64}$/.test(token);

/**
 * The request with its token checked. A token that can't be one is a link to no gift, which the
 * server answers gift_not_found, so the screen shows that refusal without asking it.
 */
function claimOf(body: GiftOpening) {
  const { giftClaimToken } = body;
  if (!isGiftClaimToken(giftClaimToken)) {
    throw new ApiError(404, {
      error: "gift_not_found",
      detail: `giftClaimToken: not 0x and 64 hex digits (${giftClaimToken.slice(0, 20)}…)`,
    });
  }
  return { ...body, giftClaimToken };
}

/** Signing in and your account, which the app needs before any screen can load. */
export interface SessionApi {
  /** POST /api/session: LINE's ID token, and LINE's language, which the account takes while it follows LINE's. */
  signIn: (
    request: InferRequestType<ServerClient["session"]["$post"]>["json"],
  ) => Promise<{ me: Me }>;
  /** GET /api/me; only resume a session belonging to this LINE user when supplied. */
  me: (lineUserId?: string) => Promise<{ me: Me }>;
  /** POST /api/me/handle */
  setHandle: (handle: string) => Promise<{ me: Me }>;
  /** DELETE /api/session: ends the session, so the cookie is gone. */
  signOut: () => Promise<void>;
}

export function createSessionApi(api: ServerClient = createServerClient()): SessionApi {
  return {
    signIn: async (request) => {
      const response = await api.session.$post({ json: request });
      if (!response.ok) throw await refusal(response, "POST /api/session");
      return response.json();
    },
    signOut: async () => {
      const response = await api.session.$delete();
      if (!response.ok) throw await refusal(response, "DELETE /api/session");
    },
    me: async (lineUserId) => {
      const response = await api.me.$get(
        { header: lineUserId ? { "x-line-user-id": lineUserId } : {} },
        { init: { cache: "no-store" } },
      );
      if (!response.ok) throw await refusal(response, "GET /api/me");
      return response.json();
    },
    setHandle: async (handle) => {
      const response = await api.me.handle.$post({ json: { handle } });
      if (!response.ok) throw await refusal(response, "POST /api/me/handle");
      return response.json();
    },
  };
}

/** The app's client over the REST API, once you're signed in. */
export function createHttpApi(api: ServerClient = createServerClient()): ApiClient {
  const boards = api["sticker-boards"];
  const gift = (giftId: string) => ({ param: { giftId } });

  return {
    setLanguageChoice: async (languageChoice, language) => {
      const response = await api.me["language-choice"].$post({
        json: { languageChoice, language },
      });
      if (!response.ok) throw await refusal(response, "POST /api/me/language-choice");
      return (await response.json()).me;
    },
    setNsfwOptIn: async (nsfwOptIn) => {
      const response = await api.me["nsfw-opt-in"].$post({ json: { nsfwOptIn } });
      if (!response.ok) throw await refusal(response, "POST /api/me/nsfw-opt-in");
      return (await response.json()).me;
    },
    setKyotoSeikaPractice: async (change) => {
      const response = await api.me["kyoto-seika-practice"].$post({ json: change });
      if (!response.ok) throw await refusal(response, "POST /api/me/kyoto-seika-practice");
      return (await response.json()).me;
    },

    stickerBoard: async (userId = "me") => {
      const response = await boards[":userId"].$get({ param: { userId } });
      if (!response.ok) throw await refusal(response, `GET /api/sticker-boards/${userId}`);
      return response.json();
    },
    userStats: async (userId = "me") => {
      const response = await boards[":userId"]["user-stats"].$get({ param: { userId } });
      if (!response.ok) {
        throw await refusal(response, `GET /api/sticker-boards/${userId}/user-stats`);
      }
      return (await response.json()).userStats;
    },
    saveStickerPlacement: async (stickerId, placement) => {
      const response = await boards.me["sticker-placements"][":stickerId"].$patch({
        param: { stickerId },
        json: placement,
      });
      if (!response.ok) {
        throw await refusal(
          response,
          `PATCH /api/sticker-boards/me/sticker-placements/${stickerId}`,
        );
      }
      return (await response.json()).stickerPlacement;
    },
    markTraySeen: async (stickerIds) => {
      const response = await boards.me["sticker-tray"].seen.$post({
        json: { stickerIds: [...stickerIds] },
      });
      if (!response.ok) {
        throw await refusal(response, "POST /api/sticker-boards/me/sticker-tray/seen");
      }
      return response.json();
    },

    seal: async (request) => {
      const png = (blob: Blob, name: string) => new File([blob], name, { type: "image/png" });
      const response = await api.stickers.$post(
        {
          form: {
            ticketUseId: String(request.ticketUseId),
            timeUsed: String(request.timeUsed),
            width: String(request.width),
            height: String(request.height),
            outline: request.outline,
            png: png(request.png, "sticker.png"),
            mask: png(request.mask, "mask.png"),
            spec: png(request.spec, "spec.png"),
            rim: png(request.rim, "rim.png"),
            flat: png(request.flat, "flat.png"),
            nsfw: request.nsfw ? "true" : "false",
            ...(request.kyotoSeikaSubjects && {
              kyotoSeikaSubjects: JSON.stringify(request.kyotoSeikaSubjects),
            }),
            ...(request.timelapse && {
              timelapse: new File([request.timelapse], "timelapse.json.gz", {
                type: "application/gzip",
              }),
            }),
          },
        },
        { init: { signal: AbortSignal.timeout(SEAL_TIMEOUT_MS) } },
      );
      if (!response.ok) throw await refusal(response, "POST /api/stickers");
      return response.json();
    },
    stickerDetail: async (stickerId) => {
      const response = await api.stickers[":stickerId"].$get({ param: { stickerId } });
      if (!response.ok) throw await refusal(response, `GET /api/stickers/${stickerId}`);
      return response.json();
    },
    timelapse: async (stickerId) => {
      const response = await api.stickers[":stickerId"].timelapse.$get({ param: { stickerId } });
      if (!response.ok) throw await refusal(response, `GET /api/stickers/${stickerId}/timelapse`);
      return response.json();
    },
    markStickerNsfw: async (stickerId) => {
      const response = await api.stickers[":stickerId"].nsfw.$post({ param: { stickerId } });
      if (!response.ok) throw await refusal(response, `POST /api/stickers/${stickerId}/nsfw`);
      return response.json();
    },

    tickets: async () => {
      const response = await api.tickets.$get();
      if (!response.ok) throw await refusal(response, "GET /api/tickets");
      return (await response.json()).tickets;
    },
    spendTicket: async (spend) => {
      const response = await api.tickets.spend.$post({ json: spend });
      if (!response.ok) throw await refusal(response, "POST /api/tickets/spend");
      return response.json();
    },
    ticketShop: async () => {
      const response = await api["ticket-shop"].$get();
      if (!response.ok) throw await refusal(response, "GET /api/ticket-shop");
      return (await response.json()).shop;
    },
    startTicketPurchase: async (tickets) => {
      const response = await api["ticket-purchases"].start.$post({ json: { tickets } });
      if (!response.ok) throw await refusal(response, "POST /api/ticket-purchases/start");
      return response.json();
    },
    buyTickets: async (payment) => {
      const response = await api["ticket-purchases"].$post(
        { json: payment },
        { init: { signal: AbortSignal.timeout(SIGNED_TIMEOUT_MS) } },
      );
      if (!response.ok) throw await refusal(response, "POST /api/ticket-purchases");
      return (await response.json()).tickets;
    },

    packageGift: async (stickerId, forUserId) => {
      const response = await api.gifts.$post({
        json: { stickerId, ...(forUserId && { forUserId }) },
      });
      if (!response.ok) throw await refusal(response, "POST /api/gifts");
      return response.json();
    },
    reportDeposit: async (giftId, signed) => {
      const response = await api.gifts[":giftId"].deposit.$post(
        { ...gift(giftId), json: signed },
        { init: { signal: AbortSignal.timeout(SIGNED_TIMEOUT_MS) } },
      );
      if (!response.ok) throw await refusal(response, `POST /api/gifts/${giftId}/deposit`);
      return (await response.json()).gift;
    },
    reportShared: async (giftId, outcome) => {
      const response = await api.gifts[":giftId"].shared.$post({
        ...gift(giftId),
        json: { outcome },
      });
      if (!response.ok) throw await refusal(response, `POST /api/gifts/${giftId}/shared`);
      return (await response.json()).gift;
    },
    startTakeOut: async (giftId) => {
      const response = await api.gifts[":giftId"]["take-out"].start.$post(gift(giftId));
      if (!response.ok) throw await refusal(response, `POST /api/gifts/${giftId}/take-out/start`);
      return response.json();
    },
    takeOutGift: async (giftId, signed) => {
      const response = await api.gifts[":giftId"]["take-out"].$post(
        { ...gift(giftId), json: signed },
        { init: { signal: AbortSignal.timeout(SIGNED_TIMEOUT_MS) } },
      );
      if (!response.ok) throw await refusal(response, `POST /api/gifts/${giftId}/take-out`);
      return (await response.json()).gift;
    },
    pendingGifts: async () => {
      const response = await api.gifts.pending.$get();
      if (!response.ok) throw await refusal(response, "GET /api/gifts/pending");
      return response.json();
    },
    previewGift: async (body) => {
      const response = await api.gifts.preview.$post({ json: claimOf(body) });
      if (!response.ok) throw await refusal(response, "POST /api/gifts/preview");
      return response.json();
    },
    receiveGift: async (body) => {
      const response = await api.gifts.receive.$post(
        { json: claimOf(body) },
        { init: { signal: AbortSignal.timeout(RECEIVE_TIMEOUT_MS) } },
      );
      if (!response.ok) throw await refusal(response, "POST /api/gifts/receive");
      return response.json();
    },
    giftsForYou: async () => {
      const response = await api.gifts["for-you"].$get();
      if (!response.ok) throw await refusal(response, "GET /api/gifts/for-you");
      return response.json();
    },
    previewGiftForYou: async (giftId) => {
      const response = await api.gifts[":giftId"].preview.$get(gift(giftId));
      if (!response.ok) throw await refusal(response, `GET /api/gifts/${giftId}/preview`);
      return response.json();
    },
    receiveGiftForYou: async (giftId) => {
      const response = await api.gifts[":giftId"].receive.$post(gift(giftId), {
        init: { signal: AbortSignal.timeout(RECEIVE_TIMEOUT_MS) },
      });
      if (!response.ok) throw await refusal(response, `POST /api/gifts/${giftId}/receive`);
      return response.json();
    },

    recordGratitude: async (combo) => {
      const response = await api.gratitude.$post({ json: combo }, { init: { keepalive: true } });
      if (!response.ok) throw await refusal(response, "POST /api/gratitude");
      return (await response.json()).gratitude;
    },
    unseenGratitude: async () => {
      const response = await api.gratitude.unseen.$get();
      if (!response.ok) throw await refusal(response, "GET /api/gratitude/unseen");
      return response.json();
    },
    gratitude: async (giftId) => {
      const response = await api.gratitude[":giftId"].$get(gift(giftId));
      if (!response.ok) throw await refusal(response, `GET /api/gratitude/${giftId}`);
      return response.json();
    },
    markGratitudeSeen: async (giftId) => {
      const response = await api.gratitude[":giftId"].seen.$post(gift(giftId));
      if (!response.ok) throw await refusal(response, `POST /api/gratitude/${giftId}/seen`);
      return (await response.json()).gratitude;
    },

    explore: async () => {
      const response = await api.explore.$get();
      if (!response.ok) throw await refusal(response, "GET /api/explore");
      return response.json();
    },
    explorePile: async (before) => {
      const response = await api.explore.pile.$get({ query: { before } });
      if (!response.ok) throw await refusal(response, `GET /api/explore/pile?before=${before}`);
      return response.json();
    },
    searchUsers: async (handle) => {
      const response = await api.users.$get({ query: { handle } });
      if (!response.ok) throw await refusal(response, `GET /api/users?handle=${handle}`);
      return (await response.json()).users;
    },
  };
}
