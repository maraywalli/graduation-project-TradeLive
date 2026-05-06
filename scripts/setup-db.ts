/**
 * Apply db/schema.sql to Supabase using the direct Postgres connection.
 *
 * Requires SUPABASE_DB_URL (or DATABASE_URL) — the connection string from
 * Supabase Project Settings → Database → Connection string (URI, with password).
 *
 * Falls back to printing the SQL editor URL if no connection string is set.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Client } from 'pg';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL;

if (!DB_URL) {
  console.error('\n❌ No SUPABASE_DB_URL set.\n');
  console.error('Get it from Supabase → Project Settings → Database → Connection string (URI).');
  console.error('Then add it as a secret named SUPABASE_DB_URL.\n');
  if (SUPABASE_URL) {
    const ref = SUPABASE_URL.replace('https://', '').split('.')[0];
    console.error(`SQL Editor: https://supabase.com/dashboard/project/${ref}/sql/new`);
  }
  process.exit(2);
}

const FILES = [
  'db/schema.sql',
  'db/role_billing.sql',
  'db/free_post_limit.sql',
  'db/06_drop_livestreams.sql',
  'db/08_items_geo_index.sql',
  'db/09_cart_items.sql',
];

async function main() {
  const client = new Client({
    connectionString: DB_URL,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();
  console.log('✓ Connected to Postgres');
  try {
    for (const f of FILES) {
      const sql = readFileSync(resolve(f), 'utf8');
      console.log(`→ Applying ${f} …`);
      await client.query(sql);
      console.log(`  ✓ ${f}`);
    }
    console.log('\n✓ All migrations applied');
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error('Schema apply failed:', e.message);
  process.exit(1);
});
