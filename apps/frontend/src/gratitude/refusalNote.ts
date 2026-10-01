import type { TFunction } from "i18next";
import type { ApiError } from "../api/apiClient";
import { errorDetail } from "../i18n/errorMessage";

/** A refusal in words, for the receipt and for the sticker detail. */
export interface RefusalNote {
  text: string;
  /** The English words behind a refusal the catalog doesn't word itself, for a report. */
  detail?: string;
}

/** Why the server refused a combo for good, in words. Only an unreadable one is worth sending again. */
export function refusalNote(t: TFunction, error: ApiError, handle: string): RefusalNote {
  switch (error.code) {
    case "gratitude_already_recorded":
      return { text: t(($) => $.gratitude.refusals.alreadyRecorded, { handle }) };
    case "not_receiver":
      return { text: t(($) => $.gratitude.refusals.notReceiver) };
    case "gift_not_received":
      return { text: t(($) => $.gratitude.refusals.notReceived) };
    case "gift_not_found":
      return { text: t(($) => $.gratitude.refusals.notFound) };
    case "replay_invalid":
    case "invalid_request":
      return { text: t(($) => $.gratitude.refusals.unreadable) };
    default:
      return {
        text: t(($) => $.gratitude.refusals.other, { handle }),
        detail: errorDetail(error),
      };
  }
}
