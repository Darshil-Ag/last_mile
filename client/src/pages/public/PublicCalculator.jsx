import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency, formatWeight } from '../../utils/formatters';

/* ─── Inline truck SVG (shared with Login + PublicTrack) ─────── */
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

/* ─── Public calculate API call (no auth token) ──────────────── */
async function fetchCalculate(body) {
  const base = import.meta.env.VITE_API_BASE_URL
    ? import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '').replace(/\/api$/, '') + '/api'
    : '/api';

  const res = await fetch(`${base}/orders/calculate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Calculation failed');
  return json;
}

const INITIAL = {
  pickup_pincode:  '',
  drop_pincode:    '',
  length_cm:       '',
  breadth_cm:      '',
  height_cm:       '',
  actual_weight_kg:'',
  order_type:      'B2C',
  payment_type:    'PREPAID',
};

export default function PublicCalculator() {
  const [form, setForm]       = useState(INITIAL);
  const [charge, setCharge]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const debounceRef           = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* Auto-calculate whenever all required fields are filled — debounced 600ms,
     same behaviour as the authenticated NewOrder form */
  useEffect(() => {
    const {
      pickup_pincode, drop_pincode,
      length_cm, breadth_cm, height_cm,
      actual_weight_kg, order_type, payment_type,
    } = form;

    if (!pickup_pincode || !drop_pincode || !length_cm || !breadth_cm || !height_cm || !actual_weight_kg) {
      setCharge(null);
      setError('');
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await fetchCalculate({
          pickup_pincode, drop_pincode,
          length_cm:        Number(length_cm),
          breadth_cm:       Number(breadth_cm),
          height_cm:        Number(height_cm),
          actual_weight_kg: Number(actual_weight_kg),
          order_type, payment_type,
        });
        setCharge(result);
      } catch (err) {
        /* Pass the backend error message through unchanged — rateEngine already
           returns user-facing copy ("Pincode X is not mapped to any delivery zone") */
        setError(err.message);
        setCharge(null);
      } finally {
        setLoading(false);
      }
    }, 600);

    return () => clearTimeout(debounceRef.current);
  }, [
    form.pickup_pincode, form.drop_pincode,
    form.length_cm, form.breadth_cm, form.height_cm,
    form.actual_weight_kg, form.order_type, form.payment_type,
  ]);

  const handleSaveDraft = () => {
    try {
      if (form.pickup_pincode || form.drop_pincode || form.length_cm) {
        sessionStorage.setItem('pending_order_draft', JSON.stringify(form));
      }
    } catch (e) {}
  };

  return (
    <div className="auth-page">
      <div style={{ position: 'relative', width: '100%', maxWidth: 480, zIndex: 1 }}>

        {/* Ambient truck animation — same as Login + Track pages */}
        <div className="truck-track" aria-hidden="true">
          <div className="truck-patrol"><TruckSVG /></div>
        </div>

        <div className="auth-card" style={{ maxWidth: 480 }}>

          {/* Logo */}
          <div className="auth-logo">
            <div className="auth-logo-icon">LM</div>
            <span className="auth-logo-name">Last-Mile Tracker</span>
          </div>

          <h1 className="auth-title">Estimate shipping cost</h1>
          <p className="auth-subtitle">
            Enter package details to get an instant rate — no account required.
          </p>

          {/* ── Form ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Pincodes */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Pickup Pincode</label>
                <input
                  id="calc-pickup-pin"
                  className="form-input font-mono"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="400001"
                  value={form.pickup_pincode}
                  onChange={set('pickup_pincode')}
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label className="form-label">Drop Pincode</label>
                <input
                  id="calc-drop-pin"
                  className="form-input font-mono"
                  type="text"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="400703"
                  value={form.drop_pincode}
                  onChange={set('drop_pincode')}
                />
              </div>
            </div>

            {/* Dimensions */}
            <div className="form-grid-3">
              <div className="form-group">
                <label className="form-label">Length (cm)</label>
                <input id="calc-length" className="form-input" type="number" min="0.1" step="0.1" placeholder="30" value={form.length_cm} onChange={set('length_cm')} />
              </div>
              <div className="form-group">
                <label className="form-label">Breadth (cm)</label>
                <input id="calc-breadth" className="form-input" type="number" min="0.1" step="0.1" placeholder="20" value={form.breadth_cm} onChange={set('breadth_cm')} />
              </div>
              <div className="form-group">
                <label className="form-label">Height (cm)</label>
                <input id="calc-height" className="form-input" type="number" min="0.1" step="0.1" placeholder="10" value={form.height_cm} onChange={set('height_cm')} />
              </div>
            </div>

            {/* Weight */}
            <div className="form-group">
              <label className="form-label">Actual Weight (kg)</label>
              <input
                id="calc-weight"
                className="form-input"
                type="number"
                min="0.001"
                step="0.001"
                placeholder="0.500"
                value={form.actual_weight_kg}
                onChange={set('actual_weight_kg')}
                style={{ maxWidth: 180 }}
              />
            </div>

            {/* Type toggles — matching NewOrder's select pattern */}
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Order Type</label>
                <select id="calc-order-type" className="form-select" value={form.order_type} onChange={set('order_type')}>
                  <option value="B2C">B2C — Consumer</option>
                  <option value="B2B">B2B — Business</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Payment Type</label>
                <select id="calc-payment-type" className="form-select" value={form.payment_type} onChange={set('payment_type')}>
                  <option value="PREPAID">Prepaid</option>
                  <option value="COD">Cash on Delivery (COD)</option>
                </select>
              </div>
            </div>
          </div>

          {/* ── Result area ── */}
          <div style={{ marginTop: 20 }}>

            {/* Calculating spinner */}
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--steel)', fontSize: 13 }}>
                <div className="spinner" style={{ width: 16, height: 16, flexShrink: 0 }} />
                Calculating…
              </div>
            )}

            {/* Error — backend copy passed through verbatim */}
            {error && !loading && (
              <div className="auth-error">{error}</div>
            )}

            {/* Charge breakdown — reuses charge-box / charge-row CSS from index.css
                (same pattern as NewOrder.jsx authenticated form) */}
            {charge && !loading && (
              <div className="charge-box">
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--steel)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Charge Breakdown
                </div>

                <div className="charge-row">
                  <span>Pickup Zone</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    {charge.pickup_zone?.name} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>({charge.pickup_zone?.code})</span>
                  </span>
                </div>
                <div className="charge-row">
                  <span>Drop Zone</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 500 }}>
                    {charge.drop_zone?.name} <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11 }}>({charge.drop_zone?.code})</span>
                  </span>
                </div>
                <div className="charge-row">
                  <span>Volumetric Weight</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatWeight(charge.volumetric_weight_kg)}</span>
                </div>
                <div className="charge-row">
                  <span>Chargeable Weight</span>
                  <span style={{ color: 'var(--ink)', fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>
                    {formatWeight(charge.chargeable_weight_kg)}
                  </span>
                </div>
                <div className="charge-row">
                  <span>Base Charge</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(charge.base_charge)}</span>
                </div>
                {charge.cod_surcharge > 0 && (
                  <div className="charge-row">
                    <span>COD Surcharge</span>
                    <span style={{ fontFamily: "'IBM Plex Mono', monospace" }}>{formatCurrency(charge.cod_surcharge)}</span>
                  </div>
                )}
                <div className="charge-row total">
                  <span>Total Charge</span>
                  <span className="charge-amount">{formatCurrency(charge.total_charge)}</span>
                </div>
              </div>
            )}
          </div>

          {/* ── Exit links ── */}
          <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div className="auth-footer">
              Sign in to place this order —{' '}
              <Link to="/login" onClick={handleSaveDraft}>Sign in</Link>
            </div>
            <div className="auth-footer">
              Already have an order?{' '}
              <Link to="/track">Track it</Link>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
