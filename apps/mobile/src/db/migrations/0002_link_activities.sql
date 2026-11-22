ALTER TABLE `activities` ADD `declined_session_id` text REFERENCES sessions(id) ON UPDATE no action ON DELETE set null;--> statement-breakpoint
ALTER TABLE `activities` ADD `hand_logged_meters` integer;--> statement-breakpoint
ALTER TABLE `activities` ADD `hand_logged_seconds` integer;--> statement-breakpoint
CREATE UNIQUE INDEX `activities_sessionId_unique` ON `activities` (`session_id`);