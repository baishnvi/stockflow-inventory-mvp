require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const db = require('./db');
const { sign, requireAuth } = require('./auth');

const app = express();
app.use(cors());
app.use(express.json());

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const bad = (res, msg, code = 400) => res.status(code).json({ error: msg });

/* ---------- Auth ---------- */
app.post('/api/auth/signup', (req, res) => {
  const { email, password, organizationName } = req.body || {};
  if (!emailRe.test(email || '')) return bad(res, 'Valid email required');
  if (!password || password.length < 6) return bad(res, 'Password must be at least 6 characters');
  if (!organizationName || !organizationName.trim()) return bad(res, 'Organization name required');
  const e = email.trim().toLowerCase();
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(e)) return bad(res, 'Email already registered', 409);

  const tx = db.transaction(() => {
    const org = db.prepare('INSERT INTO organizations (name) VALUES (?)').run(organizationName.trim());
    const u = db
      .prepare('INSERT INTO users (organization_id, email, password_hash) VALUES (?, ?, ?)')
      .run(org.lastInsertRowid, e, bcrypt.hashSync(password, 10));
    return { id: u.lastInsertRowid, organization_id: org.lastInsertRowid, email: e };
  });
  const user = tx();
  res.status(201).json({ token: sign(user), user: { email: user.email, organizationName: organizationName.trim() } });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body || {};
  if (!emailRe.test(email || '') || !password) return bad(res, 'Email and password required');
  const u = db.prepare('SELECT * FROM users WHERE email = ?').get(email.trim().toLowerCase());
  if (!u || !bcrypt.compareSync(password, u.password_hash)) return bad(res, 'Invalid email or password', 401);
  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(u.organization_id);
  res.json({ token: sign(u), user: { email: u.email, organizationName: org.name } });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(req.user.orgId);
  res.json({ user: { email: req.user.email, organizationName: org.name } });
});

/* ---------- Helpers ---------- */
const getDefault = (orgId) =>
  db.prepare('SELECT default_low_stock_threshold d FROM organizations WHERE id = ?').get(orgId).d;

function decorate(p, def) {
  const threshold = p.low_stock_threshold ?? def;
  return { ...p, effective_threshold: threshold, is_low_stock: p.quantity_on_hand <= threshold };
}

const numOrNull = (v) => (v === '' || v === null || v === undefined ? null : Number(v));

function validateProduct(b) {
  const name = (b.name || '').trim();
  const sku = (b.sku || '').trim();
  if (!name) return { error: 'Name is required' };
  if (!sku) return { error: 'SKU is required' };
  const qty = b.quantity_on_hand === '' || b.quantity_on_hand == null ? 0 : Number(b.quantity_on_hand);
  if (!Number.isInteger(qty) || qty < 0) return { error: 'Quantity must be a non-negative integer' };
  const cost = numOrNull(b.cost_price), sell = numOrNull(b.selling_price), thr = numOrNull(b.low_stock_threshold);
  if (cost !== null && (isNaN(cost) || cost < 0)) return { error: 'Cost price must be a non-negative number' };
  if (sell !== null && (isNaN(sell) || sell < 0)) return { error: 'Selling price must be a non-negative number' };
  if (thr !== null && (!Number.isInteger(thr) || thr < 0)) return { error: 'Low stock threshold must be a non-negative integer' };
  return { value: { name, sku, description: (b.description || '').trim() || null, qty, cost, sell, thr } };
}

/* ---------- Products ---------- */
app.get('/api/products', requireAuth, (req, res) => {
  const def = getDefault(req.user.orgId);
  const q = (req.query.q || '').trim();
  const rows = q
    ? db.prepare(`SELECT * FROM products WHERE organization_id = ? AND (name LIKE ? OR sku LIKE ?) ORDER BY updated_at DESC, id DESC`)
        .all(req.user.orgId, `%${q}%`, `%${q}%`)
    : db.prepare('SELECT * FROM products WHERE organization_id = ? ORDER BY updated_at DESC, id DESC').all(req.user.orgId);
  res.json({ products: rows.map((p) => decorate(p, def)), defaultThreshold: def });
});

app.get('/api/products/:id', requireAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ?').get(req.params.id, req.user.orgId);
  if (!p) return bad(res, 'Product not found', 404);
  res.json({ product: decorate(p, getDefault(req.user.orgId)) });
});

app.post('/api/products', requireAuth, (req, res) => {
  const v = validateProduct(req.body || {});
  if (v.error) return bad(res, v.error);
  const { name, sku, description, qty, cost, sell, thr } = v.value;
  if (db.prepare('SELECT 1 FROM products WHERE organization_id = ? AND sku = ?').get(req.user.orgId, sku))
    return bad(res, `SKU "${sku}" already exists`, 409);
  const r = db.prepare(`INSERT INTO products (organization_id, name, sku, description, quantity_on_hand, cost_price, selling_price, low_stock_threshold, last_updated_by)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(req.user.orgId, name, sku, description, qty, cost, sell, thr, req.user.email);
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(r.lastInsertRowid);
  res.status(201).json({ product: decorate(p, getDefault(req.user.orgId)) });
});

app.put('/api/products/:id', requireAuth, (req, res) => {
  const existing = db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ?').get(req.params.id, req.user.orgId);
  if (!existing) return bad(res, 'Product not found', 404);
  const v = validateProduct(req.body || {});
  if (v.error) return bad(res, v.error);
  const { name, sku, description, qty, cost, sell, thr } = v.value;
  if (db.prepare('SELECT 1 FROM products WHERE organization_id = ? AND sku = ? AND id != ?').get(req.user.orgId, sku, existing.id))
    return bad(res, `SKU "${sku}" already exists`, 409);
  db.prepare(`UPDATE products SET name=?, sku=?, description=?, quantity_on_hand=?, cost_price=?, selling_price=?, low_stock_threshold=?,
    last_updated_by=?, updated_at=datetime('now') WHERE id=? AND organization_id=?`)
    .run(name, sku, description, qty, cost, sell, thr, req.user.email, existing.id, req.user.orgId);
  const p = db.prepare('SELECT * FROM products WHERE id = ?').get(existing.id);
  res.json({ product: decorate(p, getDefault(req.user.orgId)) });
});

// Quick stock adjust: +/- N units with optional note
app.post('/api/products/:id/adjust', requireAuth, (req, res) => {
  const p = db.prepare('SELECT * FROM products WHERE id = ? AND organization_id = ?').get(req.params.id, req.user.orgId);
  if (!p) return bad(res, 'Product not found', 404);
  const delta = Number(req.body?.delta);
  if (!Number.isInteger(delta) || delta === 0) return bad(res, 'Delta must be a non-zero integer');
  const next = p.quantity_on_hand + delta;
  if (next < 0) return bad(res, `Cannot go below 0 (current stock: ${p.quantity_on_hand})`);
  db.prepare(`UPDATE products SET quantity_on_hand=?, last_updated_by=?, updated_at=datetime('now') WHERE id=?`)
    .run(next, req.user.email, p.id);
  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(p.id);
  res.json({ product: decorate(updated, getDefault(req.user.orgId)), note: req.body?.note || null });
});

app.delete('/api/products/:id', requireAuth, (req, res) => {
  const r = db.prepare('DELETE FROM products WHERE id = ? AND organization_id = ?').run(req.params.id, req.user.orgId);
  if (!r.changes) return bad(res, 'Product not found', 404);
  res.json({ ok: true });
});

/* ---------- Dashboard ---------- */
app.get('/api/dashboard', requireAuth, (req, res) => {
  const def = getDefault(req.user.orgId);
  const rows = db.prepare('SELECT * FROM products WHERE organization_id = ?').all(req.user.orgId).map((p) => decorate(p, def));
  const low = rows.filter((p) => p.is_low_stock).sort((a, b) => a.quantity_on_hand - b.quantity_on_hand);
  res.json({
    totalProducts: rows.length,
    totalQuantity: rows.reduce((s, p) => s + p.quantity_on_hand, 0),
    lowStockCount: low.length,
    lowStock: low.map((p) => ({ id: p.id, name: p.name, sku: p.sku, quantity_on_hand: p.quantity_on_hand, threshold: p.effective_threshold })),
  });
});

/* ---------- Settings ---------- */
app.get('/api/settings', requireAuth, (req, res) => {
  res.json({ defaultLowStockThreshold: getDefault(req.user.orgId) });
});
app.put('/api/settings', requireAuth, (req, res) => {
  const t = Number(req.body?.defaultLowStockThreshold);
  if (!Number.isInteger(t) || t < 0) return bad(res, 'Threshold must be a non-negative integer');
  db.prepare('UPDATE organizations SET default_low_stock_threshold = ? WHERE id = ?').run(t, req.user.orgId);
  res.json({ defaultLowStockThreshold: t });
});

/* ---------- Static client (production) ---------- */
const dist = path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(dist));
app.get(/^\/(?!api).*/, (req, res, next) => {
  res.sendFile(path.join(dist, 'index.html'), (err) => err && next());
});
app.use('/api', (req, res) => bad(res, 'Not found', 404));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`StockFlow running on http://localhost:${PORT}`));
