import { users, type Db } from "@drawing-app/db";
import { and, ne, sql } from "drizzle-orm";
import { HANDLE_MAX_LENGTH } from "./handleLimit.ts";

/** `raw` trimmed, or null when that breaks a rule: 1 to HANDLE_MAX_LENGTH code points, and no `@`. */
export function parseHandle(raw: string): string | null {
  const handle = raw.trim();
  // A string's iterator yields code points, which is what the length rule counts.
  const length = Array.from(handle).length;
  return length >= 1 && length <= HANDLE_MAX_LENGTH && !handle.includes("@") ? handle : null;
}

/**
 * Whether anyone but `exceptUserId` has `handle`, ignoring letter case. SQLite's `lower` folds ASCII
 * only, as the users_handle index does, so this agrees with the index and can use it.
 */
export function isHandleTaken(
  db: Pick<Db, "select">,
  handle: string,
  exceptUserId?: string,
): boolean {
  const holder = db
    .select({ id: users.id })
    .from(users)
    .where(
      and(
        sql`lower(${users.handle}) = lower(${handle})`,
        exceptUserId === undefined ? undefined : ne(users.id, exceptUserId),
      ),
    )
    .get();
  return holder !== undefined;
}
