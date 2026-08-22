# 🚚 Last-Mile Delivery Tracker

A complete, production-ready logistics and delivery management platform. Built with **React + Vite** (Frontend), **Node.js + Express** (Backend API), and **Supabase PostgreSQL** (Database).

---

## 🌟 Key Features

1. **Role-Based Access Control**:
   - **CUSTOMER**: Create orders with real-time charge preview, view live tracking timeline, reschedule failed deliveries.
   - **AGENT**: Self-report availability & GPS coordinates, view assigned orders, update order status.
   - **ADMIN**: Manage delivery zones & pincodes, configure rate cards & COD surcharges, assign agents (manual/auto), override status.
2. **Dynamic Rate Calculation Engine**: Zero hardcoded rates. Pricing is calculated dynamically from admin-configured rate cards (`B2B`/`B2C`, `intra-zone`/`inter-zone`), volumetric weight ($\frac{L \times B \times H}{5000}$), chargeable weight ($\max(\text{actual}, \text{volumetric})$), and COD surcharges (`FIXED` or `PERCENTAGE`).
3. **Zone-First Auto-Assignment**: Assigns available agents in the pickup zone first (sorted by Haversine GPS proximity), falling back system-wide with audit trail tracking.
4. **Immutable Status History**: Database triggers block `UPDATE` and `DELETE` queries on status logs (`tracking_events`), preserving a tamper-proof audit log.
5. **Proactive Notifications**: Transactional emails sent via **Resend** on every status update with notification history stored in database.

---

## 📁 Repository Structure

```
d:\last_mile\
├── client/                 # React 18 + Vite SPA (Vercel)
│   ├── src/
│   │   ├── components/     # UI tokens, Navbar, Sidebar, Modals
│   │   ├── context/        # AuthContext (JWT session management)
│   │   ├── pages/          # Customer, Agent, Admin views
│   │   └── services/       # Axios API client
├── server/                 # Node.js + Express API (Render / Railway)
│   ├── src/
│   │   ├── db/             # Supabase client (service_role)
│   │   ├── middleware/     # JWT authentication & role authorization
│   │   ├── routes/         # Auth, Zones, Rate Cards, COD Configs, Orders, Agents
│   │   └── services/       # Rate Engine, Auto-Assign, Resend Email
│   └── tests/              # Jest rate engine unit tests
├── schema.sql              # Database DDL (tables, indexes, triggers, sequence)
├── seed.sql                # Seed data (Mumbai zones, 18 rate cards, test users)
└── SYSTEM_DESIGN.md        # System design document (<= 800 words)
```

---

## 🚀 Quick Start (Local Setup)

### 1. Database Setup (Supabase)
1. Log in to [Supabase Dashboard](https://supabase.com).
2. Open the **SQL Editor**.
3. Run `schema.sql` to construct tables, enums, triggers, and sequences.
4. Run `seed.sql` to populate sample zones, pincodes, rate cards, and test accounts.

### 2. Backend Setup
```bash
cd server
cp .env.example .env
```
Fill in `.env` with your credentials:
```env
PORT=4000
NODE_ENV=development
SUPABASE_URL=https://your-supabase-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
JWT_SECRET=your-32-character-secret-key
JWT_EXPIRES_IN=7d
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=onboarding@resend.dev
FRONTEND_URL=http://localhost:5173
```

Install & start server:
```bash
npm install
npm run dev
```

Run unit tests:
```bash
npm test
```

### 3. Frontend Setup
```bash
cd ../client
npm install
npm run dev
```
Open your browser at `http://localhost:5173`.

---

## 🔑 Test Demo Credentials

All test accounts use the password: `Password@123`

| Role | Email | Details |
|---|---|---|
| **ADMIN** | `admin@lastmile.dev` | Full system access |
| **AGENT** | `ravi.agent@lastmile.dev` | South Mumbai agent (AVAILABLE) |
| **AGENT** | `priya.agent@lastmile.dev` | Central Mumbai agent (AVAILABLE) |
| **AGENT** | `arjun.agent@lastmile.dev` | Navi Mumbai agent (OFFLINE) |
| **CUSTOMER** | `sneha@example.com` | Customer account |
| **CUSTOMER** | `vikram@example.com` | Customer account |

---

## 📡 Key API Endpoints

### Auth
- `POST /api/auth/register` — Customer sign up
- `POST /api/auth/login` — Sign in (returns JWT)
- `GET /api/auth/me` — Current user profile

### Pricing & Orders
- `POST /api/orders/calculate` — Preview delivery charge
- `POST /api/orders` — Confirm & create order
- `GET /api/orders` — List orders (Admin, supports filtering)
- `GET /api/orders/mine` — List customer orders
- `GET /api/orders/:id` — Detail & tracking timeline
- `POST /api/orders/:id/assign` — Assign agent (auto/manual)
- `PUT /api/orders/:id/status` — Update order status (Agent/Admin)
- `POST /api/orders/:id/reschedule` — Reschedule failed order (Customer)

### Config & Management
- `GET / POST / PUT /api/zones` — Manage delivery zones & pincodes
- `GET / POST / PUT /api/rate-cards` — Version-controlled rate cards
- `GET / POST / PUT /api/cod-configs` — COD surcharge rules
- `GET / PUT /api/agents` — Manage agent location & availability

---

## ☁️ Deployment Guide

### Deploy Backend (Render / Railway)
1. Create a Web Service on Render / Railway pointing to the `/server` directory.
2. Set Environment Variables (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `JWT_SECRET`, `RESEND_API_KEY`, `FRONTEND_URL`).
3. Set Build Command: `npm install`
4. Set Start Command: `node src/app.js`

### Deploy Frontend (Vercel)
1. Import project into Vercel and select the `/client` directory as Root Directory.
2. Build Command: `npm run build`
3. Output Directory: `dist`
4. Add Rewrite Rule in Vercel settings or `vercel.json` if proxying `/api` to Render backend URL.
