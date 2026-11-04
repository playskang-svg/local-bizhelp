import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-d1-sqlite'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.run(sql`CREATE TABLE \`dongs\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`slug\` text NOT NULL,
  	\`name\` text NOT NULL,
  	\`gu\` text NOT NULL,
  	\`isatips_slug\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE UNIQUE INDEX \`dongs_slug_idx\` ON \`dongs\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`dongs_updated_at_idx\` ON \`dongs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`dongs_created_at_idx\` ON \`dongs\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`businesses\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`name\` text NOT NULL,
  	\`trade\` text NOT NULL,
  	\`dong_id\` integer,
  	\`address\` text,
  	\`source\` text,
  	\`sdsc_id\` text,
  	\`claimed\` integer DEFAULT false,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`dong_id\`) REFERENCES \`dongs\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`businesses_dong_idx\` ON \`businesses\` (\`dong_id\`);`)
  await db.run(sql`CREATE INDEX \`businesses_sdsc_id_idx\` ON \`businesses\` (\`sdsc_id\`);`)
  await db.run(sql`CREATE INDEX \`businesses_updated_at_idx\` ON \`businesses\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`businesses_created_at_idx\` ON \`businesses\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`landings\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`business_id\` integer NOT NULL,
  	\`slug\` text NOT NULL,
  	\`status\` text DEFAULT 'draft',
  	\`biz_no\` text,
  	\`biz_verified_at\` text,
  	\`owner_phone\` text,
  	\`phone_verified_at\` text,
  	\`content\` text,
  	\`areas\` text,
  	\`game_consent\` integer DEFAULT false,
  	\`reviewed_at\` text,
  	\`edit_token_hash\` text,
  	\`billing\` text DEFAULT 'none',
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`business_id\`) REFERENCES \`businesses\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`landings_business_idx\` ON \`landings\` (\`business_id\`);`)
  await db.run(sql`CREATE UNIQUE INDEX \`landings_slug_idx\` ON \`landings\` (\`slug\`);`)
  await db.run(sql`CREATE INDEX \`landings_updated_at_idx\` ON \`landings\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`landings_created_at_idx\` ON \`landings\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`inquiries\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`landing_id\` integer NOT NULL,
  	\`dong\` text,
  	\`work\` text,
  	\`wish_date\` text,
  	\`customer_phone\` text,
  	\`consent\` integer DEFAULT false,
  	\`src\` text,
  	\`valid\` integer DEFAULT true,
  	\`invalid_reason\` text,
  	\`notified_at\` text,
  	\`notify_result\` text,
  	\`ack_token_hash\` text,
  	\`ack_at\` text,
  	\`reminded_at\` text,
  	\`outcome\` text DEFAULT 'none',
  	\`outcome_note\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`landing_id\`) REFERENCES \`landings\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`inquiries_landing_idx\` ON \`inquiries\` (\`landing_id\`);`)
  await db.run(sql`CREATE INDEX \`inquiries_updated_at_idx\` ON \`inquiries\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`inquiries_created_at_idx\` ON \`inquiries\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`call_clicks\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`landing_id\` integer NOT NULL,
  	\`src\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`landing_id\`) REFERENCES \`landings\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`call_clicks_landing_idx\` ON \`call_clicks\` (\`landing_id\`);`)
  await db.run(sql`CREATE INDEX \`call_clicks_updated_at_idx\` ON \`call_clicks\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`call_clicks_created_at_idx\` ON \`call_clicks\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`worklogs\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`landing_id\` integer NOT NULL,
  	\`minutes\` numeric,
  	\`date\` text,
  	\`note\` text,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	FOREIGN KEY (\`landing_id\`) REFERENCES \`landings\`(\`id\`) ON UPDATE no action ON DELETE set null
  );
  `)
  await db.run(sql`CREATE INDEX \`worklogs_landing_idx\` ON \`worklogs\` (\`landing_id\`);`)
  await db.run(sql`CREATE INDEX \`worklogs_updated_at_idx\` ON \`worklogs\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`worklogs_created_at_idx\` ON \`worklogs\` (\`created_at\`);`)
  await db.run(sql`CREATE TABLE \`otps\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`phone_hash\` text NOT NULL,
  	\`code_hash\` text NOT NULL,
  	\`purpose\` text NOT NULL,
  	\`payload\` text,
  	\`expires_at\` numeric NOT NULL,
  	\`attempts\` numeric DEFAULT 0,
  	\`updated_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
  	\`created_at\` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
  );
  `)
  await db.run(sql`CREATE INDEX \`otps_phone_hash_idx\` ON \`otps\` (\`phone_hash\`);`)
  await db.run(sql`CREATE INDEX \`otps_updated_at_idx\` ON \`otps\` (\`updated_at\`);`)
  await db.run(sql`CREATE INDEX \`otps_created_at_idx\` ON \`otps\` (\`created_at\`);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`dongs_id\` integer REFERENCES dongs(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`businesses_id\` integer REFERENCES businesses(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`landings_id\` integer REFERENCES landings(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`inquiries_id\` integer REFERENCES inquiries(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`call_clicks_id\` integer REFERENCES call_clicks(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`worklogs_id\` integer REFERENCES worklogs(id);`)
  await db.run(sql`ALTER TABLE \`payload_locked_documents_rels\` ADD \`otps_id\` integer REFERENCES otps(id);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_dongs_id_idx\` ON \`payload_locked_documents_rels\` (\`dongs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_businesses_id_idx\` ON \`payload_locked_documents_rels\` (\`businesses_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_landings_id_idx\` ON \`payload_locked_documents_rels\` (\`landings_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_inquiries_id_idx\` ON \`payload_locked_documents_rels\` (\`inquiries_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_call_clicks_id_idx\` ON \`payload_locked_documents_rels\` (\`call_clicks_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_worklogs_id_idx\` ON \`payload_locked_documents_rels\` (\`worklogs_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_otps_id_idx\` ON \`payload_locked_documents_rels\` (\`otps_id\`);`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.run(sql`DROP TABLE \`dongs\`;`)
  await db.run(sql`DROP TABLE \`businesses\`;`)
  await db.run(sql`DROP TABLE \`landings\`;`)
  await db.run(sql`DROP TABLE \`inquiries\`;`)
  await db.run(sql`DROP TABLE \`call_clicks\`;`)
  await db.run(sql`DROP TABLE \`worklogs\`;`)
  await db.run(sql`DROP TABLE \`otps\`;`)
  await db.run(sql`PRAGMA foreign_keys=OFF;`)
  await db.run(sql`CREATE TABLE \`__new_payload_locked_documents_rels\` (
  	\`id\` integer PRIMARY KEY NOT NULL,
  	\`order\` integer,
  	\`parent_id\` integer NOT NULL,
  	\`path\` text NOT NULL,
  	\`media_id\` integer,
  	\`users_id\` integer,
  	FOREIGN KEY (\`parent_id\`) REFERENCES \`payload_locked_documents\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`media_id\`) REFERENCES \`media\`(\`id\`) ON UPDATE no action ON DELETE cascade,
  	FOREIGN KEY (\`users_id\`) REFERENCES \`users\`(\`id\`) ON UPDATE no action ON DELETE cascade
  );
  `)
  await db.run(sql`INSERT INTO \`__new_payload_locked_documents_rels\`("id", "order", "parent_id", "path", "media_id", "users_id") SELECT "id", "order", "parent_id", "path", "media_id", "users_id" FROM \`payload_locked_documents_rels\`;`)
  await db.run(sql`DROP TABLE \`payload_locked_documents_rels\`;`)
  await db.run(sql`ALTER TABLE \`__new_payload_locked_documents_rels\` RENAME TO \`payload_locked_documents_rels\`;`)
  await db.run(sql`PRAGMA foreign_keys=ON;`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_order_idx\` ON \`payload_locked_documents_rels\` (\`order\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_parent_idx\` ON \`payload_locked_documents_rels\` (\`parent_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_path_idx\` ON \`payload_locked_documents_rels\` (\`path\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_media_id_idx\` ON \`payload_locked_documents_rels\` (\`media_id\`);`)
  await db.run(sql`CREATE INDEX \`payload_locked_documents_rels_users_id_idx\` ON \`payload_locked_documents_rels\` (\`users_id\`);`)
}
