import { Pool } from 'pg';

// Singleton pool — reused across API calls in Next.js
let pool;

export function getDb() {
  if (!pool) {
    const url = process.env.DATABASE_URL || '';
    const useSsl =
      url.includes('supabase.com') ||
      url.includes('neon.tech') ||
      url.includes('sslmode=require') ||
      process.env.NODE_ENV === 'production';
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: useSsl ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });
  }
  return pool;
}

// Helper: run a query and return rows
export async function query(sql, params = []) {
  const db = getDb();
  const result = await db.query(sql, params);
  return result.rows;
}

// Helper: run a query and return first row
export async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// Helper: run a query and return rowCount
export async function execute(sql, params = []) {
  const db = getDb();
  const result = await db.query(sql, params);
  return result;
}
