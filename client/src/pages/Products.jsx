import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const money = (v) => (v == null ? '—' : '₹' + Number(v).toLocaleString('en-IN', { minimumFractionDigits: 2 }));

export default function Products() {
  const [items, setItems] = useState(null);
  const [q, setQ] = useState('');
  const [err, setErr] = useState('');
  const [adj, setAdj] = useState({}); // id -> {delta, note}

  const load = useCallback((query) => {
    api('/products' + (query ? `?q=${encodeURIComponent(query)}` : '')).then((d) => setItems(d.products)).catch((e) => setErr(e.message));
  }, []);
  useEffect(() => { const t = setTimeout(() => load(q), 250); return () => clearTimeout(t); }, [q, load]);

  const del = async (p) => {
    if (!window.confirm(`Delete "${p.name}" (${p.sku})? This cannot be undone.`)) return;
    try { await api(`/products/${p.id}`, { method: 'DELETE' }); load(q); } catch (e) { setErr(e.message); }
  };
  const apply = async (p) => {
    const a = adj[p.id] || {};
    setErr('');
    try {
      await api(`/products/${p.id}/adjust`, { method: 'POST', body: { delta: Number(a.delta), note: a.note } });
      setAdj({ ...adj, [p.id]: undefined }); load(q);
    } catch (e) { setErr(e.message); }
  };

  return (
    <>
      <div className="row between">
        <h2>Products</h2>
        <Link className="btn" to="/products/new">+ Add Product</Link>
      </div>
      <input className="search" placeholder="Search by name or SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <div className="alert">{err}</div>}
      <div className="card">
        {!items ? <p className="muted">Loading…</p> : items.length === 0 ? (
          <p className="muted">{q ? 'No products match your search.' : 'No products yet.'}</p>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Name</th><th>SKU</th><th>Quantity</th><th>Stock</th><th>Selling price</th><th>Adjust stock</th><th></th></tr></thead>
            <tbody>{items.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/products/${p.id}`}>{p.name}</Link></td>
                <td>{p.sku}</td>
                <td>{p.quantity_on_hand}</td>
                <td>{p.is_low_stock ? <span className="badge low">Low stock</span> : <span className="badge ok">In stock</span>}</td>
                <td>{money(p.selling_price)}</td>
                <td>
                  <div className="adjust">
                    <input type="number" placeholder="+/- N" value={adj[p.id]?.delta ?? ''} onChange={(e) => setAdj({ ...adj, [p.id]: { ...adj[p.id], delta: e.target.value } })} />
                    <input placeholder="note" value={adj[p.id]?.note ?? ''} onChange={(e) => setAdj({ ...adj, [p.id]: { ...adj[p.id], note: e.target.value } })} />
                    <button className="btn small" disabled={!adj[p.id]?.delta || Number(adj[p.id].delta) === 0} onClick={() => apply(p)}>Apply</button>
                  </div>
                </td>
                <td className="nowrap"><Link to={`/products/${p.id}`}>Edit</Link> · <a href="#del" className="danger" onClick={(e) => { e.preventDefault(); del(p); }}>Delete</a></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
