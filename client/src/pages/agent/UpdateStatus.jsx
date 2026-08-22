import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../services/api';
import { StatusBadge } from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { formatCurrency, formatDateTime, formatDate, formatWeight, statusIcon } from '../../utils/formatters';

const NEXT_STATUSES = {
  ASSIGNED:         ['PICKED_UP', 'FAILED'],
  PICKED_UP:        ['IN_TRANSIT', 'FAILED'],
  IN_TRANSIT:       ['OUT_FOR_DELIVERY', 'FAILED'],
  OUT_FOR_DELIVERY: ['DELIVERED', 'FAILED'],
};

const STATUS_LABELS = {
  PICKED_UP:        '📦 Mark Picked Up',
  IN_TRANSIT:       '🚚 Mark In Transit',
  OUT_FOR_DELIVERY: '🏠 Out for Delivery',
  DELIVERED:        '✅ Mark Delivered',
  FAILED:           '❌ Mark as Failed',
};

export default function UpdateStatus() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [failureReason, setFailureReason] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const load = () => {
    ordersAPI.get(id)
      .then((r) => { setOrder(r.data); setSelectedStatus(''); })
      .catch(() => navigate('/agent'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [id]);

  const handleUpdate = async () => {
    if (!selectedStatus) return;
    setError(''); setSuccess(''); setUpdating(true);
    try {
      await ordersAPI.updateStatus(id, {
        status: selectedStatus,
        remarks: remarks || undefined,
        failure_reason: selectedStatus === 'FAILED' ? failureReason : undefined,
      });
      setSuccess(`Order marked as ${selectedStatus.replace(/_/g, ' ')}`);
      setLoading(true);
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update status');
    } finally { setUpdating(false); }
  };

  if (loading) return <Spinner size="lg" text="Loading order…" />;
  if (!order) return null;

  const nextStatuses = NEXT_STATUSES[order.current_status] ?? [];
  const events = order.tracking_events ?? [];
  const latestAttempt = (order.delivery_attempts ?? []).slice(-1)[0];
  const isTerminal = ['DELIVERED', 'FAILED', 'RESCHEDULED'].includes(order.current_status);

  return (
    <div style={{ maxWidth: 720 }}>
      <button className="btn btn-ghost btn-sm" onClick={() => navigate('/agent')} style={{ marginBottom: 16 }}>← Back to Dashboard</button>

      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ fontFamily: 'monospace' }}>{order.order_number}</h1>
          <div style={{ marginTop: 8, display: 'flex', gap: 10, alignItems: 'center' }}>
            <StatusBadge status={order.current_status} />
            {latestAttempt && (
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Attempt #{latestAttempt.attempt_number} · Scheduled {formatDate(latestAttempt.scheduled_date)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Delivery info */}
      <div className="form-grid-2 mb-20">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 10 }}>📍 Pickup</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div style={{ color: 'var(--text-primary)' }}>{order.pickup_address}</div>
            <div>Pincode: <strong>{order.pickup_pincode}</strong></div>
          </div>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 10 }}>🏠 Drop</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            <div style={{ color: 'var(--text-primary)' }}>{order.drop_address}</div>
            <div>Pincode: <strong>{order.drop_pincode}</strong></div>
            <div>Customer: <strong>{order.customer?.full_name}</strong> · {order.customer?.phone}</div>
          </div>
        </div>
      </div>

      {/* Update action */}
      {!isTerminal && nextStatuses.length > 0 ? (
        <div className="card mb-20">
          <div className="card-title" style={{ marginBottom: 16 }}>⚡ Update Status</div>

          {error && <div className="auth-error mb-16">{error}</div>}
          {success && (
            <div style={{ background: 'var(--success-bg)', border: '1px solid rgba(16,185,129,0.25)', color: 'var(--success)', borderRadius: 'var(--radius-md)', padding: '10px 14px', fontSize: 13, marginBottom: 16 }}>
              ✓ {success}
            </div>
          )}

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {nextStatuses.map((s) => (
              <button
                id={`status-${s}`}
                key={s}
                className={`btn ${selectedStatus === s ? (s === 'FAILED' ? 'btn-danger' : 'btn-primary') : 'btn-secondary'}`}
                onClick={() => setSelectedStatus(s)}
              >
                {STATUS_LABELS[s] ?? s}
              </button>
            ))}
          </div>

          {selectedStatus === 'FAILED' && (
            <div className="form-group mb-16">
              <label className="form-label">Failure Reason *</label>
              <input
                id="failure-reason"
                className="form-input"
                placeholder="e.g. Customer not available, address not found"
                value={failureReason}
                onChange={(e) => setFailureReason(e.target.value)}
              />
            </div>
          )}

          <div className="form-group mb-20">
            <label className="form-label">Remarks (optional)</label>
            <input
              id="remarks"
              className="form-input"
              placeholder="Any notes about this status update"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <button
            id="confirm-status"
            className={`btn btn-lg ${selectedStatus === 'FAILED' ? 'btn-danger' : 'btn-primary'}`}
            onClick={handleUpdate}
            disabled={!selectedStatus || updating || (selectedStatus === 'FAILED' && !failureReason)}
          >
            {updating ? 'Updating…' : selectedStatus ? `Confirm — ${selectedStatus.replace(/_/g, ' ')}` : 'Select a status above'}
          </button>
        </div>
      ) : (
        <div className="card mb-20" style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>{order.current_status === 'DELIVERED' ? '✅' : '📋'}</div>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
            {isTerminal ? 'This order is in a terminal state — no further updates needed.' : 'No next status available.'}
          </div>
        </div>
      )}

      {/* Tracking history */}
      <div className="card">
        <div className="card-title" style={{ marginBottom: 20 }}>🕒 History</div>
        <div className="timeline">
          {events.map((ev, i) => {
            const isLast = i === events.length - 1;
            const dotClass = ev.status === 'DELIVERED' ? 'done' : ev.status === 'FAILED' ? 'failed' : isLast ? 'active' : '';
            return (
              <div key={ev.id} className="timeline-item">
                <div className="timeline-left">
                  <div className={`timeline-dot ${dotClass}`}>{statusIcon(ev.status)}</div>
                  {!isLast && <div className="timeline-line" />}
                </div>
                <div className="timeline-content">
                  <div className="timeline-status">{ev.status.replace(/_/g, ' ')}</div>
                  <div className="timeline-meta">
                    <span>{formatDateTime(ev.created_at)}</span>
                  </div>
                  {ev.remarks && <div className="timeline-remarks">{ev.remarks}</div>}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
