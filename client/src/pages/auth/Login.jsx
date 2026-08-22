import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

/* ─── Flat truck SVG (24×24 viewport, stroke-based, single colour) ── */
const TruckSVG = () => (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect x="1" y="3" width="15" height="13" rx="1" />
    <path d="M16 8h4l3 5v3h-7V8z" />
    <circle cx="5.5" cy="18.5" r="1.5" />
    <circle cx="18.5" cy="18.5" r="1.5" />
  </svg>
);

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const user = await login(form.email, form.password);
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'AGENT') navigate('/agent');
      else navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">

      {/*
        .auth-card-frame: position:relative container that gives the truck
        room to live ABOVE the card without clipping.
        The truck-track is absolute within this frame; the card sits below it.
      */}
      <div className="auth-card-frame">

        {/* ── Ambient truck animation ── */}
        <div className="truck-track" aria-hidden="true">
          {/*
            Single .truck-patrol element — one @keyframes handles
            both translateX (position) and scaleX (facing direction).
            Flip is instantaneous at each endpoint via steps(1,end).
          */}
          <div className="truck-patrol">
            <TruckSVG />
          </div>
        </div>

        {/* ── The card itself ── */}
        <div className="auth-card">
          <div className="auth-logo">
            <div className="auth-logo-icon">LM</div>
            <span className="auth-logo-name">Last-Mile Tracker</span>
          </div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-subtitle">Sign in to your account to continue</p>

          {error && <div className="auth-error">{error}</div>}

          <form className="auth-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                id="login-email"
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                required
                autoFocus
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                id="login-password"
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                required
              />
            </div>
            <button
              id="login-submit"
              className="btn btn-primary btn-lg"
              type="submit"
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading
                ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Signing in…</>
                : 'Sign In'}
            </button>
          </form>

          <div className="auth-footer">
            Don't have an account?{' '}
            <Link to="/register">Create one</Link>
          </div>
          <div className="auth-footer" style={{ marginTop: 8 }}>
            Want a rate quote?{' '}
            <Link to="/calculate">Estimate shipping cost</Link>
          </div>
          <div className="auth-footer" style={{ marginTop: 8 }}>
            No account?{' '}
            <Link to="/track">Track an order</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
