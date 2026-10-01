import { problemOf } from "../../i18n/errorMessage";
import { i18next } from "../../i18n/i18n";

/** Something the sticker tray couldn't do, which the board says in its alert. */
export interface TrayProblem {
  /** Sticking a sticker on, reading a cut line, or saving what the open tray showed. */
  kind: "place" | "cut" | "seen";
  /** The stickers' numbers. */
  nos: readonly number[];
  /** Why, in the app's language, for the kinds whose sentence ends on it. */
  reason?: string;
  /** The English words behind it, for a report. */
  detail?: string;
}

/** What makes two problems one: the board says it once, and keys its sentence by this. */
export const trayProblemKey = (p: TrayProblem) =>
  JSON.stringify([p.kind, p.nos, p.reason, p.detail]);

/** The board answered with nothing, as before it has a size, so a sticker couldn't be stuck on. */
export class BoardNotReady extends Error {}

/** Why something failed, in the app's language, with the words behind it. */
export function reasonOf(error: unknown): Pick<TrayProblem, "reason" | "detail"> {
  if (error instanceof BoardNotReady) {
    return { reason: i18next.t(($) => $.stickerBoard.tray.problem.boardNotReady) };
  }
  const { message, detail } = problemOf(error);
  return { reason: message, detail };
}
