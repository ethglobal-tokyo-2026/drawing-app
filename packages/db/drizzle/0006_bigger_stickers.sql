PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_sticker_placements` (
	`user_id` text NOT NULL,
	`sticker_id` text NOT NULL,
	`on_board` integer,
	`x` real,
	`y` real,
	`scale` real,
	`rotation` real,
	`z` integer,
	`seen_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsec') * 1000 as integer)) NOT NULL,
	`large_on_board` integer,
	`large_x` real,
	`large_y` real,
	`large_scale` real,
	`large_rotation` real,
	`large_z` integer,
	PRIMARY KEY(`user_id`, `sticker_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sticker_id`) REFERENCES `stickers`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "sticker_placements_placement" CHECK(("__new_sticker_placements"."on_board" is null and "__new_sticker_placements"."x" is null and "__new_sticker_placements"."y" is null and "__new_sticker_placements"."scale" is null and "__new_sticker_placements"."rotation" is null and "__new_sticker_placements"."z" is null)
        or ("__new_sticker_placements"."on_board" is not null and "__new_sticker_placements"."x" between 0 and 1 and "__new_sticker_placements"."y" between 0 and 1
          and "__new_sticker_placements"."scale" > 0 and "__new_sticker_placements"."scale" <= 1.4 and "__new_sticker_placements"."rotation" is not null and "__new_sticker_placements"."z" is not null)),
	CONSTRAINT "sticker_placements_large_placement" CHECK(("__new_sticker_placements"."large_on_board" is null and "__new_sticker_placements"."large_x" is null and "__new_sticker_placements"."large_y" is null and "__new_sticker_placements"."large_scale" is null and "__new_sticker_placements"."large_rotation" is null and "__new_sticker_placements"."large_z" is null)
        or ("__new_sticker_placements"."large_on_board" is not null and "__new_sticker_placements"."large_x" between 0 and 1 and "__new_sticker_placements"."large_y" between 0 and 1
          and "__new_sticker_placements"."large_scale" > 0 and "__new_sticker_placements"."large_scale" <= 2 and "__new_sticker_placements"."large_rotation" is not null and "__new_sticker_placements"."large_z" is not null))
);
--> statement-breakpoint
INSERT INTO `__new_sticker_placements`("user_id", "sticker_id", "on_board", "x", "y", "scale", "rotation", "z", "seen_at", "created_at", "updated_at", "large_on_board", "large_x", "large_y", "large_scale", "large_rotation", "large_z") SELECT "user_id", "sticker_id", "on_board", "x", "y", "scale", "rotation", "z", "seen_at", "created_at", "updated_at", "large_on_board", "large_x", "large_y", "large_scale", "large_rotation", "large_z" FROM `sticker_placements`;--> statement-breakpoint
DROP TABLE `sticker_placements`;--> statement-breakpoint
ALTER TABLE `__new_sticker_placements` RENAME TO `sticker_placements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TRIGGER `sticker_placements_updated_at` AFTER UPDATE ON `sticker_placements` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sticker_placements` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;