-- copied from cms/src/migrations/20261104_140957_collections.ts
CREATE TABLE `dongs` (
  	`id` integer PRIMARY KEY NOT NULL,
  	`slug` text NOT NULL,
  	`name` text NOT NULL,
  	`gu` text NOT NULL,
  	`isatips_slug` text,
  	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
CREATE UNIQUE INDEX `dongs_slug_idx` ON `dongs` (`slug`);
CREATE INDEX `dongs_updated_at_idx` ON `dongs` (`updated_at`);
CREATE INDEX `dongs_created_at_idx` ON `dongs` (`created_at`);
CREATE TABLE `businesses` (
  	`id` integer PRIMARY KEY NOT NULL,
  	`name` text NOT NULL,
  	`trade` text NOT NULL,
  	`dong_id` integer,
  	`address` text,
  	`source` text,
  	`sdsc_id` text,
  	`claimed` integer DEFAULT false,
  	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (`dong_id`) REFERENCES `dongs`(`id`) ON UPDATE no action ON DELETE set null
  );
CREATE INDEX `businesses_dong_idx` ON `businesses` (`dong_id`);
CREATE INDEX `businesses_sdsc_id_idx` ON `businesses` (`sdsc_id`);
CREATE INDEX `businesses_updated_at_idx` ON `businesses` (`updated_at`);
CREATE INDEX `businesses_created_at_idx` ON `businesses` (`created_at`);
CREATE TABLE `landings` (
  	`id` integer PRIMARY KEY NOT NULL,
  	`business_id` integer NOT NULL,
  	`slug` text NOT NULL,
  	`status` text DEFAULT 'draft',
  	`biz_no` text,
  	`biz_verified_at` text,
  	`owner_phone` text,
  	`phone_verified_at` text,
  	`content` text,
  	`areas` text,
  	`game_consent` integer DEFAULT false,
  	`reviewed_at` text,
  	`edit_token_hash` text,
  	`billing` text DEFAULT 'none',
  	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (`business_id`) REFERENCES `businesses`(`id`) ON UPDATE no action ON DELETE set null
  );
CREATE INDEX `landings_business_idx` ON `landings` (`business_id`);
CREATE UNIQUE INDEX `landings_slug_idx` ON `landings` (`slug`);
CREATE INDEX `landings_updated_at_idx` ON `landings` (`updated_at`);
CREATE INDEX `landings_created_at_idx` ON `landings` (`created_at`);
CREATE TABLE `otps` (
  	`id` integer PRIMARY KEY NOT NULL,
  	`phone_hash` text NOT NULL,
  	`code_hash` text NOT NULL,
  	`purpose` text NOT NULL,
  	`payload` text,
  	`expires_at` numeric NOT NULL,
  	`attempts` numeric DEFAULT 0,
  	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
CREATE INDEX `otps_phone_hash_idx` ON `otps` (`phone_hash`);
CREATE INDEX `otps_updated_at_idx` ON `otps` (`updated_at`);
CREATE INDEX `otps_created_at_idx` ON `otps` (`created_at`);
