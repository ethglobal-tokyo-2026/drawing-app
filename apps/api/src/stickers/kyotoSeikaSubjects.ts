import type { KyotoSeikaSubject } from "@drawing-app/db";
import { z } from "zod";

/** Each field's longest: a bound against abuse, not the subject list's rule, which the app keeps. */
const KYOTO_SEIKA_SUBJECT_MAX_LENGTH = 64;
const text = z.string().max(KYOTO_SEIKA_SUBJECT_MAX_LENGTH);

/** One Kyoto Seika Subject as stickers.kyoto_seika_subjects holds it; `reading` is empty without kanji. */
const kyotoSeikaSubjectSchema = z.object({
  ja: text.min(1),
  reading: text,
  en: text.min(1),
}) satisfies z.ZodType<KyotoSeikaSubject>;

/** The pair dealt for a sticker drawn in Kyoto Seika Manga Expression Practice Mode, fixed at seal. */
export const kyotoSeikaSubjectsSchema = z.tuple([kyotoSeikaSubjectSchema, kyotoSeikaSubjectSchema]);
