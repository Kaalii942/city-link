# CITY LINK (Engineering & Services) - Enterprise System

Commercial-grade, production-ready Enterprise Inventory, Procurement, Sales Tax Invoicing, Delivery Challan, & Financial Management System for electronic hardware import enterprises. Custom-built with React 19, Express API, TypeScript, Prisma ORM, and Electron Desktop.

---

## 🏗️ Monorepo Structure

```
.
├── apps/
│   ├── backend/     # Express API Server (REST API, JWT, Role Security, Scheduled Backups)
│   ├── frontend/    # React 19 SPA (TanStack Query, Redux Toolkit, Dynamics layout, Tailwind)
│   └── desktop/     # Electron wrapper with native IPC bindings & print spooling
├── packages/
│   ├── database/    # Prisma schemas (SQLite, SQL Server, PostgreSQL), migrations & seeds
│   ├── shared/      # Shared Zod validators, DTO types
│   ├── utils/       # Winston rotating logging, bcrypt, backup/restore
│   └── config/      # Environment parser and schema validations
├── docs/            # Installation & Architecture Guides
├── vercel.json      # Frontend Vercel single-page application routing rules
├── .env.example     # Production Environment Configuration Template
└── package.json
```

---

## 🚀 Cloud & Remote Client Deployment Guide

### 1. Frontend Deployment (Vercel)
The React frontend (`apps/frontend`) is fully optimized for Vercel deployment:
1. Connect your GitHub repository `city-link` to **Vercel**.
2. Configure project settings:
   - **Root Directory**: `apps/frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: URL of your deployed production API server (e.g. `https://citylink-backend.onrender.com`).
4. Click **Deploy**. Vercel will build and host the SPA interface with route rewriting handled automatically via [`apps/frontend/vercel.json`](file:///d:/City%20links/apps/frontend/vercel.json).

---

### 2. Backend Deployment (Render / Railway / VPS)
The Express backend (`apps/backend`) handles JWT authentication, background node-schedule jobs, file attachments, and database connections. It requires a persistent Node environment:
1. Deploy as a Web Service on **Render**, **Railway**, **Fly.io**, or your custom **Linux VPS**.
2. Set build and start commands:
   - **Build Command**: `npm run build:packages`
   - **Start Command**: `npm run start --workspace=apps/backend` (or `node apps/backend/dist/server.js`)
3. Configure Environment Variables:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or host provided port)
   - `FRONTEND_URL`: `https://your-citylink-frontend.vercel.app` (Required for CORS)
   - `DATABASE_URL`: Cloud Database connection string (PostgreSQL / SQL Server / SQLite)
   - `JWT_SECRET`: Random string (minimum 32 characters)
   - `JWT_REFRESH_SECRET`: Random string (minimum 32 characters)
   - `BACKUP_DIR`: `./backups`
   - `UPLOAD_DIR`: `./uploads`
   - `LOG_LEVEL`: `info`

---

### 3. Cloud Database Setup (PostgreSQL / SQL Server / Supabase)
1. Provision a database on **Supabase**, **Neon**, **Render Postgres**, **AWS RDS**, or **Azure SQL**.
2. If using PostgreSQL, copy `packages/database/prisma/schema.postgresql.prisma` over `packages/database/prisma/schema.prisma`.
3. Run database migrations & seed initial Super Admin:
   ```bash
   npx prisma db push --schema=packages/database/prisma/schema.prisma
   npm run db:seed --workspace=packages/database
   ```
4. **Default Credentials Created by Seed**:
   - **Username**: `superadmin`
   - **Password**: `Password123!`

---

## 🔒 Security & CORS Policy
- Production CORS blocks requests from unapproved domains while allowing requests from `FRONTEND_URL` and non-browser desktop app calls.
- Passwords are strictly hashed with `bcrypt`.
- JWT access tokens (1h) and refresh tokens (7d) handle secure multi-user role-based permissions.

---

## 💻 Local Development Setup

```bash
# 1. Install dependencies
npm install

# 2. Build shared package dependencies
npm run build:packages

# 3. Seed local SQLite database
npm run db:seed --workspace=packages/database

# 4. Start full system (Backend + Frontend + Desktop app)
npm run dev:all
```

---

## 🧪 Post-Deployment Verification Checklist

- [ ] **Health Endpoint**: Test `https://<backend-host>/api/health` returns `{"status":"ok"}`.
- [ ] **Authentication**: Log in using `superadmin` / `Password123!`.
- [ ] **RBAC**: Verify permissions for Super Admin vs Operator.
- [ ] **Quotation & Invoice**: Create a quotation, convert to Sales Tax Invoice, and test browser PDF/print dialog.
- [ ] **Delivery Challan**: Generate a delivery challan.
- [ ] **Procurement & Ledger**: Verify stock flow movements, supplier records, and customer balances.
