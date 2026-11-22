CREATE TABLE `activities` (
	`garmin_activity_id` text PRIMARY KEY NOT NULL,
	`start_time` text NOT NULL,
	`distance_meters` real NOT NULL,
	`duration_seconds` real NOT NULL,
	`average_pace_seconds_per_km` real NOT NULL,
	`average_heart_rate_bpm` integer,
	`session_id` text,
	FOREIGN KEY (`session_id`) REFERENCES `sessions`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `import_cursors` (
	`source` text PRIMARY KEY NOT NULL,
	`cursor` text NOT NULL
);
