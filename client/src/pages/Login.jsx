import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Login({ onAuth }) {
  const [f, setF] = useState({ email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault(); setErr(''); setBusy(true);
    try { onAuth(await api('/auth/login', { method: 'POST', body: f })); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth-wrap">
      <form className="card auth" onSubmit={submit}>
        <h1>▦ StockFlow</h1>
        <p className="muted">Log in to manage your inventory</p>
        {err && <div className="alert">{err}</div>}
        <label>Email<input type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
        <label>Password<input type="password" required value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} /></label>
        <button className="btn" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="small center">New here? <Link to="/signup">Create an account</Link></p>
      </form>
    </div>
  );
}
