/**
 * Capture real product screenshots for the landing page.
 * Usage: node scripts/capture-marketing-shots.js
 * Requires: npm run dev on localhost:3000
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
require('dotenv').config({ path: '.env.local', quiet: true });
const { Pool } = require('pg');

const BASE = process.env.CAPTURE_BASE_URL || 'http://localhost:3000';
const OUT = path.join(__dirname, '..', 'public', 'marketing');

async function getQrToken() {
  const dbUrl = process.env.DATABASE_URL || '';
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: /supabase\.com|neon\.tech|sslmode=require/.test(dbUrl)
      ? { rejectUnauthorized: false }
      : false,
  });
  try {
    const { rows } = await pool.query(
      `SELECT qr_token FROM units
       WHERE status = 'occupied' AND qr_token IS NOT NULL
       LIMIT 1`
    );
    return rows[0]?.qr_token || null;
  } finally {
    await pool.end();
  }
}

async function login(page, username, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#username', { timeout: 15000 });
  await page.fill('#username', username);
  await page.fill('input[type="password"]', password);
  await Promise.all([
    page.waitForURL(/\/app/, { timeout: 25000 }),
    page.click('button[type="submit"]'),
  ]);
}

async function shot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false, type: 'png' });
  console.log('✓', file);
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const qr = await getQrToken();
  console.log('QR token:', qr ? `${qr.slice(0, 8)}…` : '(none)');

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    colorScheme: 'light',
  });
  const page = await context.newPage();

  await login(page, 'owner', 'Owner@2026!');

  // Force light English UI if toggles exist
  try {
    await page.evaluate(() => {
      localStorage.setItem('enuzul-theme', 'light');
      localStorage.setItem('enuzul-lang', 'en');
      document.documentElement.setAttribute('data-theme', 'light');
    });
  } catch (_) {}

  // Dashboard — wait for stats
  await page.goto(`${BASE}/app`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Collected', { timeout: 20000 }).catch(() => {});
  await page.waitForTimeout(800);
  await shot(page, 'dashboard');

  // Properties — select first property for unit detail
  await page.goto(`${BASE}/properties`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Add Property', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(600);
  const firstCard = page.locator('main button, main [role="button"], main .cursor-pointer').first();
  // Prefer clicking a property name card in the list
  const propCard = page.locator('text=Hassan Apartments KM4').first();
  if (await propCard.count()) {
    await propCard.click();
    await page.waitForTimeout(1000);
  } else {
    const anyProp = page.locator('main').locator('h3, .font-display').nth(1);
    if (await anyProp.count()) {
      await anyProp.click();
      await page.waitForTimeout(1000);
    }
  }
  await shot(page, 'properties');

  // Maintenance
  await page.goto(`${BASE}/maintenance`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=Maintenance', { timeout: 15000 });
  await page.waitForTimeout(1000);
  await shot(page, 'maintenance');

  // Tenant portal
  if (qr) {
    const phone = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      colorScheme: 'light',
    });
    const portal = await phone.newPage();
    await portal.goto(`${BASE}/tenant-portal/${qr}`, { waitUntil: 'networkidle' });
    await portal.waitForSelector('text=Welcome', { timeout: 15000 }).catch(() => {});
    await portal.waitForTimeout(1200);
    await portal.screenshot({
      path: path.join(OUT, 'tenant-portal.png'),
      type: 'png',
    });
    console.log('✓', path.join(OUT, 'tenant-portal.png'));
    await phone.close();
  }

  await browser.close();
  console.log('\nDone. Images in public/marketing/');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
