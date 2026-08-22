import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ordersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { StatusBadge } from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import OrderTimeline from '../../components/ui/OrderTimeline';
import { formatCurrency, formatWeight } from '../../utils/formatters';

export default function CustomerTrack() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';

  const [query, setQuery] = useState(initialQuery);
  const [myOrders, setMyOrders] = useState([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [schedDate, setSchedDate] = useState('');
  const [reschedLoading, setReschedLoading] = useState(false);
  const [reschedError, setReschedError] = useState('');

  // Load customer's recent orders for quick-click tracking
  useEffect(() => {
    ordersAPI.list()
      .then((r) => setMyOrders(r.data || []))
      .catch(() => {})
      .finally(() => setRecentLoading(false));
  }, []);

  // Fetch tracking details for a specific order ID or order number
  const fetchTrack = async (searchVal) => {
    if (!searchVal.trim()) return;
    setLoading(true);
    setError('');
    setOrder(null);
    try {
      // First try fetching directly by ID/number via ordersAPI.get
      const res = await ordersAPI.get(searchVal.trim());
      setOrder(res.data);
    } catch (err) {
      // If direct ID lookup fails, search inside user's myOrders list by order_number
      const match = myOrders.find(
        (o) => o.order_number.toLowerCase() === searchVal.trim().toLowerCase() || o.id === searchVal.trim()
      );
      if (match) {
        try {
          const res2 = await ordersAPI.get(match.id);
          setOrder(res2.data);
        } catch (e2) {
          setError('Order not found. Please verify the order number.');
        }
      } else {
        setError(err.response?.data?.error || 'Order not found. Please verify the order number.');
      }
    } finally {
      setLoading(false);
    }
  };

  // If initial query exists in URL or when initial query changes
  useEffect(() => {
    if (initialQuery) {
      fetchTrack(initialQuery);
    }
  }, [initialQuery]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSearchParams({ q: query.trim() });
    fetchTrack(query.trim());
  };

  const handleQuickSelect = (ord) => {
    setQuery(ord.order_number);
    setSearchParams({ q: ord.order_number });
    fetchTrack(ord.id);
  };

  const handleReschedule = async (e) => {
    e.preventDefault();
    if (!order) return;
    setReschedError('');
    setReschedLoading(true);
    try {
      await ordersAPI.reschedule(order.id, { scheduled_date: schedDate });
      setRescheduleOpen(false);
      // Reload order details
      const res = await ordersAPI.get(order.id);
      setOrder(res.data);
    } catch (err) {
      setReschedError(err.response?.data?.error || 'Reschedule failed');
    } finally {
      setReschedLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 800 }}>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Track Order</h1>
          <p className="page-description">Search by Order Number to view real-time tracking events and status</p>
        </div>
      </div>

      {/* Search Input Box */}
      <div className="card mb-20">
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ flex: 1 }}>
            <input
              id="customer-track-input"
              className="form-input font-mono"
              type="text"
              placeholder="Enter Order Number (e.g. ORD-20260822-ABCD)"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading || !query.trim()}>
            {loading ? 'Searching…' : 'Track Order'}
          </button>
        </form>

        {/* Quick select buttons for customer's recent orders */}
        {!recentLoading && myOrders.length > 0 && (
          <div style={{ marginTop: 14, pt: 12, borderTop: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>
              YOUR RECENT ORDERS
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {myOrders.slice(0, 5).map((o) => (
                <button
                  key={o.id}
                  type="button"
                  className={`btn btn-sm ${order?.id === o.id ? 'btn-primary' : 'btn-ghost'}`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 12 }}
                  onClick={() => handleQuickSelect(o)}
                >
                  {o.order_number}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Loading state */}
      {loading && <Spinner size="lg" text="Fetching shipment details…" />}

      {/* Error state */}
      {error && !loading && (
        <div className="auth-error mb-20">{error}</div>
      )}

      {/* Order Details View */}
      {order && !loading && (
        <div>
          {/* Header info */}
          <div className="page-header mb-16">
            <div>
              <h2 style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 20, fontWeight: 700 }}>
                {order.order_number}
              </h2>
              <div style={{ marginTop: 6 }}>
                <StatusBadge status={order.current_status} />
              </div>
            </div>
            {order.current_status === 'FAILED' && (
              <button className="btn btn-primary" onClick={() => setRescheduleOpen(true)}>
                🔄 Reschedule Delivery
              </button>
            )}
          </div>

          {/* Confirmation Email Sent Banner */}
          <div style={{
            backgroundColor: 'var(--signal-lt)',
            border: '1px solid var(--signal)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontSize: 13.5,
            color: 'var(--ink)'
          }}>
            <span style={{ fontSize: 16 }}>📧</span>
            <span>
              Confirmation mail has been sent to : <strong style={{ color: 'var(--signal)', fontFamily: "'IBM Plex Mono', monospace" }}>{user?.email || order.customer?.email || 'registered email id'}</strong>
            </span>
          </div>

          {/* Pickup & Drop Cards */}
          <div className="form-grid-2 mb-20">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>📍 Pickup Address</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{order.pickup_address}</div>
                <div>Pincode: <strong>{order.pickup_pincode}</strong></div>
                <div>Zone: <strong>{order.pickup_zone?.name} ({order.pickup_zone?.code})</strong></div>
              </div>
            </div>
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>🏠 Drop Address</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                <div style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{order.drop_address}</div>
                <div>Pincode: <strong>{order.drop_pincode}</strong></div>
                <div>Zone: <strong>{order.drop_zone?.name} ({order.drop_zone?.code})</strong></div>
              </div>
            </div>
          </div>

          {/* Package & Payment Summary Cards */}
          <div className="form-grid-2 mb-20">
            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>📦 Package Specifications</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div>Dimensions: <strong>{order.length_cm} × {order.breadth_cm} × {order.height_cm} cm</strong></div>
                <div>Actual Weight: <strong>{formatWeight(order.actual_weight_kg)}</strong></div>
                <div>Volumetric Weight: <strong>{formatWeight(order.volumetric_weight_kg)}</strong></div>
                <div>Chargeable Weight: <strong style={{ color: 'var(--text-primary)' }}>{formatWeight(order.chargeable_weight_kg)}</strong></div>
              </div>
            </div>

            <div className="card">
              <div className="card-title" style={{ marginBottom: 12 }}>💳 Billing & Payment</div>
              <div style={{ fontSize: 13.5, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div>Order Type: <strong>{order.order_type}</strong></div>
                <div>Payment Type: <strong>{order.payment_type}</strong></div>
                <div>Base Charge: <strong>{formatCurrency(order.base_charge)}</strong></div>
                {order.cod_surcharge > 0 && (
                  <div>COD Surcharge: <strong>{formatCurrency(order.cod_surcharge)}</strong></div>
                )}
                <div>Total Charge: <strong style={{ color: 'var(--signal)', fontSize: 15 }}>{formatCurrency(order.total_charge)}</strong></div>
              </div>
            </div>
          </div>

          {/* Tracking History Timeline */}
          <div className="card mb-20">
            <div className="card-title" style={{ marginBottom: 16 }}>⏱️ Shipment History</div>
            <OrderTimeline events={order.tracking_events ?? []} />
          </div>

          {/* Delivery Attempts (if any) */}
          {(order.delivery_attempts ?? []).length > 0 && (
            <div className="card mb-20">
              <div className="card-title" style={{ marginBottom: 12 }}>🚨 Delivery Attempts</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {order.delivery_attempts.map((att, idx) => (
                  <div key={idx} style={{ padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'var(--surface-color)', border: '1px solid var(--border-color)', fontSize: 13 }}>
                    <div style={{ fontWeight: 600, color: 'var(--danger-color)' }}>
                      Attempt #{att.attempt_number} — Failed
                    </div>
                    <div style={{ color: 'var(--text-secondary)', marginTop: 2 }}>
                      Reason: {att.failure_reason}
                    </div>
                    {att.scheduled_date && (
                      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                        Rescheduled for: {att.scheduled_date}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reschedule Modal */}
          {rescheduleOpen && (
            <Modal title="Reschedule Delivery" onClose={() => setRescheduleOpen(false)}>
              <form onSubmit={handleReschedule} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {reschedError && <div className="auth-error">{reschedError}</div>}
                <div className="form-group">
                  <label className="form-label">Next Delivery Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={schedDate}
                    min={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setSchedDate(e.target.value)}
                    required
                  />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setRescheduleOpen(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={reschedLoading}>
                    {reschedLoading ? 'Saving…' : 'Confirm Reschedule'}
                  </button>
                </div>
              </form>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}
