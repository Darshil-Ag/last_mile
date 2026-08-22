import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ordersAPI } from '../../services/api';
import { StatusBadge } from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { formatCurrency, formatDateTime } from '../../utils/formatters';

export default function CustomerDashboard() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    ordersAPI.mine()
      .then((r) => setOrders(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const counts = {
    active: orders.filter((o) => !['DELIVERED', 'FAILED'].includes(o.current_status)).length,
    delivered: orders.filter((o) => o.current_status === 'DELIVERED').length,
    failed: orders.filter((o) => o.current_status === 'FAILED').length,
  };

  if (loading) return <Spinner size="lg" text="Loading your orders…" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Orders</h1>
          <p className="page-description">Track and manage all your deliveries</p>
        </div>
        <button id="new-order-btn" className="btn btn-primary" onClick={() => navigate('/orders/new')}>
          ➕ New Order
        </button>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>📦</div>
          <div className="stat-body">
            <div className="stat-value">{orders.length}</div>
            <div className="stat-label">Total Orders</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>🚚</div>
          <div className="stat-body">
            <div className="stat-value">{counts.active}</div>
            <div className="stat-label">Active</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>✅</div>
          <div className="stat-body">
            <div className="stat-value">{counts.delivered}</div>
            <div className="stat-label">Delivered</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--danger-bg)', color: 'var(--danger)' }}>❌</div>
          <div className="stat-body">
            <div className="stat-value">{counts.failed}</div>
            <div className="stat-label">Failed</div>
          </div>
        </div>
      </div>

      {/* Orders table */}
      {orders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📭</div>
            <div className="empty-state-title">No orders yet</div>
            <div className="empty-state-desc">Place your first order to get started</div>
            <button className="btn btn-primary mt-16" onClick={() => navigate('/orders/new')}>Place Order</button>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Type</th>
                <th>Route</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="text-mono">{o.order_number}</td>
                  <td><span className="badge badge-info">{o.order_type}</span></td>
                  <td>
                    <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
                      <span>{o.pickup_zone?.code}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>→</span>
                      <span>{o.drop_zone?.code}</span>
                    </div>
                  </td>
                  <td className="text-primary">{formatCurrency(o.total_charge)}</td>
                  <td><StatusBadge status={o.current_status} /></td>
                  <td>{formatDateTime(o.created_at)}</td>
                  <td>
                    <button id={`track-${o.id}`} className="btn btn-ghost btn-sm" onClick={() => navigate(`/orders/${o.id}`)}>
                      Track →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
