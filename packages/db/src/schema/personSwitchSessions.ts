import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns.ts";
import { users } from "./users.ts";

/** The selected account of one authenticated browser session, after its first selection. */
export const personSwitchSessions = sqliteTable(
  "person_switch_sessions",
  {
    sessionId: text("session_id").primaryKey(),
    authenticatedUserId: text("authenticated_user_id")
      .notNull()
      .references(() => users.id),
    selectedUserId: text("selected_user_id")
      .notNull()
      .references(() => users.id),
    selectionVersion: text("selection_version").notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    ...timestamps(),
  },
  (t) => [index("person_switch_sessions_expiration").on(t.expiresAt)],
);
