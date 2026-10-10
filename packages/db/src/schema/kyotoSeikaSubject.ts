import { z } from "zod";

/** Each field's longest: a bound against abuse, not the subject list's rule, which the app keeps. */
const KYOTO_SEIKA_SUBJECT_MAX_LENGTH = 64;
const text = z.string().max(KYOTO_SEIKA_SUBJECT_MAX_LENGTH);

/**
 * One of the two Kyoto Seika Subjects a sticker drawn in Kyoto Seika Manga Expression Practice Mode
 * keeps, as stickers.kyoto_seika_subjects holds it: the word as the test prints it, its reading
 * (empty when it has no kanji), and its English.
 */
export const kyotoSeikaSubjectSchema = z.object({
  ja: text.min(1),
  reading: text,
  en: text.min(1),
});

export type KyotoSeikaSubject = z.infer<typeof kyotoSeikaSubjectSchema>;
