import { sql } from "drizzle-orm";
import { check, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns.ts";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    /**
     * The verified ID token's `sub`, set at the first sign-in. Finds a returning person, and is the
     * Official account's push target. Cleared on account deletion.
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
     * otherwise from the handle prompt; null only until the prompt is answered.
     */
    handle: text("handle"),
    /** IANA zone from the device at the first sign-in. Ticket days turn over at 4:00 here. */
    timeZone: text("time_zone").notNull().default("Asia/Tokyo"),
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
    /** The app's language at the last sign-in, for what the server writes to the person outside the app. */
    language: text("language", { enum: ["en", "ja"] })
      .notNull()
      .default("en"),
    /**
     * The person's ENS label: <ens_label>.croquis.eth. Follows the handle until the name is onchain
     * (ens_named_at), then fixed, since an onchain name is forever. Kept on account deletion.
     */
    ensLabel: text("ens_label").unique(),
    /** When CroquisNames confirmed the person's name onchain. */
    ensNamedAt: integer("ens_named_at", { mode: "timestamp_ms" }),
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
