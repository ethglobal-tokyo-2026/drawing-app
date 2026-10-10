import { users, type Db } from "@drawing-app/db";
import { and, asc, desc, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { toPerson, type Person } from "../shapes.ts";

/** The most people one search answers with. */
export const USER_SEARCH_SIZE = 20;

/**
 * `GET /api/users`'s query: the handle to look for, NFKC-normalized as a new handle is stored, so a
 * full-width query finds it, then trimmed, without one leading `@`.
 */
export const userSearchQuerySchema = z.object({
  handle: z
    .string()
    .overwrite((handle) => handle.normalize("NFKC").trim().replace(/^@/, ""))
    .min(1),
});

/**
 * Live people whose handle contains `query`, ignoring letter case as SQLite's `lower` folds it:
 * handles that start with it first, then A to Z. Deleted accounts keep their handle but aren't found.
 */
export function searchUsers(db: Db, query: string): Person[] {
  const position = sql`instr(lower(${users.handle}), lower(${query}))`;
  return db
    .select()
    .from(users)
    .where(and(isNull(users.deletedAt), sql`${position} > 0`))
    .orderBy(desc(sql`${position} = 1`), asc(sql`lower(${users.handle})`))
    .limit(USER_SEARCH_SIZE)
    .all()
    .map((user) => toPerson(user));
}
