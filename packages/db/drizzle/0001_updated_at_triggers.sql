CREATE TRIGGER `users_updated_at` AFTER UPDATE ON `users` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `users` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `stickers_updated_at` AFTER UPDATE ON `stickers` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `stickers` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `sticker_timelapses_updated_at` AFTER UPDATE ON `sticker_timelapses` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sticker_timelapses` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `ticket_uses_updated_at` AFTER UPDATE ON `ticket_uses` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `ticket_uses` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `ticket_purchases_updated_at` AFTER UPDATE ON `ticket_purchases` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `ticket_purchases` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `sticker_placements_updated_at` AFTER UPDATE ON `sticker_placements` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sticker_placements` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `gifts_updated_at` AFTER UPDATE ON `gifts` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `gifts` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
--> statement-breakpoint
CREATE TRIGGER `gratitude_updated_at` AFTER UPDATE ON `gratitude` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `gratitude` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;
