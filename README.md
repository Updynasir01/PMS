# PropSync 🏢
**Next.js + React + PostgreSQL — Mogadishu Property Management**

## Tech Stack
- **Frontend:** Next.js 14 + React 18 + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL (Neon / Supabase / local)
- **Auth:** JWT in httpOnly cookies + bcrypt
- **PWA:** Service Worker + manifest.json

---

## New Features (v2)

| # | Feature | Description |
|---|---------|-------------|
| 1 | **Unit photo gallery** | Upload JPG/PNG (max 2MB, 10/unit) stored as base64; primary thumbnail |
| 2 | **Expense tracker** | Track costs by category; income vs expenses; net profit on dashboard |
| 3 | **Lease PDF + e-sign** | Cloud lease in DB; landlord & tenant sign in-app (draw signature); final PDF stored online; optional download |
| 4 | **Rent receipt PDF** | Download receipt for paid payments (owner + QR portal) |
| 5 | **Caretaker role** | Limited staff access: properties, maintenance, chat — no payments |
| 6 | **WhatsApp links** | Rent reminders, maintenance contact, lease expiry (no API key) |
| 7 | **Lease renewal alerts** | Dashboard banner for leases expiring within 30 days |
| 8 | **Technician directory** | Owner + global technicians; assign from maintenance detail |
| 9 | **Somali / English** | Language toggle (🇸🇴 / 🇬🇧) with localStorage |
| 10 | **Move-in / move-out checklist** | JSON checklist on tenant registration |
| — | **Subscription plans** | Already included (admin owner plans, unit limits) |
| — | **QR tenant portal** | Full tenant app via scan (no login) |

---

## Prerequisites
- Node.js 18+ (LTS)
- PostgreSQL 14+ (or Neon cloud database)

---

## Quick Start

### 1. Install dependencies
```bash
cd propsync-next
npm install
```

### 2. Configure environment
```bash
copy .env.local.example .env.local
```
Edit `.env.local`:
```
DATABASE_URL=postgresql://user:password@host:5432/neondb?sslmode=require
JWT_SECRET=any-long-random-string-at-least-64-characters-here
NODE_ENV=development
```

**No new environment variables** are required for features 1–10.

### 3. Database setup

**New installs:**
```bash
npm run db:setup
npm run db:seed
```

**Existing database — run all new migrations at once:**
```bash
npm run db:migrate
```

Or run individual migrations:
```bash
npm run db:migrate-plans
npm run db:migrate-qr
```

### 4. Start the app
```bash
npm run dev
```

Open: **http://localhost:3000**

---

## NPM Packages Added

| Package | Used for |
|---------|----------|
| `jspdf` | Lease & rent receipt PDF generation (client-side) |
| `sharp` | Resize/compress unit photos before base64 storage |
| `multer` | Installed per spec (photos use JSON base64 API) |
| `qrcode` | Unit QR codes (existing) |
| `dotenv` | Migration scripts |

---

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin` | `Admin@2026!` |
| Owner (local) | `owner` | `Owner@2026!` |
| Owner (diaspora) | `fadumo` | `Owner@2026!` |
| Tenant | `tenant` | `Tenant@2026!` |
| Tenant 2 | `hodan` | `Tenant@2026!` |

Create caretakers from **Owner → Caretakers** after login as owner.

---

## New API Routes

| Route | Methods | Role |
|-------|---------|------|
| `/api/owner/photos` | GET, POST, DELETE | Owner |
| `/api/owner/expenses` | GET, POST, DELETE | Owner |
| `/api/owner/technicians` | GET, POST, PATCH, DELETE | Owner |
| `/api/owner/caretakers` | GET, POST, DELETE | Owner |
| `/api/owner/checklist` | GET, POST, PATCH | Owner |
| `/api/owner/lease-alerts` | GET | Owner |
| `/api/owner/lease-data` | GET | Owner |
| `/api/owner/lease-document` | GET, POST, PATCH | Owner (cloud lease + signatures) |
| `/api/tenant/lease-document` | GET, PATCH | Tenant (sign + download) |
| `/api/public/lease-document` | GET, PATCH | QR portal tenant sign |
| `/api/owner/renew-lease` | PATCH | Owner (via `[action]`) |
| `/api/caretaker/[action]` | GET, POST, PATCH | Caretaker |
| `/api/admin/technicians` | GET, POST | Super Admin (global techs) |
| `/api/public/dashboard` | GET | Public (QR token) |

---

## New Pages

- `/expenses` — Owner expense tracker
- `/technicians` — Technician directory
- `/caretakers` — Manage caretaker accounts
- `/tenant-portal/[token]` — Full tenant portal (QR)

---

## Project Structure (updated)

```
propsync-next/
├── scripts/
│   ├── setupDb.js
│   ├── seed.js
│   ├── migrateDb.js          # ← Run all feature migrations
│   ├── migrateOwnerPlans.js
│   └── migrateQrTokens.js
├── src/
│   ├── lib/
│   │   ├── plans.js, qrPortal.js, whatsapp.js
│   │   ├── generateLease.js, generateReceipt.js
│   │   ├── translations.js, checklist.js, imageUpload.js
│   ├── context/
│   │   ├── ThemeContext.js
│   │   └── LanguageContext.js
│   ├── pages/
│   │   ├── expenses.js, technicians.js, caretakers.js
│   │   └── tenant-portal/[token].js
│   └── components/
│       ├── UnitPhotosModal.js
│       ├── MoveInChecklistModal.js
│       └── dashboard/CaretakerDashboard.js
```

---

## Production Build
```bash
npm run build
npm start
```

## Deploy (Vercel)
1. Set `DATABASE_URL` and `JWT_SECRET` on Vercel
2. Run `npm run db:migrate` against production DB
3. Deploy

## PWA Install
On mobile — open the site in Chrome → tap "Add to Home Screen"
