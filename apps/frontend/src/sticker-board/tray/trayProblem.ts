import { ApiError } from "../../api/apiClient";
import { errorReason } from "../../i18n/errorMessage";

/** Something the sticker tray couldn't do, which the board says in its alert. */
export interface TrayProblem {
  /** Sticking a sticker on, reading a cut line, or saving what the open tray showed. */
  kind: "place" | "cut" | "seen";
  /** The stickers' numbers. */
  nos: readonly number[];
  /** Why, in words. */
  reason: string;
}

/** Why something failed: the API's reason, or else the error's own words, which the API's never fit. */
export function reasonOf(error: unknown): string {
  if (error instanceof ApiError) return errorReason(error);
  return error instanceof Error ? error.message : String(error);
}
