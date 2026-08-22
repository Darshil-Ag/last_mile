import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: '', email: '', phone: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) return setError('Passwords do not match');
    if (form.password.length < 8) return setError('Password must be at least 8 characters');
    setLoading(true);
    try {
      await register({ full_name: form.full_name, email: form.email, phone: form.phone, password: form.password });
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: 460 }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">LM</div>
          <span className="auth-logo-name">Last-Mile Tracker</span>
        </div>
        <h1 className="auth-title">Create account</h1>
        <p className="auth-subtitle">Start tracking your deliveries today</p>

        {error && <div className="auth-error">{error}</div>}

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input id="reg-name" className="form-input" type="text" placeholder="Sneha Kapoor" value={form.full_name} onChange={set('full_name')} required autoFocus />
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input id="reg-email" className="form-input" type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Phone (optional)</label>
              <input id="reg-phone" className="form-input" type="tel" placeholder="9876543210" value={form.phone} onChange={set('phone')} />
            </div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Password</label>
              <input id="reg-password" className="form-input" type="password" placeholder="Min 8 characters" value={form.password} onChange={set('password')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Confirm Password</label>
              <input id="reg-confirm" className="form-input" type="password" placeholder="Repeat password" value={form.confirm} onChange={set('confirm')} required />
            </div>
          </div>
          <button id="reg-submit" className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ marginTop: 8 }}>
            {loading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Creating account…</> : 'Create Account'}
          </button>
        </form>

        <div className="auth-footer">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
        <div className="auth-footer" style={{ marginTop: 10 }}>
          No account? <Link to="/track">Track an order</Link>
        </div>
      </div>
    </div>
  );
}
