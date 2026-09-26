import { i18next } from "./i18n";

/** A count as the app's language groups it: 1,234. */
export const formatCount = (n: number) => n.toLocaleString(i18next.language);

/** A time of day in the app's language: 4:52 PM, or 16:52. */
export const formatTimeOfDay = (at: Date) =>
  at.toLocaleTimeString(i18next.language, { hour: "numeric", minute: "2-digit" });

/** A date and time in the app's language: Sep 27, 2026, 4:52 PM. */
export const formatDateTime = (at: Date) =>
  at.toLocaleString(i18next.language, { dateStyle: "medium", timeStyle: "short" });
