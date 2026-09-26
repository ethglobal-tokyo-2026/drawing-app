import type { Me, StickerBoard, Tickets } from "@drawing-app/api/client";
import type { ApiClient } from "./apiClient";
import type { SessionApi } from "./httpApi";

/**
 * How long after SessionGate accepts the early answers the first screen may still take them. The
 * board and the tickets ask as the app opens, well inside this; anything later asks the server again.
 */
const FRESH_MS = 5_000;

/** The session the cookie already holds, asked for as the app started, and what SessionGate makes of it. */
export interface EarlySession {
  /** You, as the cookie signs you in; null without a live session, or without an answer. */
  me: Promise<Me | null>;
  /** LINE's user is the cookie's, so the first screen may use the early answers, once each. */
  accept: (me: Me) => void;
  /** LINE's user isn't the cookie's, or there's no session: the early answers go unread. */
  drop: () => void;
}

export interface EarlyOpening extends EarlySession {
  /** Your board as the cookie's session saw it, once, while it's accepted and fresh. */
  takeBoard: () => Promise<StickerBoard> | undefined;
  /** Your tickets, likewise. */
  takeTickets: () => Promise<Tickets> | undefined;
}

/** A failure noted, so an early answer nobody takes doesn't log an unhandled rejection. */
const quiet = <T>(answer: Promise<T>) => {
  answer.catch(() => {});
  return answer;
};

/**
 * Asks the server, with the cookie from the last visit and while LIFF is still starting, who you are,
 * your tickets and, when the app opens on it, your board. Nothing from these answers reaches the screen
 * until SessionGate has checked that LINE's user is the cookie's: a different LINE user never sees the
 * last person's board, even for a frame.
 */
export function openEarly(
  session: SessionApi,
  api: ApiClient,
  { board: withBoard, now = Date.now }: { board: boolean; now?: () => number },
): EarlyOpening {
  const me = session.me().then(
    (answer) => answer.me,
    // 401 signed_out, the usual answer on a first visit, or no answer: SessionGate signs in with LINE.
    () => null,
  );
  let board = withBoard ? quiet(api.stickerBoard()) : undefined;
  let tickets: Promise<Tickets> | undefined = quiet(api.tickets());
  let accepted: { id: string; at: number } | null = null;
  let dropped = false;

  const fresh = () => accepted !== null && now() - accepted.at < FRESH_MS;

  return {
    me,
    accept: (you) => {
      if (!dropped) accepted ??= { id: you.id, at: now() };
    },
    drop: () => {
      dropped = true;
      accepted = null;
      board = undefined;
      tickets = undefined;
    },
    takeBoard: () => {
      const answer = fresh() ? board : undefined;
      board = undefined;
      const ownerId = accepted?.id;
      // Checked again against the person the app opened as.
      return answer?.then((b) =>
        b.owner.id === ownerId ? b : Promise.reject(new Error("The early board is someone else's")),
      );
    },
    takeTickets: () => {
      const answer = fresh() ? tickets : undefined;
      tickets = undefined;
      return answer;
    },
  };
}

let opening: EarlyOpening | null = null;

/**
 * Starts the early requests, once, as the app starts. A gift link or a chat menu tile arrives through
 * LIFF's `liff.state`, which LIFF then reloads the page onto, so that load asks nothing.
 */
export function startEarlySession(
  session: SessionApi,
  api: ApiClient,
  { opensOnBoard, search }: { opensOnBoard: boolean; search: string },
) {
  if (opening || new URLSearchParams(search).has("liff.state")) return;
  opening = openEarly(session, api, { board: opensOnBoard });
}

/** The early session, for SessionGate; null when the app didn't start one. */
export const earlySession = (): EarlySession | null => opening;

/**
 * `api`, answering the first board and tickets requests from the early session once SessionGate has
 * accepted it. An early answer that failed, or isn't yours, asks the server again.
 */
export function withEarlyAnswers(
  api: ApiClient,
  early: () => EarlyOpening | null = () => opening,
): ApiClient {
  return {
    ...api,
    stickerBoard: (userId = "me") => {
      const answer = userId === "me" ? early()?.takeBoard() : undefined;
      return answer ? answer.catch(() => api.stickerBoard(userId)) : api.stickerBoard(userId);
    },
    tickets: () => {
      const answer = early()?.takeTickets();
      return answer ? answer.catch(() => api.tickets()) : api.tickets();
    },
  };
}
