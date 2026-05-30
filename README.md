# PropSync 🏢
**Next.js + React + PostgreSQL — Mogadishu Property Management**

## Tech Stack
- **Frontend:** Next.js 14 + React 18 + Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** PostgreSQL
- **Auth:** JWT in httpOnly cookies + bcrypt
- **PWA:** Service Worker + manifest.json

---

## Prerequisites
- Node.js 18+ (LTS)
- PostgreSQL 14+ installed and running

---

## Quick Start

### 1. Install PostgreSQL (if not installed)
Download from: https://www.postgresql.org/download/windows/
- Remember your password during install
- Default port: 5432, default user: postgres

### 2. Create the database
Open pgAdmin or psql and run:
```sql
CREATE DATABASE propsync;
```

### 3. Clone / extract project
```bash
cd propsync-next
```

### 4. Install dependencies
```bash
npm install
```

### 5. Configure environment
```bash
copy .env.local.example .env.local
```
Edit `.env.local`:
```
DATABASE_URL=postgresql://postgres:YOURPASSWORD@localhost:5432/propsync
JWT_SECRET=any-long-random-string-at-least-64-characters-here
NODE_ENV=development
```

### 6. Setup database tables
```bash
npm run db:setup
```

### 7. Seed demo data
```bash
npm run db:seed
```

### 8. Start the app
```bash
npm run dev
```

Open: **http://localhost:3000**

---

## Demo Credentials

| Role | Username | Password |
|------|----------|----------|
| Super Admin | `admin` | `Admin@2026!` |
| Owner (local) | `owner` | `Owner@2026!` |
| Owner (diaspora) | `fadumo` | `Owner@2026!` |
| Tenant | `tenant` | `Tenant@2026!` |
| Tenant 2 | `hodan` | `Tenant@2026!` |

---

## Project Structure

```
propsync-next/
├── scripts/
│   ├── setupDb.js          # Creates PostgreSQL tables
│   └── seed.js             # Seeds demo data
├── src/
│   ├── lib/
│   │   ├── db.js           # PostgreSQL connection pool
│   │   ├── auth.js         # JWT + auth helpers
│   │   └── api.js          # Error handling, logging, sanitize
│   ├── pages/
│   │   ├── _app.js         # Auth context + global layout
│   │   ├── _document.js    # PWA meta tags
│   │   ├── index.js        # Dashboard (routes by role)
│   │   ├── login.js        # Login page
│   │   ├── properties.js   # Properties + units + tenant registration
│   │   ├── payments.js     # Payment management
│   │   ├── owners.js       # Admin: manage owners
│   │   ├── tenants.js      # Tenant list
│   │   └── maintenance/
│   │       ├── index.js    # Maintenance list
│   │       └── [id].js     # Detail + threaded chat
│   ├── pages/api/
│   │   ├── auth/[action].js
│   │   ├── admin/[action].js
│   │   ├── owner/[action].js
│   │   └── tenant/[action].js
│   └── components/
│       ├── ui/index.js     # All UI components + helpers
│       ├── layout/Layout.js
│       └── dashboard/
│           ├── AdminDashboard.js
│           ├── OwnerDashboard.js
│           └── TenantDashboard.js
├── public/
│   ├── manifest.json
│   └── sw.js
├── .env.local.example
├── next.config.js
├── tailwind.config.js
└── package.json
```

---

## Production Build
```bash
npm run build
npm start
```

## PWA Install
On mobile — open the site in Chrome → tap "Add to Home Screen"
On desktop — click the install icon in the address bar
