#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const dbUrl = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: dbUrl.includes('supabase.com') ? { rejectUnauthorized: false } : false,
});

async function setup() {
  console.log('🔧 Setting up PropSync PostgreSQL database...\n');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role VARCHAR(20) NOT NULL CHECK(role IN ('superadmin','owner','tenant')),
        full_name VARCHAR(100) NOT NULL,
        phone VARCHAR(25),
        email VARCHAR(100),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS owners (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        company_name VARCHAR(100),
        national_id VARCHAR(50),
        address VARCHAR(200),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS properties (
        id SERIAL PRIMARY KEY,
        owner_id INTEGER NOT NULL REFERENCES owners(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        district VARCHAR(50) NOT NULL,
        address VARCHAR(200) NOT NULL,
        type VARCHAR(20) NOT NULL DEFAULT 'apartment',
        description TEXT,
        total_units INTEGER NOT NULL DEFAULT 0,
        title_deed_ref VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS units (
        id SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        unit_number VARCHAR(20) NOT NULL,
        floor INTEGER DEFAULT 1,
        bedrooms INTEGER NOT NULL DEFAULT 1,
        has_kitchen BOOLEAN NOT NULL DEFAULT true,
        toilets INTEGER NOT NULL DEFAULT 1,
        is_furnished BOOLEAN NOT NULL DEFAULT false,
        monthly_rent_usd NUMERIC(10,2) NOT NULL,
        status VARCHAR(20) NOT NULL DEFAULT 'vacant' CHECK(status IN ('occupied','vacant','maintenance')),
        notes TEXT,
        qr_token VARCHAR(64) UNIQUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(property_id, unit_number)
      );

      CREATE TABLE IF NOT EXISTS tenants (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
        unit_id INTEGER REFERENCES units(id) ON DELETE SET NULL,
        owner_id INTEGER NOT NULL REFERENCES owners(id),
        national_id VARCHAR(50),
        emergency_contact VARCHAR(100),
        emergency_phone VARCHAR(25),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS leases (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        unit_id INTEGER NOT NULL REFERENCES units(id),
        start_date DATE NOT NULL,
        end_date DATE,
        monthly_rent_usd NUMERIC(10,2) NOT NULL,
        deposit_usd NUMERIC(10,2) DEFAULT 0,
        status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK(status IN ('active','expired','terminated')),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id SERIAL PRIMARY KEY,
        lease_id INTEGER NOT NULL REFERENCES leases(id),
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        unit_id INTEGER NOT NULL REFERENCES units(id),
        property_id INTEGER NOT NULL REFERENCES properties(id),
        owner_id INTEGER NOT NULL REFERENCES owners(id),
        amount_usd NUMERIC(10,2) NOT NULL,
        payment_month VARCHAR(7) NOT NULL,
        due_date DATE NOT NULL,
        paid_date DATE,
        payment_method VARCHAR(20) CHECK(payment_method IN ('evc_plus','zaad','sahal','cash','bank_transfer')),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('paid','pending','overdue')),
        notes TEXT,
        recorded_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS maintenance_requests (
        id SERIAL PRIMARY KEY,
        tenant_id INTEGER NOT NULL REFERENCES tenants(id),
        unit_id INTEGER NOT NULL REFERENCES units(id),
        property_id INTEGER NOT NULL REFERENCES properties(id),
        owner_id INTEGER NOT NULL REFERENCES owners(id),
        type VARCHAR(20) NOT NULL CHECK(type IN ('electricity','plumbing','painting','ac_cooling','other')),
        title VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high')),
        status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','in_progress','completed')),
        assigned_technician VARCHAR(100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS maintenance_messages (
        id SERIAL PRIMARY KEY,
        request_id INTEGER NOT NULL REFERENCES maintenance_requests(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id),
        sender_role VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS activity_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        entity_type VARCHAR(50),
        entity_id INTEGER,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS audit_log (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        action VARCHAR(50) NOT NULL,
        table_name VARCHAR(50),
        record_id INTEGER,
        old_values JSONB,
        new_values JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_units_property ON units(property_id);
      CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
      CREATE INDEX IF NOT EXISTS idx_payments_month ON payments(payment_month);
      CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
      CREATE INDEX IF NOT EXISTS idx_maintenance_owner ON maintenance_requests(owner_id);
      CREATE INDEX IF NOT EXISTS idx_maintenance_status ON maintenance_requests(status);
      CREATE INDEX IF NOT EXISTS idx_leases_tenant ON leases(tenant_id);

      ALTER TABLE units ADD COLUMN IF NOT EXISTS qr_token VARCHAR(64) UNIQUE;
    `);

    await client.query('COMMIT');
    console.log('✅ All tables created successfully!');
    console.log('\nNext step: run  npm run db:seed');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Setup failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

setup();
