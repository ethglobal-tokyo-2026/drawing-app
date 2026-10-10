import { kyotoSeikaSubjectSchema } from "@drawing-app/db";
import { z } from "zod";

/** The pair dealt for a sticker drawn in Kyoto Seika Manga Expression Practice Mode, fixed at seal. */
export const kyotoSeikaSubjectsSchema = z.tuple([kyotoSeikaSubjectSchema, kyotoSeikaSubjectSchema]);
