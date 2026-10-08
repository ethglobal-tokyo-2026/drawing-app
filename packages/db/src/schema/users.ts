import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns.ts";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    /**
     * The verified ID token's `sub`, set at the first sign-in. Finds a returning person and their
     * Privy user, and links their chat menu. Cleared on account deletion.
     */
    lineUserId: text("line_user_id").unique(),
    /**
     * From the verified ID token, refreshed at every sign-in. LINE gives each person only their own
     * profile, so this is how other people see them. Cleared on account deletion.
     */
    lineDisplayName: text("line_display_name"),
    linePictureUrl: text("line_picture_url"),
    /**
     * Unique ignoring letter case. Set at the first sign-in to the LINE name when no one has it,
     * otherwise from the handle prompt; null until the prompt is answered. Cleared on account
     * deletion.
     */
    handle: text("handle"),
    /**
     * The language the server writes to the person in outside the app: set at sign-in, and by a
     * Settings choice.
     */
    language: text("language", { enum: ["en", "ja"] }).notNull(),
    /** The language picked in Settings, which the app starts in on every device; null follows LINE's. */
    languageChoice: text("language_choice", { enum: ["en", "ja"] }),
    /**
     * When the person turned on Show 18+ stickers in Settings; null while it's off. Only someone
     * with it on marks, sees unblurred or receives NSFW stickers. Cleared on account deletion.
     */
    nsfwOptedInAt: integer("nsfw_opted_in_at", { mode: "timestamp_ms" }),
    /**
     * The person's Privy Sui wallet: 0x and 64 lowercase hex digits. Stickers are minted and claimed
     * to it, and it signs their deposits, take-outs and payments. Set from Privy the first time the
     * server needs it, and kept on account deletion.
     */
    suiAddress: text("sui_address").unique(),
    /** Set on the first action, which carries the terms line. */
    termsAcceptedAt: integer("terms_accepted_at", { mode: "timestamp_ms" }),
    /** Set on account deletion. The row stays, as the Original Artist of their stickers. */
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    ...timestamps(),
    /**
     * When the person turned on Kyoto Seika Manga Expression Practice Mode in Settings; null while
     * it's off. Each ticket spent while it's on is spent in that mode. Cleared on account deletion.
     */
    kyotoSeikaPracticeOnAt: integer("kyoto_seika_practice_on_at", { mode: "timestamp_ms" }),
    /** When they turned on "Dark subjects too", under it; null while it's off. Cleared on account deletion. */
    kyotoSeikaDarkSubjectsOnAt: integer("kyoto_seika_dark_subjects_on_at", {
      mode: "timestamp_ms",
    }),
  },
  (t) => [
    uniqueIndex("users_handle").on(sql`lower(${t.handle})`),
    check(
      "users_line",
      sql`(${t.deletedAt} is null and ${t.lineUserId} is not null and ${t.lineDisplayName} is not null)
        or (${t.deletedAt} is not null and ${t.lineUserId} is null and ${t.lineDisplayName} is null and ${t.linePictureUrl} is null)`,
    ),
    check(
      "users_sui_address",
      sql`${t.suiAddress} is null
        or (length(${t.suiAddress}) = 66 and ${t.suiAddress} like '0x%' and ${t.suiAddress} = lower(${t.suiAddress}))`,
    ),
  ],
);
