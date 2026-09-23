import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

/**
 * Single shared `pg` Pool for this service, matching the Neon + Drizzle
 * stack convention (one connection pool, one source of truth).
 */
export const pool = new Pool({
  connectionString: process.env['DATABASE_URL'],
});

export const db = drizzle(pool, { schema });

export type Database = typeof db;
