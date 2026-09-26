ALTER TABLE `users` ADD `age_verified_at` integer;--> statement-breakpoint
ALTER TABLE `users` ADD `age_verification_nullifier` text;--> statement-breakpoint
CREATE UNIQUE INDEX `users_age_verification_nullifier_unique` ON `users` (`age_verification_nullifier`);