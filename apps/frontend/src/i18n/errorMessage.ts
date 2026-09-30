import { ApiError } from "../api/apiClient";
import { errors } from "./strings/errors";
import { i18next } from "./i18n";

const isKnown = (code: string): code is Exclude<keyof typeof errors, "unknown"> =>
  code !== "unknown" && Object.hasOwn(errors, code);

/** What an error says to people, in the app's language. A code the catalog lacks is named in it. */
export const errorMessage = (error: ApiError): string => {
  const { code } = error;
  return isKnown(code)
    ? i18next.t(($) => $.errors[code])
    : i18next.t(($) => $.errors.unknown, { code });
};

/** The status, code and server's English detail, for the fine print beside Copy. */
export const errorDetail = (error: ApiError): string =>
  `${error.status > 0 ? `${error.status} · ` : ""}${error.message}`;

/** A failure as people read it: a sentence in the app's language, and the English words behind it for a report. */
export interface Problem {
  message: string;
  detail?: string;
}

/** The distinct details of several failures as one line for the fine print beside Copy, or none. */
export const joinedDetails = (details: readonly (string | undefined)[]): string | undefined => {
  const distinct = new Set(details.filter((detail): detail is string => Boolean(detail)));
  return distinct.size ? [...distinct].join("; ") : undefined;
};

/**
 * Any failure as a Problem. An ApiError says its code's message; anything else says one line for
 * "something went wrong" in the app's language and keeps its own words as the detail, since an SDK's
 * English doesn't belong inside a Japanese sentence.
 */
export const problemOf = (error: unknown): Required<Problem> =>
  error instanceof ApiError
    ? { message: errorMessage(error), detail: errorDetail(error) }
    : {
        message: i18next.t(($) => $.errors.unexpected),
        detail: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
      };
