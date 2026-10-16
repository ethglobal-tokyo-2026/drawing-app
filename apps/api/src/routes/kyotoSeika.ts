import {
  kyotoSeikaSubjectSchema,
  kyotoSeikaSubjectsMarkedForDeletion as marks,
} from "@drawing-app/db";
import { asc, eq } from "drizzle-orm";
import { Hono, type Context, type Next } from "hono";
import { z } from "zod";
import type { AppDeps } from "../deps.ts";
import { logInfo } from "../diagnostics.ts";
import { apiError, validate } from "../errors.ts";
import type { AppEnv } from "../session.ts";
import { marksKyotoSeikaSubjects } from "../session/personSwitch.ts";

/** A marked word as its path names it: a Kyoto Seika Subject's ja, held to the same bounds. */
const wordParam = z.object({ word: kyotoSeikaSubjectSchema.shape.ja });

/** Refuses anyone but the operator acting as themself, before the request's word is read. */
const operatorOnly = (deps: AppDeps) => async (c: Context<AppEnv>, next: Next) => {
  if (!marksKyotoSeikaSubjects(deps.personSwitch, c.var.session)) {
    return apiError(
      c,
      403,
      "operator_only",
      "Only the operator, acting as themself, marks Kyoto Seika Subjects for deletion",
    );
  }
  await next();
};

/**
 * Kyoto Seika Subjects marked for deletion: the operator lists them, and marks or unmarks one by
 * holding its cloud on a deal. Marking or unmarking a word again changes nothing.
 */
export const kyotoSeikaRoutes = (deps: AppDeps) =>
  new Hono<AppEnv>()
    .get("/subjects-marked-for-deletion", operatorOnly(deps), (c) => {
      const rows = deps.db
        .select({ word: marks.word })
        .from(marks)
        .orderBy(asc(marks.createdAt), asc(marks.word))
        .all();
      return c.json({ words: rows.map((row) => row.word) }, 200);
    })
    .put(
      "/subjects-marked-for-deletion/:word",
      operatorOnly(deps),
      validate("param", wordParam),
      (c) => {
        const { word } = c.req.valid("param");
        const marked = deps.db
          .insert(marks)
          .values({ word, markedByUserId: c.var.userId })
          .onConflictDoNothing()
          .run();
        if (marked.changes > 0) logInfo("kyotoSeika.subject.marked", { word });
        return c.body(null, 204);
      },
    )
    .delete(
      "/subjects-marked-for-deletion/:word",
      operatorOnly(deps),
      validate("param", wordParam),
      (c) => {
        const { word } = c.req.valid("param");
        const unmarked = deps.db.delete(marks).where(eq(marks.word, word)).run();
        if (unmarked.changes > 0) logInfo("kyotoSeika.subject.unmarked", { word });
        return c.body(null, 204);
      },
    );
