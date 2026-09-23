import {
  bigint,
  bigserial,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from 'drizzle-orm/pg-core';

/**
 * Mirrors the DDL applied directly against Neon (see the prompts-versioning
 * schema migration). Schema changes for this stack go through the Neon MCP,
 * not drizzle-kit — keep this file in sync with the live database by hand.
 */
export const prompts = pgTable('prompts', {
  id: bigserial('id', { mode: 'number' }).primaryKey(),
  promptKey: text('prompt_key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  // Nullable pointer to the version currently tagged production. Never
  // rewritten in place — only ever repointed to a different immutable row.
  productionVersionId: bigint('production_version_id', { mode: 'number' }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});

/**
 * Append-only: rows in this table are never updated or deleted by
 * application code once inserted. `(prompt_id, version)` is unique so a
 * given version number can only ever mean one immutable piece of content.
 */
export const promptVersions = pgTable(
  'prompt_versions',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    promptId: bigint('prompt_id', { mode: 'number' })
      .notNull()
      .references(() => prompts.id),
    version: integer('version').notNull(),
    content: text('content').notNull(),
    metadata: jsonb('metadata').$type<Record<string, unknown> | null>(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [unique().on(table.promptId, table.version)]
);
