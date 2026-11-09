# StockFlow MVP – Multi-tenant Inventory Management

Minimal SaaS inventory app: signup/login (with organization), product CRUD, dashboard with low-stock items, and org-level settings. Every query is scoped by `organization_id` (no cross-tenant access).

**Stack:** Node.js + Express, SQLite (Node built-in `node:sqlite`, Node >= 22.13), JWT + bcrypt, React (Vite).

## Features
- Signup (email, password, confirm, organization name) / login
- Products: name, SKU (unique per org), description, quantity, cost/selling price, low-stock threshold; create, edit, delete (with confirm), search by name/SKU
- Inline "Adjust stock" (+/- N with note); `last_updated_by` + timestamp stored
- Dashboard: total products, total units, low-stock table (qty <= threshold, falls back to org default)
- Settings: default low-stock threshold (default 5)

## Run locally
```bash
cp .env.example .env
npm install
npm --prefix client install
npm run dev                 # API on :4000
npm --prefix client run dev # UI on :5173 (proxies /api)
```

## Production (single server)
```bash
npm install && npm run build   # builds client/dist
npm start                      # Express serves API + built UI on $PORT
```
Env: `JWT_SECRET` (required in prod), `PORT`, `DB_PATH` (point at a persistent disk).

## Deploy on Render (Web Service)
- Build command: `npm install && npm run build`
- Start command: `npm start`
- Env vars: `NODE_VERSION=22`, `JWT_SECRET=<random string>`, `DB_PATH=/var/data/stockflow.db`
- Add a Disk mounted at `/var/data` so SQLite data persists.

## API
| Method | Route | Notes |
|---|---|---|
| POST | /api/auth/signup, /api/auth/login | returns JWT |
| GET | /api/auth/me | |
| GET/POST | /api/products | `?q=` search |
| GET/PUT/DELETE | /api/products/:id | |
| POST | /api/products/:id/adjust | `{delta, note}` |
| GET | /api/dashboard | |
| GET/PUT | /api/settings | |
