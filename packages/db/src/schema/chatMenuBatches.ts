import { sql } from "drizzle-orm";
import { check, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { oneOf, timestamps } from "./columns.ts";

/**
 * sent: LINE took the batch. done: LINE finished it, and the day's spenders were linked to their
 * counts again. failed: given up for the day; the log says why.
 */
export const chatMenuBatchStatuses = ["sent", "done", "failed"] as const;

/**
 * The chat menu's batch at the start of a ticket day: one LINE call moves everyone's chat menu back to
 * 3 daily tickets left. One row per ticket day, written once LINE takes the batch, or once it's given
 * up. A day with no row hasn't had its batch, so the API runs it at boot.
 */
export const chatMenuBatches = sqliteTable(
  "chat_menu_batches",
  {
    /** YYYY-MM-DD, Tokyo time. Also the batch's resumeRequestKey, so a retry resumes it. */
    ticketDay: text("ticket_day").primaryKey(),
    /** The batch request's x-line-request-id, which LINE reports its progress by. */
    lineRequestId: text("line_request_id"),
    status: text("status", { enum: chatMenuBatchStatuses }).notNull(),
    ...timestamps(),
  },
  (t) => [
    check("chat_menu_batches_status", oneOf(t.status, chatMenuBatchStatuses)),
    // Only a batch LINE never took has no request ID.
    check(
      "chat_menu_batches_request",
      sql`${t.status} = 'failed' or ${t.lineRequestId} is not null`,
    ),
  ],
);
