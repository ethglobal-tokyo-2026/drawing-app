CREATE TABLE `chat_menu_batches` (
	`ticket_day` text PRIMARY KEY NOT NULL,
	`line_request_id` text,
	`status` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	CONSTRAINT "chat_menu_batches_status" CHECK("chat_menu_batches"."status" in ('sent', 'done', 'failed')),
	CONSTRAINT "chat_menu_batches_request" CHECK("chat_menu_batches"."status" = 'failed' or "chat_menu_batches"."line_request_id" is not null)
);
--> statement-breakpoint
CREATE TRIGGER `chat_menu_batches_updated_at` AFTER UPDATE ON `chat_menu_batches` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `chat_menu_batches` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
