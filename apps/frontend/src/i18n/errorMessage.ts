import type { ApiError } from "../api/apiClient";
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

/** The message, then the server's English `detail`, for a line of fine print. */
export const errorReason = (error: ApiError): string =>
  error.detail ? `${errorMessage(error)} (${error.detail})` : errorMessage(error);
