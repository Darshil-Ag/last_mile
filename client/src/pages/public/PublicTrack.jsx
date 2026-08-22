import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { StatusBadge } from '../../components/ui/Badge';
import OrderTimeline from '../../components/ui/OrderTimeline';
import { formatCurrency, formatWeight, formatDate } from '../../utils/formatters';

/* ─── Inline truck SVG (same as Login page) ───────────────── */
const TruckSVG = () => (
  <svg
    width="28"
    height="22"
    viewBox="-5 0 33 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {/* Body & Cab */}
    <rect x="1" y="3" width="15" height="13" rx="1" fill="var(--paper)" />
    <path d="M16 8h4l3 5v3h-7V8z" fill="var(--paper)" />

    {/* Headlight Lamp & Beam Cone */}
    <polygon points="23,13 27.5,11 27.5,17 23,15" fill="var(--signal)" opacity="0.4" stroke="none" />
    <rect x="22.5" y="13.2" width="1" height="2.6" rx="0.5" fill="var(--signal)" stroke="none" />

    {/* Wheels */}
    <circle cx="5.5" cy="18.5" r="1.5" />
    <circle cx="18.5" cy="18.5" r="1.5" />

    {/* Exhaust Smoke Puffs */}
    <g className="smoke-puff-group">
      <circle className="smoke-puff smoke-1" cx="-1" cy="16" r="1.5" fill="var(--mist)" opacity="0.7" stroke="none" />
      <circle className="smoke-puff smoke-2" cx="-3.5" cy="15.5" r="2.2" fill="var(--mist)" opacity="0.5" stroke="none" />
      <circle className="smoke-puff smoke-3" cx="-6" cy="15" r="3" fill="var(--mist)" opacity="0.4" stroke="none" />
    </g>
  </svg>
);

/* ─── Public track API call (no auth token) ───────────────── */
async function fetchPublicTracking(orderNumber, phone) {
  const base = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '').replace(/\/api$/, '') + '/api'
    : '/api';

  const params = new URLSearchParams({ order_number: orderNumber.trim(), phone: phone.trim() });
  const res = await fetch(`${base}/orders/track?${params}`);

  if (res.status === 404) return { error: 'not_found' };
  if (res.status === 429) return { error: 'rate_limited' };
  if (!res.ok) return { error: 'server_error' };
  return { data: await res.json() };
}

export default function PublicTrack() {
  /* Pre-fill order number from URL param if navigated via /track/:orderId */
  const { orderId } = useParams();

  const [form, setForm] = useState({
    order_number: orderId ?? '',
    phone: '',
  });
  const [result, setResult]   = useState(null);   /* fetched order data  */
  const [error, setError]     = useState('');      /* error message       */
  const [loading, setLoading] = useState(false);

  /* If the URL param changes (direct link), update the prefilled field */
  useEffect(() => {
    if (orderId) setForm((f) => ({ ...f, order_number: orderId }));
  }, [orderId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    const { data, error: fetchError } = await fetchPublicTracking(form.order_number, form.phone);

    if (fetchError === 'not_found') {
      setError(
        "No matching order found. Check your order number and the phone number used when booking."
      );
    } else if (fetchError === 'rate_limited') {
      setError("Too many lookup attempts. Wait a minute and try again.");
    } else if (fetchError) {
      setError("Something went wrong on our end. Try again in a moment.");
    } else {
      setResult(data);
    }

    setLoading(false);
  };

  const handleReset = () => {
    setResult(null);
    setError('');
    setForm({ order_number: '', phone: '' });
  };

  return (
    <div className="auth-page">
      <div className="auth-card-frame">

        {/* Ambient truck animation — identical to login page */}
        <div className="truck-track" aria-hidden="true">
          <div className="truck-patrol">
            <TruckSVG />
          </div>
        </div>

        {/* ── Lookup form card ── */}
        {!result && (
          <div className="auth-card">
            <div className="auth-logo">
              <div className="auth-logo-icon">LM</div>
              <span className="auth-logo-name">Last-Mile Tracker</span>
            </div>

            <h1 className="auth-title">Track your delivery</h1>
            <p className="auth-subtitle">
              Enter your order number and the phone number used when booking.
            </p>

            {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

            <form className="auth-form" onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label">Order Number</label>
                <input
                  id="track-order-number"
                  className="form-input font-mono"
                  type="text"
                  placeholder="ORD-20260822-00002"
                  value={form.order_number}
                  onChange={(e) => setForm({ ...form, order_number: e.target.value.trim() })}
                  required
                  autoFocus={!orderId}
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  id="track-phone"
                  className="form-input"
                  type="tel"
                  placeholder="10-digit mobile number"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.trim() })}
                  required
                  autoFocus={!!orderId}
                />
              </div>

              <button
                id="track-submit"
                className="btn btn-primary btn-lg"
                type="submit"
                disabled={loading}
                style={{ marginTop: 8, width: '100%', justifyContent: 'center' }}
              >
                {loading
                  ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Looking up…</>
                  : 'Find Order'}
              </button>
            </form>

            <div className="auth-footer">
              Have an account?{' '}
              <Link to="/login">Sign in</Link>
            </div>
            <div className="auth-footer" style={{ marginTop: 8 }}>
              Want a rate quote?{' '}
              <Link to="/calculate">Estimate shipping cost</Link>
            </div>
          </div>
        )}

        {/* ── Results card ── */}
        {result && (
          <div className="auth-card" style={{ maxWidth: 560 }}>

            {/* Header row */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <div className="auth-logo" style={{ marginBottom: 8 }}>
                  <div className="auth-logo-icon">LM</div>
                  <span className="auth-logo-name">Last-Mile Tracker</span>
                </div>
                <div className="font-mono" style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 600, letterSpacing: '0.03em' }}>
                  {result.order_number}
                </div>
                <div style={{ marginTop: 6 }}>
                  <StatusBadge status={result.current_status} />
                </div>
              </div>
              <button
                className="btn btn-ghost btn-sm"
                onClick={handleReset}
                style={{ marginTop: 4, flexShrink: 0 }}
              >
                ← New lookup
              </button>
            </div>

            <hr className="divider" />

            {/* Addresses */}
            <div className="form-grid-2" style={{ marginBottom: 16 }}>
              <div>
                <div className="form-label" style={{ marginBottom: 4 }}>Pickup</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{result.pickup_address}</div>
                <div style={{ fontSize: 12, color: 'var(--steel)' }}>
                  PIN {result.pickup_pincode} · {result.pickup_zone?.name}
                </div>
              </div>
              <div>
                <div className="form-label" style={{ marginBottom: 4 }}>Drop</div>
                <div style={{ fontSize: 12.5, color: 'var(--ink)', fontWeight: 500 }}>{result.drop_address}</div>
                <div style={{ fontSize: 12, color: 'var(--steel)' }}>
                  PIN {result.drop_pincode} · {result.drop_zone?.name}
                </div>
              </div>
            </div>

            {/* Order meta row */}
            <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 18, fontSize: 12.5, color: 'var(--steel)' }}>
              <span><strong style={{ color: 'var(--ink)' }}>{result.order_type}</strong> · {result.payment_type}</span>
              <span>Weight: <strong style={{ color: 'var(--ink)' }}>{formatWeight(result.chargeable_weight_kg)}</strong></span>
              <span>Total: <strong style={{ color: 'var(--signal)', fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(result.total_charge)}</strong></span>
            </div>

            {/* Latest attempt info if available */}
            {result.latest_attempt && (
              <div style={{
                background: 'var(--surface-alt)', border: '1px solid var(--rule)',
                borderRadius: 'var(--radius-md)', padding: '10px 14px',
                fontSize: 12.5, color: 'var(--steel)', marginBottom: 18
              }}>
                <span>Attempt #{result.latest_attempt.attempt_number}</span>
                {result.latest_attempt.scheduled_date && (
                  <span> · Scheduled for <strong style={{ color: 'var(--ink)' }}>
                    {formatDate(result.latest_attempt.scheduled_date)}
                  </strong></span>
                )}
                {result.latest_attempt.failure_reason && (
                  <span style={{ color: 'var(--danger)' }}> · {result.latest_attempt.failure_reason}</span>
                )}
              </div>
            )}

            <hr className="divider" />

            {/* Timeline — shared component, no duplication */}
            <div style={{ marginBottom: 4 }}>
              <div className="card-title" style={{ marginBottom: 16 }}>Tracking Timeline</div>
              <OrderTimeline events={result.tracking_events ?? []} />
            </div>

            <div className="auth-footer" style={{ marginTop: 20 }}>
              Have an account?{' '}
              <Link to="/login">Sign in</Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
