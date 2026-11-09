import React, { useEffect, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { api } from '../api.js';

const empty = { name: '', sku: '', description: '', quantity_on_hand: 0, cost_price: '', selling_price: '', low_stock_threshold: '' };

export default function ProductForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [f, setF] = useState(empty);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [meta, setMeta] = useState(null);

  useEffect(() => {
    if (!id) return;
    api(`/products/${id}`).then(({ product: p }) => {
      setMeta(p);
      setF({ name: p.name, sku: p.sku, description: p.description ?? '', quantity_on_hand: p.quantity_on_hand,
        cost_price: p.cost_price ?? '', selling_price: p.selling_price ?? '', low_stock_threshold: p.low_stock_threshold ?? '' });
    }).catch((e) => setErr(e.message));
  }, [id]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { await api(id ? `/products/${id}` : '/products', { method: id ? 'PUT' : 'POST', body: f }); nav('/products'); }
    catch (x) { setErr(x.message); setBusy(false); }
  };

  return (
    <>
      <h2>{id ? 'Edit product' : 'Add product'}</h2>
      <form className="card form" onSubmit={submit}>
        {err && <div className="alert">{err}</div>}
        <div className="grid2">
          <label>Name *<input required value={f.name} onChange={set('name')} /></label>
          <label>SKU * (unique)<input required value={f.sku} onChange={set('sku')} /></label>
        </div>
        <label>Description<textarea rows="3" value={f.description} onChange={set('description')} /></label>
        <div className="grid2">
          <label>Quantity on hand<input type="number" min="0" step="1" value={f.quantity_on_hand} onChange={set('quantity_on_hand')} /></label>
          <label>Low stock threshold <span className="muted small">(blank = org default)</span><input type="number" min="0" step="1" value={f.low_stock_threshold} onChange={set('low_stock_threshold')} /></label>
          <label>Cost price<input type="number" min="0" step="0.01" value={f.cost_price} onChange={set('cost_price')} /></label>
          <label>Selling price<input type="number" min="0" step="0.01" value={f.selling_price} onChange={set('selling_price')} /></label>
        </div>
        {meta && <p className="muted small">Last updated {meta.updated_at} UTC by {meta.last_updated_by || '—'}</p>}
        <div className="row">
          <button className="btn" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
          <Link className="btn ghost" to="/products">Cancel</Link>
        </div>
      </form>
    </>
  );
}
