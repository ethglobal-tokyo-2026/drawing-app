import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { currentLanguage, i18next } from "../i18n/i18n";

/**
 * A subject of a pair shown only in Japanese, as screen readers hear it: the word alone in Japanese, and
 * in English with its English too, since a word read out means nothing to someone who can't read it.
 */
export const spokenSubject = (subject: KyotoSeikaSubject) =>
  currentLanguage() === "ja"
    ? subject.ja
    : i18next.t(($) => $.kyotoSeika.pair.subject, { word: subject.ja, english: subject.en });
