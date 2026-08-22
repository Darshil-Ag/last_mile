import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI, zonesAPI } from '../../services/api';
import { formatCurrency, formatWeight } from '../../utils/formatters';

const INITIAL = {
  pickup_address: '', pickup_pincode: '',
  drop_address: '', drop_pincode: '',
  length_cm: '', breadth_cm: '', height_cm: '',
  actual_weight_kg: '',
  order_type: 'B2C',
  payment_type: 'PREPAID',
};

export default function NewOrder() {
  const navigate = useNavigate();
  const [form, setForm] = useState(INITIAL);
  const [charge, setCharge] = useState(null);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef(null);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  // Load prefilled values if saved from the Public Calculator
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('pending_order_draft');
      if (saved) {
        const draft = JSON.parse(saved);
        setForm((f) => ({
          ...f,
          ...draft,
        }));
        sessionStorage.removeItem('pending_order_draft');
      }
    } catch (e) {}
  }, []);

  // Auto-calculate charge whenever key fields change
  useEffect(() => {
    const { pickup_pincode, drop_pincode, length_cm, breadth_cm, height_cm, actual_weight_kg, order_type, payment_type } = form;
    if (!pickup_pincode || !drop_pincode || !length_cm || !breadth_cm || !height_cm || !actual_weight_kg) {
      setCharge(null); return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setCalcLoading(true); setCalcError('');
      try {
        const res = await ordersAPI.calculate({ pickup_pincode, drop_pincode, length_cm: +length_cm, breadth_cm: +breadth_cm, height_cm: +height_cm, actual_weight_kg: +actual_weight_kg, order_type, payment_type });
        setCharge(res.data);
      } catch (err) {
        setCalcError(err.response?.data?.error || 'Could not calculate charge');
        setCharge(null);
      } finally { setCalcLoading(false); }
    }, 600);
    return () => clearTimeout(debounceRef.current);
  }, [form.pickup_pincode, form.drop_pincode, form.length_cm, form.breadth_cm, form.height_cm, form.actual_weight_kg, form.order_type, form.payment_type]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!charge) return setError('Please fill all fields to calculate charge first');
    setError(''); setSubmitLoading(true);
    try {
      const res = await ordersAPI.create({
        ...form,
        length_cm: +form.length_cm, breadth_cm: +form.breadth_cm, height_cm: +form.height_cm,
        actual_weight_kg: +form.actual_weight_kg,
      });
      navigate(`/orders/${res.data.id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to place order');
    } finally { setSubmitLoading(false); }
  };

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <h1 className="page-title">Place New Order</h1>
          <p className="page-description">Fill in the details — charge is calculated automatically</p>
        </div>
      </div>

      {error && <div className="auth-error mb-20">{error}</div>}

      <form onSubmit={handleSubmit}>
        {/* Pickup */}
        <div className="card mb-16">
          <div className="card-header">
            <div className="card-title">📍 Pickup Details</div>
          </div>
          <div className="form-group mb-16">
            <label className="form-label">Pickup Address</label>
            <input id="pickup-address" className="form-input" placeholder="Full street address" value={form.pickup_address} onChange={set('pickup_address')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Pickup Pincode</label>
            <input id="pickup-pincode" className="form-input" placeholder="e.g. 400001" maxLength={10} value={form.pickup_pincode} onChange={set('pickup_pincode')} required />
          </div>
        </div>

        {/* Drop */}
        <div className="card mb-16">
          <div className="card-header">
            <div className="card-title">🏠 Delivery Details</div>
          </div>
          <div className="form-group mb-16">
            <label className="form-label">Drop Address</label>
            <input id="drop-address" className="form-input" placeholder="Full street address" value={form.drop_address} onChange={set('drop_address')} required />
          </div>
          <div className="form-group">
            <label className="form-label">Drop Pincode</label>
            <input id="drop-pincode" className="form-input" placeholder="e.g. 400703" maxLength={10} value={form.drop_pincode} onChange={set('drop_pincode')} required />
          </div>
        </div>

        {/* Package */}
        <div className="card mb-16">
          <div className="card-header">
            <div className="card-title">📦 Package Details</div>
          </div>
          <div className="form-grid-3 mb-16">
            <div className="form-group">
              <label className="form-label">Length (cm)</label>
              <input id="length" className="form-input" type="number" min="0.1" step="0.1" placeholder="30" value={form.length_cm} onChange={set('length_cm')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Breadth (cm)</label>
              <input id="breadth" className="form-input" type="number" min="0.1" step="0.1" placeholder="20" value={form.breadth_cm} onChange={set('breadth_cm')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Height (cm)</label>
              <input id="height" className="form-input" type="number" min="0.1" step="0.1" placeholder="10" value={form.height_cm} onChange={set('height_cm')} required />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Actual Weight (kg)</label>
            <input id="weight" className="form-input" type="number" min="0.001" step="0.001" placeholder="0.500" value={form.actual_weight_kg} onChange={set('actual_weight_kg')} required style={{ maxWidth: 200 }} />
          </div>
        </div>

        {/* Order type */}
        <div className="card mb-16">
          <div className="card-header">
            <div className="card-title">🏷️ Order Settings</div>
          </div>
          <div className="form-grid-2">
            <div className="form-group">
              <label className="form-label">Order Type</label>
              <select id="order-type" className="form-select" value={form.order_type} onChange={set('order_type')}>
                <option value="B2C">B2C — Consumer</option>
                <option value="B2B">B2B — Business</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Payment Type</label>
              <select id="payment-type" className="form-select" value={form.payment_type} onChange={set('payment_type')}>
                <option value="PREPAID">Prepaid</option>
                <option value="COD">Cash on Delivery (COD)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Charge Preview */}
        {calcLoading && (
          <div className="card mb-16" style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '20px' }}>
            <div className="spinner" style={{ margin: '0 auto 8px' }} />
            Calculating charge…
          </div>
        )}
        {calcError && <div className="auth-error mb-16">{calcError}</div>}
        {charge && !calcLoading && (
          <div className="charge-box mb-20">
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 12 }}>
              💰 Charge Breakdown
            </div>
            <div className="charge-row">
              <span>Pickup Zone</span>
              <span style={{ color: 'var(--text-primary)' }}>{charge.pickup_zone?.name} ({charge.pickup_zone?.code})</span>
            </div>
            <div className="charge-row">
              <span>Drop Zone</span>
              <span style={{ color: 'var(--text-primary)' }}>{charge.drop_zone?.name} ({charge.drop_zone?.code})</span>
            </div>
            <div className="charge-row">
              <span>Volumetric Weight</span>
              <span>{formatWeight(charge.volumetric_weight_kg)}</span>
            </div>
            <div className="charge-row">
              <span>Chargeable Weight</span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{formatWeight(charge.chargeable_weight_kg)}</span>
            </div>
            <div className="charge-row">
              <span>Base Charge</span>
              <span>{formatCurrency(charge.base_charge)}</span>
            </div>
            {charge.cod_surcharge > 0 && (
              <div className="charge-row">
                <span>COD Surcharge</span>
                <span>{formatCurrency(charge.cod_surcharge)}</span>
              </div>
            )}
            <div className="charge-row total">
              <span>Total Charge</span>
              <span className="charge-amount">{formatCurrency(charge.total_charge)}</span>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/dashboard')}>Cancel</button>
          <button id="place-order-btn" type="submit" className="btn btn-primary btn-lg" disabled={!charge || submitLoading}>
            {submitLoading ? <><div className="spinner" style={{ width: 16, height: 16 }} /> Placing Order…</> : `Confirm Order — ${charge ? formatCurrency(charge.total_charge) : '…'}`}
          </button>
        </div>
      </form>
    </div>
  );
}
