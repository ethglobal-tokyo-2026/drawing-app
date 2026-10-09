-- The app shows an account its choice, but an early version saved a choice without its language.
UPDATE `users` SET `language` = `language_choice` WHERE `language_choice` IS NOT NULL AND `language_choice` != `language`;--> statement-breakpoint
ALTER TABLE `users` DROP COLUMN `language_choice`;
