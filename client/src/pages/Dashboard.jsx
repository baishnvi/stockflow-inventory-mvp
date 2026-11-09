import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/dashboard').then(setD).catch((e) => setErr(e.message)); }, []);
  if (err) return <div className="alert">{err}</div>;
  if (!d) return <div className="muted">Loading…</div>;
  return (
    <>
      <h2>Dashboard</h2>
      <div className="stats">
        <div className="card stat"><span className="muted">Total products</span><b>{d.totalProducts}</b></div>
        <div className="card stat"><span className="muted">Units in stock</span><b>{d.totalQuantity}</b></div>
        <div className="card stat warn"><span className="muted">Low stock items</span><b>{d.lowStockCount}</b></div>
      </div>
      <div className="card">
        <h3>Low stock items</h3>
        {d.lowStock.length === 0 ? (
          <p className="muted">{d.totalProducts === 0 ? <>No products yet. <Link to="/products/new">Add your first product</Link>.</> : 'All good — nothing is running low.'}</p>
        ) : (
          <div className="table-wrap"><table>
            <thead><tr><th>Name</th><th>SKU</th><th>Quantity on hand</th><th>Low stock threshold</th></tr></thead>
            <tbody>{d.lowStock.map((p) => (
              <tr key={p.id}><td><Link to={`/products/${p.id}`}>{p.name}</Link></td><td>{p.sku}</td><td className="danger">{p.quantity_on_hand}</td><td>{p.threshold}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </div>
    </>
  );
}
