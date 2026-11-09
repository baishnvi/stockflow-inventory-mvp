import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

export default function Signup({ onAuth }) {
  const [f, setF] = useState({ organizationName: '', email: '', password: '', confirm: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const submit = async (e) => {
    e.preventDefault(); setErr('');
    if (f.password.length < 6) return setErr('Password must be at least 6 characters');
    if (f.password !== f.confirm) return setErr('Passwords do not match');
    setBusy(true);
    try { onAuth(await api('/auth/signup', { method: 'POST', body: { email: f.email, password: f.password, organizationName: f.organizationName } })); }
    catch (x) { setErr(x.message); } finally { setBusy(false); }
  };
  return (
    <div className="auth-wrap">
      <form className="card auth" onSubmit={submit}>
        <h1>▦ StockFlow</h1>
        <p className="muted">Create your account</p>
        {err && <div className="alert">{err}</div>}
        <label>Organization name<input required placeholder="My Test Store" value={f.organizationName} onChange={set('organizationName')} /></label>
        <label>Email<input type="email" required value={f.email} onChange={set('email')} /></label>
        <label>Password<input type="password" required value={f.password} onChange={set('password')} /></label>
        <label>Confirm password<input type="password" required value={f.confirm} onChange={set('confirm')} /></label>
        <button className="btn" disabled={busy}>{busy ? 'Creating…' : 'Sign up'}</button>
        <p className="small center">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
