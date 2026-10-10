import { users, type Db } from "@drawing-app/db";
import { and, ne, sql } from "drizzle-orm";
import { HANDLE_MAX_LENGTH } from "./handleLimit.ts";

/**
 * Characters that change how a handle reads without showing themselves: text-direction controls,
 * zero-width and other invisible characters, and control characters.
 */
const HIDDEN_CHARACTER = /[\p{Bidi_Control}\p{Default_Ignorable_Code_Point}\p{Cc}\p{Cf}]/u;

/**
 * The invisible characters an emoji is written with: a variation selector after an emoji or in a
 * keycap, and a zero-width joiner between two emoji.
 */
const EMOJI_JOINS =
  /(?<=\p{Extended_Pictographic}\p{Emoji_Modifier}?)[\uFE0E\uFE0F]|(?<=[0-9#*])\uFE0F(?=\u20E3)|(?<=\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]?)\u200D(?=\p{Extended_Pictographic})/gu;

/**
 * `raw` NFKC-normalized and trimmed, or null when that breaks a rule: 1 to HANDLE_MAX_LENGTH code
 * points, no `@`, and nothing hidden outside an emoji. Normalized, a full-width or decomposed handle
 * is the one it looks like, so the uniqueness check catches it.
 */
export function parseHandle(raw: string): string | null {
  const handle = raw.normalize("NFKC").trim();
  // A string's iterator yields code points, which is what the length rule counts.
  const length = Array.from(handle).length;
  const hidden = HIDDEN_CHARACTER.test(handle.replace(EMOJI_JOINS, ""));
  return length >= 1 && length <= HANDLE_MAX_LENGTH && !handle.includes("@") && !hidden
    ? handle
    : null;
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
