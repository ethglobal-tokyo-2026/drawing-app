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
 * keycap, a zero-width joiner between two emoji, and the tag letters after a black flag that make
 * England's, Scotland's or Wales's flag (gbeng, gbsct or gbwls, then the cancel tag). Only those: any
 * other tag letters show nothing, so they could make a lookalike.
 */
const EMOJI_JOINS =
  /(?<=\p{Extended_Pictographic}\p{Emoji_Modifier}?)[\uFE0E\uFE0F]|(?<=[0-9#*])\uFE0F(?=\u20E3)|(?<=\p{Extended_Pictographic}[\uFE0F\p{Emoji_Modifier}]?)\u200D(?=\p{Extended_Pictographic})|(?<=\u{1F3F4})\u{E0067}\u{E0062}(?:\u{E0065}\u{E006E}\u{E0067}|\u{E0073}\u{E0063}\u{E0074}|\u{E0077}\u{E006C}\u{E0073})\u{E007F}/u;

/** An emoji's invisible characters, captured, or a hidden character: the emoji's win where both match. */
const EMOJI_JOIN_OR_HIDDEN = new RegExp(`(${EMOJI_JOINS.source})|${HIDDEN_CHARACTER.source}`, "gu");

/** `text` without its hidden characters outside an emoji. */
const withoutHiddenCharacters = (text: string) =>
  text.replace(EMOJI_JOIN_OR_HIDDEN, (_hidden, emojiJoin: string | undefined) => emojiJoin ?? "");

/**
 * `raw` NFKC-normalized and trimmed, or null when that breaks a rule: 1 to HANDLE_MAX_LENGTH code
 * points, no `@`, and nothing hidden outside an emoji. Normalized, a full-width or decomposed handle
 * is the one it looks like, so the uniqueness check catches it.
 */
export function parseHandle(raw: string): string | null {
  // Hidden characters are judged as typed: NFKC writes some emoji as text, such as ‼️ as !!, which
  // strands the emoji's variation selector, so the normalized handle goes without it.
  const typed = raw.normalize("NFC");
  if (withoutHiddenCharacters(typed) !== typed) return null;
  const handle = withoutHiddenCharacters(raw.normalize("NFKC")).trim();
  // A string's iterator yields code points, which is what the length rule counts.
  const length = Array.from(handle).length;
  return length >= 1 && length <= HANDLE_MAX_LENGTH && !handle.includes("@") ? handle : null;
}

/**
 * A LINE name as a handle: without its hidden characters outside an emoji, then held to parseHandle's
 * rules. Real names need some, such as a kanji's variation selector or Persian's zero-width
 * non-joiner, and without them a lookalike name is the handle it looks like, which the uniqueness
 * check catches.
 */
export function handleFromLineName(name: string): string | null {
  return parseHandle(withoutHiddenCharacters(name.normalize("NFC")));
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
