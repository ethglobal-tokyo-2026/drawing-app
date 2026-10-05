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
     * The Privy smart wallet on Ethereum Sepolia, lowercase. Stickers are minted and claimed to it, and it
     * maps chain events back to a person. Set from Privy the first time the server needs it.
     */
    smartAccountAddress: text("smart_account_address").unique(),
    /** Set on the first action, which carries the terms line. */
    termsAcceptedAt: integer("terms_accepted_at", { mode: "timestamp_ms" }),
    /** Set on account deletion. The row stays, as the Original Artist of their stickers. */
    deletedAt: integer("deleted_at", { mode: "timestamp_ms" }),
    ...timestamps(),
    // Columns added after the table was made go last, where ALTER TABLE puts them.
    /**
     * The language the server writes to the person in outside the app: set at sign-in, and by a
     * Settings choice.
     */
    language: text("language", { enum: ["en", "ja"] })
      .notNull()
      .default("en"),
    /** The language picked in Settings, which the app starts in on every device; null follows LINE's. */
    languageChoice: text("language_choice", { enum: ["en", "ja"] }),
    /** When an Orb-verified World ID proved the person is 18 or older. Cleared on account deletion. */
    ageVerifiedAt: integer("age_verified_at", { mode: "timestamp_ms" }),
    /**
     * The age verification's World ID nullifier, in decimal: the same for one World ID on every
     * account, so one World ID verifies one live account. Cleared on account deletion.
     */
    ageVerificationNullifier: text("age_verification_nullifier").unique(),
    /**
     * When the person turned on Show 18+ stickers in Settings, their NSFW opt-in; null while it's
     * off. Cleared on account deletion.
     */
    nsfwOptedInAt: integer("nsfw_opted_in_at", { mode: "timestamp_ms" }),
  },
  (t) => [
    uniqueIndex("users_handle").on(sql`lower(${t.handle})`),
    check(
      "users_line",
      sql`(${t.deletedAt} is null and ${t.lineUserId} is not null and ${t.lineDisplayName} is not null)
        or (${t.deletedAt} is not null and ${t.lineUserId} is null and ${t.lineDisplayName} is null and ${t.linePictureUrl} is null)`,
    ),
    check(
      "users_smart_account_address",
      sql`${t.smartAccountAddress} is null
        or (length(${t.smartAccountAddress}) = 42 and ${t.smartAccountAddress} = lower(${t.smartAccountAddress}))`,
    ),
  ],
);
