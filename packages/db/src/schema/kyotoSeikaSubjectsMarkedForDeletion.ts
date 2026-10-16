import { sqliteTable, text } from "drizzle-orm/sqlite-core";
import { timestamps } from "./columns.ts";
import { users } from "./users.ts";

/**
 * Kyoto Seika Subjects the operator marked for deletion from the subject list, by holding one on a
 * deal. An agent takes marked words out of the list when asked; a mark whose word has left the list
 * stays as a record and does nothing.
 */
export const kyotoSeikaSubjectsMarkedForDeletion = sqliteTable(
  "kyoto_seika_subjects_marked_for_deletion",
  {
    /** The subject's ja, as the subject list spells it. */
    word: text("word").primaryKey(),
    markedByUserId: text("marked_by_user_id")
      .notNull()
      .references(() => users.id),
    ...timestamps(),
  },
);
