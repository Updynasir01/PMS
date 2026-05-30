#!/usr/bin/env node
'use strict';

require('dotenv').config({ path: '.env.local' });
const crypto = require('crypto');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const dbUrl = process.env.DATABASE_URL || '';
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: /supabase\.com|neon\.tech|sslmode=require/.test(dbUrl) ? { rejectUnauthorized: false } : false,
});

async function seed() {
  console.log('🌱 Seeding PropSync demo data...\n');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Clear existing data
    await client.query(`
      TRUNCATE audit_log, activity_log, maintenance_messages, maintenance_requests,
        payments, leases, tenants, units, properties, owners, users
      RESTART IDENTITY CASCADE
    `);

    const ROUNDS = 12;
    const hash = (pw) => bcrypt.hashSync(pw, ROUNDS);

    // Users
    const { rows: [admin] } = await client.query(
      `INSERT INTO users (username,password_hash,role,full_name,phone,email)
       VALUES ($1,$2,'superadmin',$3,$4,$5) RETURNING id`,
      ['admin', hash('Admin@2026!'), 'PropSync Admin', '+252612000001', 'admin@propsync.so']
    );

    const { rows: [owner1User] } = await client.query(
      `INSERT INTO users (username,password_hash,role,full_name,phone,email)
       VALUES ($1,$2,'owner',$3,$4,$5) RETURNING id`,
      ['owner', hash('Owner@2026!'), 'Abdirahman Hassan', '+252615001001', 'abdirahman@gmail.com']
    );

    const { rows: [owner2User] } = await client.query(
      `INSERT INTO users (username,password_hash,role,full_name,phone,email)
       VALUES ($1,$2,'owner',$3,$4,$5) RETURNING id`,
      ['fadumo', hash('Owner@2026!'), 'Fadumo Ali Warsame', '+252617002002', 'fadumo@diaspora.com']
    );

    const { rows: [t1User] } = await client.query(
      `INSERT INTO users (username,password_hash,role,full_name,phone,email)
       VALUES ($1,$2,'tenant',$3,$4,$5) RETURNING id`,
      ['tenant', hash('Tenant@2026!'), 'Mohamed Abdi Nur', '+252618003001', 'mohamed@gmail.com']
    );

    const { rows: [t2User] } = await client.query(
      `INSERT INTO users (username,password_hash,role,full_name,phone,email)
       VALUES ($1,$2,'tenant',$3,$4,$5) RETURNING id`,
      ['hodan', hash('Tenant@2026!'), 'Hodan Yusuf Ahmed', '+252618003002', 'hodan@gmail.com']
    );

    const { rows: [t3User] } = await client.query(
      `INSERT INTO users (username,password_hash,role,full_name,phone,email)
       VALUES ($1,$2,'tenant',$3,$4,$5) RETURNING id`,
      ['ibrahim', hash('Tenant@2026!'), 'Ibrahim Osman Farah', '+252618003003', 'ibrahim@gmail.com']
    );

    const { rows: [t4User] } = await client.query(
      `INSERT INTO users (username,password_hash,role,full_name,phone,email)
       VALUES ($1,$2,'tenant',$3,$4,$5) RETURNING id`,
      ['amina', hash('Tenant@2026!'), 'Amina Jama Mohamed', '+252618003004', 'amina@gmail.com']
    );

    // Owner profiles
    const { rows: [owner1] } = await client.query(
      `INSERT INTO owners (user_id,company_name,address,notes) VALUES ($1,$2,$3,$4) RETURNING id`,
      [owner1User.id, 'Hassan Properties', 'KM4, Mogadishu', 'Local investor']
    );

    const { rows: [owner2] } = await client.query(
      `INSERT INTO owners (user_id,company_name,address,notes) VALUES ($1,$2,$3,$4) RETURNING id`,
      [owner2User.id, 'Warsame Real Estate', 'London, UK (diaspora)', 'Diaspora owner - manages remotely']
    );

    // Properties
    const { rows: [prop1] } = await client.query(
      `INSERT INTO properties (owner_id,name,district,address,type,description,total_units)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [owner1.id, 'Hassan Apartments KM4', 'KM4', 'Near KM4 Junction, Wadajir', 'apartment', 'Modern 4-story block with generator', 4]
    );

    const { rows: [prop2] } = await client.query(
      `INSERT INTO properties (owner_id,name,district,address,type,description,total_units)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [owner1.id, 'Airport Road Complex', 'Airport Road', 'Airport Road, Daynile District', 'commercial', 'Mixed-use commercial and residential', 2]
    );

    const { rows: [prop3] } = await client.query(
      `INSERT INTO properties (owner_id,name,district,address,type,description,total_units)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [owner2.id, 'Warsame Tower Hodan', 'Hodan', 'Taleex Street, Hodan District', 'apartment', 'Premium apartments near city centre', 2]
    );

    // Units
    const insertUnit = async (propId, num, floor, beds, kitchen, toilets, furnished, rent, status) => {
      const qr_token = crypto.randomBytes(16).toString('hex');
      const { rows: [u] } = await client.query(
        `INSERT INTO units (property_id,unit_number,floor,bedrooms,has_kitchen,toilets,is_furnished,monthly_rent_usd,status,qr_token)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
        [propId, num, floor, beds, kitchen, toilets, furnished, rent, status, qr_token]
      );
      return u;
    };

    const u1 = await insertUnit(prop1.id, 'A-101', 1, 2, true, 1, false, 350, 'occupied');
    const u2 = await insertUnit(prop1.id, 'A-102', 1, 3, true, 2, true, 500, 'occupied');
    const u3 = await insertUnit(prop1.id, 'A-201', 2, 1, true, 1, false, 250, 'occupied');
    await insertUnit(prop1.id, 'A-202', 2, 2, true, 1, false, 350, 'vacant');
    const u5 = await insertUnit(prop2.id, 'B-G01', 0, 0, false, 1, false, 600, 'occupied');
    await insertUnit(prop2.id, 'B-101', 1, 2, true, 1, true, 450, 'vacant');
    const u7 = await insertUnit(prop3.id, 'W-101', 1, 3, true, 2, true, 700, 'occupied');
    await insertUnit(prop3.id, 'W-201', 2, 4, true, 2, true, 900, 'vacant');

    // Tenant profiles
    const insertTenant = async (userId, unitId, ownerId, nid, emgContact, emgPhone) => {
      const { rows: [t] } = await client.query(
        `INSERT INTO tenants (user_id,unit_id,owner_id,national_id,emergency_contact,emergency_phone)
         VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [userId, unitId, ownerId, nid, emgContact, emgPhone]
      );
      return t;
    };

    const tp1 = await insertTenant(t1User.id, u1.id, owner1.id, 'SOM-001-2020', 'Abdi Nur (brother)', '+252618009001');
    const tp2 = await insertTenant(t2User.id, u2.id, owner1.id, 'SOM-002-2021', 'Ahmed Yusuf (husband)', '+252618009002');
    const tp3 = await insertTenant(t3User.id, u5.id, owner1.id, 'SOM-003-2019', 'Farah Osman (father)', '+252618009003');
    const tp4 = await insertTenant(t4User.id, u7.id, owner2.id, 'SOM-004-2022', 'Jama Mohamed (brother)', '+252618009004');

    // Leases
    const insertLease = async (tenantId, unitId, start, end, rent, deposit) => {
      const { rows: [l] } = await client.query(
        `INSERT INTO leases (tenant_id,unit_id,start_date,end_date,monthly_rent_usd,deposit_usd,status)
         VALUES ($1,$2,$3,$4,$5,$6,'active') RETURNING id`,
        [tenantId, unitId, start, end, rent, deposit]
      );
      return l;
    };

    const l1 = await insertLease(tp1.id, u1.id, '2024-01-01', '2025-12-31', 350, 700);
    const l2 = await insertLease(tp2.id, u2.id, '2024-03-01', '2025-02-28', 500, 1000);
    const l3 = await insertLease(tp3.id, u5.id, '2023-06-01', '2026-05-31', 600, 1200);
    const l4 = await insertLease(tp4.id, u7.id, '2024-06-01', '2026-05-31', 700, 1400);

    // Payments
    const pay = async (leaseId, tenantId, unitId, propId, ownerId, amount, month, due, paidDate, method, status) => {
      await client.query(
        `INSERT INTO payments (lease_id,tenant_id,unit_id,property_id,owner_id,amount_usd,payment_month,due_date,paid_date,payment_method,status,recorded_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
        [leaseId, tenantId, unitId, propId, ownerId, amount, month, due, paidDate, method, status, admin.id]
      );
    };

    await pay(l1.id, tp1.id, u1.id, prop1.id, owner1.id, 350, '2026-03', '2026-03-01', '2026-03-02', 'evc_plus', 'paid');
    await pay(l1.id, tp1.id, u1.id, prop1.id, owner1.id, 350, '2026-04', '2026-04-01', '2026-04-05', 'evc_plus', 'paid');
    await pay(l1.id, tp1.id, u1.id, prop1.id, owner1.id, 350, '2026-05', '2026-05-01', null, null, 'pending');
    await pay(l2.id, tp2.id, u2.id, prop1.id, owner1.id, 500, '2026-03', '2026-03-01', '2026-03-10', 'zaad', 'paid');
    await pay(l2.id, tp2.id, u2.id, prop1.id, owner1.id, 500, '2026-04', '2026-04-01', null, null, 'overdue');
    await pay(l2.id, tp2.id, u2.id, prop1.id, owner1.id, 500, '2026-05', '2026-05-01', null, null, 'overdue');
    await pay(l3.id, tp3.id, u5.id, prop2.id, owner1.id, 600, '2026-03', '2026-03-01', '2026-03-01', 'cash', 'paid');
    await pay(l3.id, tp3.id, u5.id, prop2.id, owner1.id, 600, '2026-04', '2026-04-01', '2026-04-03', 'cash', 'paid');
    await pay(l3.id, tp3.id, u5.id, prop2.id, owner1.id, 600, '2026-05', '2026-05-01', null, null, 'pending');
    await pay(l4.id, tp4.id, u7.id, prop3.id, owner2.id, 700, '2026-03', '2026-03-01', '2026-03-07', 'bank_transfer', 'paid');
    await pay(l4.id, tp4.id, u7.id, prop3.id, owner2.id, 700, '2026-04', '2026-04-01', '2026-04-09', 'bank_transfer', 'paid');
    await pay(l4.id, tp4.id, u7.id, prop3.id, owner2.id, 700, '2026-05', '2026-05-01', null, null, 'pending');

    // Maintenance requests
    const { rows: [mr1] } = await client.query(
      `INSERT INTO maintenance_requests (tenant_id,unit_id,property_id,owner_id,type,title,description,priority,status,assigned_technician)
       VALUES ($1,$2,$3,$4,'electricity','Power outlet sparking in bedroom',
         'The main power outlet in the master bedroom has started sparking when I plug in devices. Getting worse.',
         'high','in_progress','Ahmed Electrician') RETURNING id`,
      [tp1.id, u1.id, prop1.id, owner1.id]
    );

    const { rows: [mr2] } = await client.query(
      `INSERT INTO maintenance_requests (tenant_id,unit_id,property_id,owner_id,type,title,description,priority,status)
       VALUES ($1,$2,$3,$4,'plumbing','Bathroom tap leaking',
         'Cold water tap in the main bathroom drips constantly. Wasting a lot of water.','medium','pending') RETURNING id`,
      [tp2.id, u2.id, prop1.id, owner1.id]
    );

    const { rows: [mr3] } = await client.query(
      `INSERT INTO maintenance_requests (tenant_id,unit_id,property_id,owner_id,type,title,description,priority,status,assigned_technician)
       VALUES ($1,$2,$3,$4,'ac_cooling','AC unit not cooling properly',
         'The living room AC has been running but not cooling below 28C even on max setting.',
         'medium','completed','Hassan AC Tech') RETURNING id`,
      [tp4.id, u7.id, prop3.id, owner2.id]
    );

    // Maintenance messages
    const msg = async (reqId, senderId, role, message) => {
      await client.query(
        `INSERT INTO maintenance_messages (request_id,sender_id,sender_role,message) VALUES ($1,$2,$3,$4)`,
        [reqId, senderId, role, message]
      );
    };

    await msg(mr1.id, t1User.id, 'tenant', 'This is urgent, please send someone today!');
    await msg(mr1.id, owner1User.id, 'owner', 'I have contacted Ahmed Electrician. He will come tomorrow morning 9-11am.');
    await msg(mr1.id, t1User.id, 'tenant', 'Thank you. I will be home. Please let me know if there are any changes.');
    await msg(mr1.id, owner1User.id, 'owner', 'Confirmed. Ahmed will call you before arriving.');
    await msg(mr3.id, t4User.id, 'tenant', 'The AC problem started 2 weeks ago. It is very hot, please prioritize this.');
    await msg(mr3.id, owner2User.id, 'owner', 'Hassan AC Tech came today and serviced the unit. Coolant was refilled. Let me know if it is working now.');
    await msg(mr3.id, t4User.id, 'tenant', 'Yes it is working perfectly now! Thank you so much.');

    await client.query('COMMIT');

    console.log('✅ Demo data seeded!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔑 Demo Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Super Admin:  admin    / Admin@2026!');
    console.log('Owner 1:      owner    / Owner@2026!');
    console.log('Owner 2:      fadumo   / Owner@2026!');
    console.log('Tenant 1:     tenant   / Tenant@2026!');
    console.log('Tenant 2:     hodan    / Tenant@2026!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 Start: npm run dev → http://localhost:3000');

  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
