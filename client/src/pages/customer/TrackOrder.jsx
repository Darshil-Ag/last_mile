import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../services/api';
import { StatusBadge } from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import OrderTimeline from '../../components/ui/OrderTimeline';
import { formatCurrency, formatDateTime, formatDate, formatWeight, statusIcon } from '../../utils/formatters';

export default function TrackOrder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [schedDate, setSchedDate] = useState('');
  const [reschedLoading, setReschedLoading] = useState(false);
  const [reschedError, setReschedError] = useState('');

  const load = () => {
    ordersAPI.get(id)
      .then((r) => setOrder(r.data))
      .catch(() => navigate('/dashboard'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleReschedule = async (e) => {
    e.preventDefault();
    setReschedError(''); setReschedLoading(true);
    try {
      await ordersAPI.reschedule(id, { scheduled_date: schedDate });
      setRescheduleOpen(false);
      setLoading(true);
      load();
    } catch (err) {
      setReschedError(err.response?.data?.error || 'Reschedule failed');
    } finally { setReschedLoading(false); }
  };

  if (loading) return <Spinner size="lg" text="Loading order…" />;
  if (!order) return null;

  const events = order.tracking_events ?? [];
  const latestAttempt = (order.delivery_attempts ?? []).slice(-1)[0];

  return (
    <div style={{ maxWidth: 760 }}>
      <div className="page-header">
        <div>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/dashboard')} style={{ marginBottom: 8 }}>← Back</button>
          <h1 className="page-title" style={{ fontFamily: 'monospace', fontSize: 20 }}>{order.order_number}</h1>
          <div style={{ marginTop: 8 }}><StatusBadge status={order.current_status} /></div>
        </div>
        {order.current_status === 'FAILED' && (
          <button id="reschedule-btn" className="btn btn-primary" onClick={() => setRescheduleOpen(true)}>
            🔄 Reschedule
          </button>
        )}
      </div>

      {/* Summary cards */}
      <div className="form-grid-2 mb-20">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>📍 Pickup</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{order.pickup_address}</div>
            <div>Pincode: <strong>{order.pickup_pincode}</strong></div>
            <div>Zone: <strong>{order.pickup_zone?.name}</strong></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>🏠 Drop</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{order.drop_address}</div>
            <div>Pincode: <strong>{order.drop_pincode}</strong></div>
            <div>Zone: <strong>{order.drop_zone?.name}</strong></div>
          </div>
        </div>
      </div>

      <div className="form-grid-2 mb-20">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>📦 Package</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div>Dimensions: <strong>{order.length_cm} × {order.breadth_cm} × {order.height_cm} cm</strong></div>
            <div>Actual Weight: <strong>{formatWeight(order.actual_weight_kg)}</strong></div>
            <div>Volumetric: <strong>{formatWeight(order.volumetric_weight_kg)}</strong></div>
            <div>Chargeable: <strong style={{ color: 'var(--text-primary)' }}>{formatWeight(order.chargeable_weight_kg)}</strong></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 14 }}>💰 Charges</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div>Type: <strong>{order.order_type}</strong> · <strong>{order.payment_type}</strong></div>
            <div>Base: <strong>{formatCurrency(order.base_charge)}</strong></div>
            {Number(order.cod_surcharge) > 0 && <div>COD Surcharge: <strong>{formatCurrency(order.cod_surcharge)}</strong></div>}
            <div style={{ marginTop: 6, paddingTop: 6, borderTop: '1px solid var(--border)' }}>
              Total: <strong style={{ color: 'var(--primary-light)', fontSize: 16 }}>{formatCurrency(order.total_charge)}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Current agent */}
      {latestAttempt && (
        <div className="card mb-20">
          <div className="card-title" style={{ marginBottom: 14 }}>👤 Assigned Agent</div>
          <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
            <div>Attempt #{latestAttempt.attempt_number} · <strong>{latestAttempt.status}</strong></div>
            <div>Scheduled: <strong>{formatDate(latestAttempt.scheduled_date)}</strong></div>
            {latestAttempt.failure_reason && <div style={{ color: 'var(--danger)' }}>Reason: {latestAttempt.failure_reason}</div>}
          </div>
        </div>
      )}

      {/* Tracking timeline — reuses shared OrderTimeline component */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 20 }}>🕒 Tracking Timeline</div>
        <OrderTimeline events={order.tracking_events ?? []} />
      </div>

      {/* Reschedule Modal */}
      <Modal
        open={rescheduleOpen}
        onClose={() => setRescheduleOpen(false)}
        title="Reschedule Delivery"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setRescheduleOpen(false)}>Cancel</button>
            <button id="confirm-reschedule" className="btn btn-primary" onClick={handleReschedule} disabled={!schedDate || reschedLoading}>
              {reschedLoading ? 'Rescheduling…' : 'Confirm Reschedule'}
            </button>
          </>
        }
      >
        {reschedError && <div className="auth-error mb-16">{reschedError}</div>}
        <p style={{ fontSize: 13.5, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Choose a new delivery date. A new agent will be automatically assigned.
        </p>
        <div className="form-group">
          <label className="form-label">New Delivery Date</label>
          <input
            id="reschedule-date"
            className="form-input"
            type="date"
            value={schedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setSchedDate(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
