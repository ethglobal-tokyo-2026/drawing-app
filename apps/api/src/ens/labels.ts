import { users, type Db } from "@drawing-app/db";
import { and, eq, ne } from "drizzle-orm";
import { normalize } from "viem/ens";

type UserRow = typeof users.$inferSelect;

/** Labels a person can't have: gifts.croquis-app.eth is the gifts' registry. */
const RESERVED_LABELS = new Set(["gifts"]);
/** Keeps names short enough to read and to put in a link. */
const MAX_LABEL_BYTES = 63;

/**
 * The ENS label a handle makes: ENSIP-15 normalized, with spaces and dots turned into dashes. Null
 * when the handle can't be one, such as a handle with an emoji ENS disallows.
 */
export function labelFromHandle(handle: string): string | null {
  const dashed = handle
    .trim()
    .replace(/[\s.]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
  if (dashed === "") return null;
  let label: string;
  try {
    label = normalize(dashed);
  } catch {
    // normalize throws for text ENSIP-15 disallows; such a handle gets the fallback label.
    return null;
  }
  if (label.includes(".") || RESERVED_LABELS.has(label)) return null;
  if (new TextEncoder().encode(label).length > MAX_LABEL_BYTES) return null;
  return label;
}

/** A label for someone whose handle can't be one, or is taken: from their user ID. */
export const fallbackLabel = (userId: string) => `artist-${userId.replaceAll("-", "").slice(0, 8)}`;

const isLabelTaken = (db: Pick<Db, "select">, label: string, userId: string) =>
  db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.ensLabel, label), ne(users.id, userId)))
    .get() !== undefined;

/**
 * Gives the person the label their handle makes, while their name isn't onchain. An onchain name is
 * forever, so from then on the label stays as it is.
 */
export function syncEnsLabel(db: Pick<Db, "select" | "update">, user: UserRow): UserRow {
  if (user.ensNamedAt !== null) return user;
  const fromHandle = user.handle === null ? null : labelFromHandle(user.handle);
  const fallback = fallbackLabel(user.id);
  const label =
    fromHandle !== null && !isLabelTaken(db, fromHandle, user.id)
      ? fromHandle
      : isLabelTaken(db, fallback, user.id)
        ? `artist-${user.id.replaceAll("-", "")}`
        : fallback;
  if (label === user.ensLabel) return user;
  const updated = db
    .update(users)
    .set({ ensLabel: label })
    .where(eq(users.id, user.id))
    .returning()
    .get();
  if (!updated) throw new Error(`Person ${user.id} vanished while their ENS label was set`);
  return updated;
}
