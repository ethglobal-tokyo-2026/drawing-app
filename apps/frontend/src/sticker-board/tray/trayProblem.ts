import { problemOf } from "../../i18n/errorMessage";
import { i18next } from "../../i18n/i18n";

/** Something the sticker tray couldn't do, which the board says in its alert. */
export interface TrayProblem {
  /** Placing a sticker, reading its cut line, saving what the tray showed, or drawing the Zipper. */
  kind: "place" | "cut" | "seen" | "zipper";
  /** The stickers' numbers. */
  nos: readonly number[];
  /** Why, for the kinds whose sentence ends on it: kept as it failed, so its words follow the app's language. */
  error?: unknown;
  /** The English words behind it, for a report, where there's no error to read them from. */
  detail?: string;
}

/** The board answered with nothing, as before it has a size, so a sticker couldn't be stuck on. */
export class BoardNotReady extends Error {}

/** Why a problem happened, in the app's language now, with the words behind it. */
export function trayProblemWords(p: TrayProblem): { reason: string; detail: string | undefined } {
  // `in`, not `undefined`: a promise can reject with nothing, which still has a reason to say.
  if (!("error" in p)) return { reason: "", detail: p.detail };
  if (p.error instanceof BoardNotReady)
    return {
      reason: i18next.t(($) => $.stickerBoard.tray.problem.boardNotReady),
      detail: undefined,
    };
  const { message, detail } = problemOf(p.error);
  return { reason: message, detail };
}

/** What makes two problems one: the board says it once, and keys its sentence by this. */
export const trayProblemKey = (p: TrayProblem) => {
  const { reason, detail } = trayProblemWords(p);
  return JSON.stringify([p.kind, p.nos, reason, detail]);
};
