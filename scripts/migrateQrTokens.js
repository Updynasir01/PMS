#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env.local', quiet: true });
const crypto = require('crypto');
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /supabase\.com|neon\.tech|sslmode=require/.test(dbUrl) ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  console.log('🔧 Adding qr_token column and backfilling units...\n');
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE units ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64) UNIQUE;
    `);

    const { rows: missing } = await client.query(
      'SELECT id, unit_number FROM units WHERE qr_token IS NULL'
    );

    for (const unit of missing) {
      const token = crypto.randomBytes(16).toString('hex');
      await client.query('UPDATE units SET qr_token = $1 WHERE id = $2', [token, unit.id]);
      console.log(`  ✓ ${unit.unit_number} → ${token}`);
    }

    console.log(`\n✅ Done. ${missing.length} unit(s) updated.`);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((e) => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});
