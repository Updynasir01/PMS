# eNuzul 🏢
**Next.js + React + PostgreSQL — Mogadishu Property Management**  
**Domain:** [eNuzul.com](https://eNuzul.com)

eNuzul helps property owners in Mogadishu manage units, tenants, rent, maintenance, leases, and staff — with a **QR-based tenant portal** so renters never need a password.

---

## Tech Stack

| Layer | Stack |
|-------|--------|
| Frontend | Next.js 14, React 18, Tailwind CSS |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Neon, Supabase, or local) |
| Auth | JWT in httpOnly cookies + bcrypt |
| PWA | Service worker + `manifest.json` |

---

## Features

### Core

| Feature | Description |
|---------|-------------|
| **Multi-role access** | Super Admin, Owner, Caretaker, Tenant (dashboard), QR Tenant Portal |
| **Properties & units** | Apartments, villas, commercial, etc.; vacancy tracking; unit photos |
| **Mogadishu districts** | Official 18 Banaadir districts on property forms |
| **Tenant registration** | Name, unit, rent, lease — **no username/password**; access via unit QR only |
| **Rent & payments** | Monthly payment records, overdue tracking, receipt PDF download |
| **Maintenance** | Requests, priority, status workflow, in-thread chat |
| **Subscription plans** | Admin-managed owner plans, trial periods, unit limits |

### QR Tenant Portal

Tenants scan a **unit QR code** for a full mobile portal — no login required:

- Home overview (unit, lease, rent status)
- Payments + rent receipt PDF
- Maintenance requests + live chat with owner/caretaker
- Cloud lease e-sign (draw signature in browser)

Generate/print QR codes from **Properties → Unit → QR Code**.

### Lease & Documents

| Feature | Description |
|---------|-------------|
| **Cloud lease e-sign** | Lease PDF stored in DB; landlord & tenant sign in-app |
| **Signature pad** | Draw signatures; final signed PDF regenerated and downloadable |
| **Lease renewal alerts** | Dashboard banner for leases expiring within 30 days |
| **Move-in / move-out checklist** | JSON checklist triggered on tenant registration |

### Owner Tools

| Feature | Description |
|---------|-------------|
| **Expense tracker** | Costs by category; income vs expenses; net profit on dashboard |
| **Unit photo gallery** | JPG/PNG upload (max 2MB, 10/unit), stored as base64 |
| **Caretaker role** | Limited staff: properties, maintenance, chat — no payments |
| **Technician directory** | Owner + global technicians; assign from maintenance detail |
| **WhatsApp links** | Rent reminders, maintenance contact, lease expiry (no API key) |

### App Experience

| Feature | Description |
|---------|-------------|
| **In-app notifications** | Bell in header for maintenance, leases, payments, admin alerts |
| **Live auto-refresh** | Dashboards/lists poll every 10s + refresh when tab becomes visible |
| **Somali / English** | Language toggle (🇸🇴 / 🇬🇧) with localStorage |
| **Dark / light theme** | Theme toggle on login and in app |
| **Login flexibility** | Sign in with **username or email** (owners, admins, caretakers) |

---

## Roles & Access

| Role | How they access | Notes |
|------|-----------------|-------|
| **Super Admin** | Login | Manage owners, view platform-wide data |
| **Owner** | Login | Full property management |
| **Caretaker** | Login | Maintenance + assigned properties only |
| **Tenant** | **QR portal only** (recommended) | New tenants are registered without passwords; `is_active = false` blocks login |
| **Tenant (legacy demo)** | Login still works for seeded demo accounts | Use QR portal in production |

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

Create `.env.local` in the project root:

```env
DATABASE_URL=postgresql://user:password@host:5432/neondb?sslmode=require
JWT_SECRET=any-long-random-string-at-least-64-characters-here
NODE_ENV=development
```

No third-party API keys are required (WhatsApp uses `wa.me` links only).

### 3. Database setup

**New installs:**

```bash
npm run db:setup
npm run db:seed
```

**Existing database — apply all migrations:**

```bash
npm run db:migrate
```

Individual migrations (if needed):

```bash
npm run db:migrate-plans
npm run db:migrate-qr
```

> **Production:** Run `npm run db:migrate` against your Neon/production database after deploying schema changes (e.g. `notifications`, `lease_documents`).

### 4. Start the app

```bash
npm run dev
```

Open: **http://localhost:3000**

---

## Demo Credentials

| Role | Username | Password | Email (also works for login) |
|------|----------|----------|------------------------------|
| Super Admin | `admin` | `Admin@2026!` | `admin@enuzul.com` |
| Owner (local) | `owner` | `Owner@2026!` | `abdirahman@gmail.com` |
| Owner (diaspora) | `fadumo` | `Owner@2026!` | `fadumo@diaspora.com` |
| Tenant (demo) | `tenant` | `Tenant@2026!` | `mohamed@gmail.com` |
| Tenant 2 (demo) | `hodan` | `Tenant@2026!` | `hodan@gmail.com` |

Create caretakers from **Owner → Caretakers** after logging in as an owner.

**New tenants** registered in the app do not receive login credentials — share the **unit QR code** instead.

---

## Pages

| Route | Role | Purpose |
|-------|------|---------|
| `/` | All logged-in roles | Role-specific dashboard |
| `/login` | Public | Sign in |
| `/properties` | Owner | Properties, units, QR codes, tenant registration |
| `/tenants` | Owner, Admin | Tenant list |
| `/payments` | Owner, Tenant, Admin | Rent payments |
| `/maintenance` | Owner, Tenant, Caretaker, Admin | Maintenance list |
| `/maintenance/[id]` | Owner, Tenant, Caretaker | Request detail + chat |
| `/expenses` | Owner | Expense tracker |
| `/technicians` | Owner | Technician directory |
| `/caretakers` | Owner | Caretaker accounts |
| `/owners` | Super Admin | Manage property owners |
| `/tenant-portal/[token]` | Public (QR) | Full tenant portal |

---

## API Routes

### Auth & notifications

| Route | Methods | Role |
|-------|---------|------|
| `/api/auth/login` | POST | Public |
| `/api/auth/logout` | POST | Authenticated |
| `/api/auth/me` | GET | Authenticated |
| `/api/notifications` | GET, PATCH | Authenticated |

### Owner

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/owner/[action]` | GET, POST, PATCH | Properties, units, tenants, payments, maintenance, QR |
| `/api/owner/photos` | GET, POST, DELETE | Unit photo gallery |
| `/api/owner/expenses` | GET, POST, DELETE | Expense tracker |
| `/api/owner/technicians` | GET, POST, PATCH, DELETE | Technician directory |
| `/api/owner/caretakers` | GET, POST, DELETE | Caretaker accounts |
| `/api/owner/checklist` | GET, POST, PATCH | Move-in / move-out checklist |
| `/api/owner/lease-alerts` | GET | Leases expiring soon |
| `/api/owner/lease-data` | GET | Lease form data |
| `/api/owner/lease-document` | GET, POST, PATCH | Cloud lease + signatures |

### Tenant (logged-in dashboard)

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/tenant/[action]` | GET, POST, PATCH | Tenant dashboard actions |
| `/api/tenant/lease-document` | GET, PATCH | Sign + download lease |

### QR portal (token-based, no login)

| Route | Methods | Purpose |
|-------|---------|---------|
| `/api/public/dashboard` | GET | Portal home data |
| `/api/public/unit` | GET | Unit info |
| `/api/public/maintenance` | GET, POST | Maintenance list + create |
| `/api/public/maintenance-detail` | GET | Request detail + messages |
| `/api/public/maintenance-message` | POST | Send chat message |
| `/api/public/lease-document` | GET, PATCH | Lease view + tenant sign |

### Admin & caretaker

| Route | Methods | Role |
|-------|---------|------|
| `/api/admin/[action]` | GET, POST, PATCH | Super Admin |
| `/api/admin/technicians` | GET, POST | Global technicians |
| `/api/caretaker/[action]` | GET, POST, PATCH | Caretaker |

---

## Project Structure

```
propsync-next/
├── scripts/
│   ├── setupDb.js              # Initial schema
│   ├── seed.js                 # Demo data
│   ├── migrateDb.js            # All feature migrations (run this)
│   ├── migrateOwnerPlans.js
│   └── migrateQrTokens.js
├── public/
│   └── manifest.json           # PWA manifest
├── src/
│   ├── components/
│   │   ├── layout/Layout.js
│   │   ├── dashboard/          # Admin, Owner, Tenant, Caretaker dashboards
│   │   ├── tenant-portal/PortalApp.js
│   │   ├── NotificationBell.js
│   │   ├── LeaseSignPanel.js
│   │   ├── SignaturePad.js
│   │   ├── UnitPhotosModal.js
│   │   └── MoveInChecklistModal.js
│   ├── context/
│   │   ├── ThemeContext.js
│   │   └── LanguageContext.js
│   ├── hooks/
│   │   ├── useAutoRefresh.js
│   │   └── useMaintenanceChatPoll.js
│   ├── lib/
│   │   ├── db.js, auth.js, api.js
│   │   ├── notifications.js
│   │   ├── qrPortal.js, qrToken.js
│   │   ├── generateLease.js, generateReceipt.js, leaseDocuments.js
│   │   ├── mogadishuDistricts.js
│   │   ├── tenantCredentials.js
│   │   ├── translations.js, checklist.js, whatsapp.js
│   │   ├── plans.js, ownerLimits.js, validateEmail.js
│   │   └── imageUpload.js
│   └── pages/
│       ├── index.js, login.js, properties.js, tenants.js
│       ├── payments.js, maintenance/, expenses.js
│       ├── technicians.js, caretakers.js, owners.js
│       ├── tenant-portal/[token].js
│       └── api/                  # REST handlers
└── package.json
```

---

## NPM Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run db:setup` | Create base tables |
| `npm run db:seed` | Load demo data |
| `npm run db:migrate` | Apply all migrations |

---

## Key Dependencies

| Package | Used for |
|---------|----------|
| `jspdf` | Lease & rent receipt PDF generation |
| `sharp` | Resize/compress unit photos before base64 storage |
| `qrcode` | Unit QR codes for tenant portal |
| `bcryptjs` | Password hashing (owners, admins, caretakers) |
| `jsonwebtoken` | Session tokens |
| `pg` | PostgreSQL client |
| `dotenv` | Migration scripts |

---

## Production Build

```bash
npm run build
npm start
```

---

## Deploy (Vercel)

1. Connect the repo and set environment variables:
   - `DATABASE_URL`
   - `JWT_SECRET`
2. Run migrations against production:
   ```bash
   npm run db:migrate
   ```
3. Deploy — Vercel runs `npm run build` automatically.

---

## PWA Install

On mobile: open the site in Chrome → **Add to Home Screen**.

---

## Tenant Onboarding (recommended flow)

1. Owner adds property + units under **Properties**
2. Owner registers tenant (name, unit, rent, lease dates) — no password fields
3. Owner generates **QR code** for the unit and prints/sticks it in the unit
4. Tenant scans QR → full portal (payments, maintenance, lease signing)
