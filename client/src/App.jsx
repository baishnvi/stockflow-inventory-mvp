import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate, NavLink, useNavigate } from 'react-router-dom';
import { api, getToken, setToken } from './api.js';
import Login from './pages/Login.jsx';
import Signup from './pages/Signup.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Products from './pages/Products.jsx';
import ProductForm from './pages/ProductForm.jsx';
import Settings from './pages/Settings.jsx';

function Layout({ user, onLogout, children }) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">▦ StockFlow</div>
        <div className="org">{user.organizationName}</div>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/products">Products</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="sidebar-foot">
          <div className="muted small">{user.email}</div>
          <button className="btn ghost" onClick={onLogout}>Log out</button>
        </div>
      </aside>
      <main className="content">{children}</main>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(!!getToken());
  const nav = useNavigate();

  useEffect(() => {
    if (!getToken()) return;
    api('/auth/me').then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  const onAuth = (d) => { setToken(d.token); setUser(d.user); nav('/'); };
  const logout = () => { setToken(null); setUser(null); nav('/login'); };

  if (loading) return <div className="center muted">Loading…</div>;
  if (!user)
    return (
      <Routes>
        <Route path="/login" element={<Login onAuth={onAuth} />} />
        <Route path="/signup" element={<Signup onAuth={onAuth} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  return (
    <Layout user={user} onLogout={logout}>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<ProductForm />} />
        <Route path="/products/:id" element={<ProductForm />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
