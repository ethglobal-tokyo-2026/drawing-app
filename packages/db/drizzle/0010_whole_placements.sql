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
        or ("__new_sticker_placements"."on_board" is not null and "__new_sticker_placements"."x" is not null and "__new_sticker_placements"."y" is not null and "__new_sticker_placements"."scale" is not null
          and "__new_sticker_placements"."x" between 0 and 1 and "__new_sticker_placements"."y" between 0 and 1
          and "__new_sticker_placements"."scale" > 0 and "__new_sticker_placements"."scale" <= 1.4 and "__new_sticker_placements"."rotation" is not null and "__new_sticker_placements"."z" is not null)),
	CONSTRAINT "sticker_placements_large_placement" CHECK(("__new_sticker_placements"."large_on_board" is null and "__new_sticker_placements"."large_x" is null and "__new_sticker_placements"."large_y" is null and "__new_sticker_placements"."large_scale" is null and "__new_sticker_placements"."large_rotation" is null and "__new_sticker_placements"."large_z" is null)
        or ("__new_sticker_placements"."large_on_board" is not null and "__new_sticker_placements"."large_x" is not null and "__new_sticker_placements"."large_y" is not null and "__new_sticker_placements"."large_scale" is not null
          and "__new_sticker_placements"."large_x" between 0 and 1 and "__new_sticker_placements"."large_y" between 0 and 1
          and "__new_sticker_placements"."large_scale" > 0 and "__new_sticker_placements"."large_scale" <= 2 and "__new_sticker_placements"."large_rotation" is not null and "__new_sticker_placements"."large_z" is not null))
);
--> statement-breakpoint
-- A layout the stricter checks refuse, such as one placed by hand without its x, y or scale, goes back to the sticker tray, so every row copies. Each WHERE is the new check, negated; every whole layout copies as it was.
UPDATE `sticker_placements` SET `on_board` = NULL, `x` = NULL, `y` = NULL, `scale` = NULL, `rotation` = NULL, `z` = NULL
WHERE NOT ((`on_board` IS NULL AND `x` IS NULL AND `y` IS NULL AND `scale` IS NULL AND `rotation` IS NULL AND `z` IS NULL)
  OR (`on_board` IS NOT NULL AND `x` IS NOT NULL AND `y` IS NOT NULL AND `scale` IS NOT NULL AND `x` BETWEEN 0 AND 1 AND `y` BETWEEN 0 AND 1
    AND `scale` > 0 AND `scale` <= 1.4 AND `rotation` IS NOT NULL AND `z` IS NOT NULL));--> statement-breakpoint
UPDATE `sticker_placements` SET `large_on_board` = NULL, `large_x` = NULL, `large_y` = NULL, `large_scale` = NULL, `large_rotation` = NULL, `large_z` = NULL
WHERE NOT ((`large_on_board` IS NULL AND `large_x` IS NULL AND `large_y` IS NULL AND `large_scale` IS NULL AND `large_rotation` IS NULL AND `large_z` IS NULL)
  OR (`large_on_board` IS NOT NULL AND `large_x` IS NOT NULL AND `large_y` IS NOT NULL AND `large_scale` IS NOT NULL AND `large_x` BETWEEN 0 AND 1 AND `large_y` BETWEEN 0 AND 1
    AND `large_scale` > 0 AND `large_scale` <= 2 AND `large_rotation` IS NOT NULL AND `large_z` IS NOT NULL));--> statement-breakpoint
INSERT INTO `__new_sticker_placements`("user_id", "sticker_id", "on_board", "x", "y", "scale", "rotation", "z", "seen_at", "created_at", "updated_at", "large_on_board", "large_x", "large_y", "large_scale", "large_rotation", "large_z") SELECT "user_id", "sticker_id", "on_board", "x", "y", "scale", "rotation", "z", "seen_at", "created_at", "updated_at", "large_on_board", "large_x", "large_y", "large_scale", "large_rotation", "large_z" FROM `sticker_placements`;--> statement-breakpoint
DROP TABLE `sticker_placements`;--> statement-breakpoint
ALTER TABLE `__new_sticker_placements` RENAME TO `sticker_placements`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TRIGGER `sticker_placements_updated_at` AFTER UPDATE ON `sticker_placements` FOR EACH ROW
WHEN NEW.`updated_at` IS OLD.`updated_at`
BEGIN
  UPDATE `sticker_placements` SET `updated_at` = (cast(unixepoch('subsec') * 1000 as integer)) WHERE rowid = NEW.rowid;
END;