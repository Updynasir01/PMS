#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env.local', quiet: true });
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /supabase\.com|neon\.tech|sslmode=require/.test(dbUrl) ? { rejectUnauthorized: false } : false,
});

async function migrate() {
  console.log('🔧 Adding owner subscription plan columns...\n');
  const client = await pool.connect();
  try {
    await client.query(`
      ALTER TABLE owners ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'starter';
      ALTER TABLE owners ADD COLUMN IF NOT EXISTS plan_status VARCHAR(20) DEFAULT 'trial';
      ALTER TABLE owners ADD COLUMN IF NOT EXISTS trial_start DATE DEFAULT CURRENT_DATE;
      ALTER TABLE owners ADD COLUMN IF NOT EXISTS trial_end DATE DEFAULT (CURRENT_DATE + 60);
      ALTER TABLE owners ADD COLUMN IF NOT EXISTS paid_until DATE;
      ALTER TABLE owners ADD COLUMN IF NOT EXISTS max_units INTEGER DEFAULT 10;
      ALTER TABLE owners ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2) DEFAULT 19;
    `);
    console.log('✅ Owner plan columns ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((e) => {
  console.error('❌ Migration failed:', e.message);
  process.exit(1);
});
