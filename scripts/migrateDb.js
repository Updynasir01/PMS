#!/usr/bin/env node
'use strict';

/**
 * PropSync — run all migrations for features 1–10 (and caretaker role).
 * Usage: node scripts/migrateDb.js
 * Requires DATABASE_URL in .env.local
 */

require('dotenv').config({ path: '.env.local', quiet: true });
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /supabase\.com|neon\.tech|sslmode=require/.test(dbUrl) ? { rejectUnauthorized: false } : false,
});

const migrations = `
-- Feature 1: Unit photo gallery
CREATE TABLE IF NOT EXISTS unit_photos (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  photo_url TEXT NOT NULL,
  caption VARCHAR(100),
  is_primary BOOLEAN DEFAULT false,
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_unit_photos_unit ON unit_photos(unit_id);

-- Feature 2: Expense tracker
CREATE TABLE IF NOT EXISTS expenses (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
  unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
  category VARCHAR(50) NOT NULL CHECK(category IN (
    'generator_fuel', 'security', 'cleaning',
    'repair', 'water', 'electricity',
    'maintenance_parts', 'staff_salary', 'other'
  )),
  description TEXT NOT NULL,
  amount_usd NUMERIC(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  receipt_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_expenses_owner ON expenses(owner_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);

-- Feature 5: Caretaker role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK(role IN ('superadmin', 'owner', 'tenant', 'caretaker'));

CREATE TABLE IF NOT EXISTS caretakers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  property_ids INTEGER[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_caretakers_owner ON caretakers(owner_id);

-- Feature 8: Technician directory
CREATE TABLE IF NOT EXISTS technicians (
  id SERIAL PRIMARY KEY,
  owner_id INTEGER REFERENCES owners(id) ON DELETE CASCADE,
  is_global BOOLEAN DEFAULT false,
  name VARCHAR(100) NOT NULL,
  specialty VARCHAR(50) NOT NULL CHECK(specialty IN (
    'electricity', 'plumbing', 'painting',
    'ac_cooling', 'general', 'other'
  )),
  phone VARCHAR(25) NOT NULL,
  whatsapp VARCHAR(25),
  rating INTEGER DEFAULT 5 CHECK(rating BETWEEN 1 AND 5),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_technicians_owner ON technicians(owner_id);

-- Feature 10: Move in / move out checklist
CREATE TABLE IF NOT EXISTS unit_checklists (
  id SERIAL PRIMARY KEY,
  unit_id INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
  tenant_id INTEGER REFERENCES tenants(id) ON DELETE SET NULL,
  type VARCHAR(10) NOT NULL CHECK(type IN ('move_in', 'move_out')),
  checklist_data JSONB NOT NULL DEFAULT '{}',
  condition_notes TEXT,
  deposit_deduction_usd NUMERIC(10,2) DEFAULT 0,
  deduction_reason TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_checklists_unit ON unit_checklists(unit_id);

-- Feature 11 columns (safe if already applied)
ALTER TABLE owners ADD COLUMN IF NOT EXISTS plan VARCHAR(20) DEFAULT 'starter';
ALTER TABLE owners ADD COLUMN IF NOT EXISTS plan_status VARCHAR(20) DEFAULT 'trial';
ALTER TABLE owners ADD COLUMN IF NOT EXISTS trial_start DATE DEFAULT CURRENT_DATE;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS trial_end DATE DEFAULT (CURRENT_DATE + 60);
ALTER TABLE owners ADD COLUMN IF NOT EXISTS paid_until DATE;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS max_units INTEGER DEFAULT 10;
ALTER TABLE owners ADD COLUMN IF NOT EXISTS monthly_fee NUMERIC(10,2) DEFAULT 19;

ALTER TABLE units ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64) UNIQUE;

-- Cloud lease e-signatures
CREATE TABLE IF NOT EXISTS lease_documents (
  id SERIAL PRIMARY KEY,
  lease_id INTEGER REFERENCES leases(id) ON DELETE SET NULL,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
  contract_ref VARCHAR(50) NOT NULL,
  document_pdf TEXT,
  landlord_signature TEXT,
  landlord_signed_at TIMESTAMPTZ,
  tenant_signature TEXT,
  tenant_signed_at TIMESTAMPTZ,
  status VARCHAR(30) DEFAULT 'pending_signatures',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_lease_documents_tenant ON lease_documents(tenant_id);

-- In-app notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  link VARCHAR(500),
  ref_key VARCHAR(120),
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_user_ref ON notifications(user_id, ref_key);
`;

async function run() {
  console.log('🔧 Running PropSync database migrations...\n');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migrations);
    await client.query('COMMIT');
    console.log('✅ All migrations applied successfully.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
