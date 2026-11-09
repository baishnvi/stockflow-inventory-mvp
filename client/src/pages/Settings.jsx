import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function Settings() {
  const [v, setV] = useState('');
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  useEffect(() => { api('/settings').then((d) => setV(d.defaultLowStockThreshold)).catch((e) => setErr(e.message)); }, []);
  const save = async (e) => {
    e.preventDefault(); setErr(''); setMsg('');
    try { await api('/settings', { method: 'PUT', body: { defaultLowStockThreshold: Number(v) } }); setMsg('Settings saved'); }
    catch (x) { setErr(x.message); }
  };
  return (
    <>
      <h2>Settings</h2>
      <form className="card form" onSubmit={save}>
        {err && <div className="alert">{err}</div>}
        {msg && <div className="alert ok">{msg}</div>}
        <label>Default low stock threshold
          <input type="number" min="0" step="1" required value={v} onChange={(e) => setV(e.target.value)} />
        </label>
        <p className="muted small">Used for products that have no threshold of their own. A product is “low stock” when quantity ≤ threshold.</p>
        <div><button className="btn">Save</button></div>
      </form>
    </>
  );
}
