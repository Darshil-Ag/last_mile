import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentsAPI } from '../../services/api';
import { StatusBadge, AvailabilityBadge } from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { formatDate } from '../../utils/formatters';

export default function AgentDashboard() {
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(false);

  const loadData = async () => {
    try {
      const [agentRes, ordersRes] = await Promise.all([agentsAPI.me(), agentsAPI.myOrders()]);
      setAgent(agentRes.data);
      setOrders(ordersRes.data);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const toggleAvailability = async () => {
    if (!agent || agent.availability_status === 'BUSY') return;
    const next = agent.availability_status === 'AVAILABLE' ? 'OFFLINE' : 'AVAILABLE';
    setToggling(true);
    try {
      await agentsAPI.updateAvailability({ availability_status: next });
      setAgent((a) => ({ ...a, availability_status: next }));
    } catch (err) {
      console.error(err);
    } finally { setToggling(false); }
  };

  if (loading) return <Spinner size="lg" text="Loading deliveries…" />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">My Deliveries</h1>
          <p className="page-description">Manage your active delivery assignments</p>
        </div>
        <button
          id="toggle-availability"
          className={`btn ${agent?.availability_status === 'AVAILABLE' ? 'btn-secondary' : 'btn-primary'}`}
          onClick={toggleAvailability}
          disabled={toggling || agent?.availability_status === 'BUSY'}
        >
          {toggling
            ? 'Updating…'
            : agent?.availability_status === 'BUSY'
            ? '🚚 Currently Busy on Delivery'
            : agent?.availability_status === 'AVAILABLE'
            ? '🔴 Go Offline'
            : '🟢 Go Available'}
        </button>
      </div>

      {/* Agent status card */}
      {agent && (
        <div className="stats-grid mb-20">
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--purple-bg)', color: 'var(--purple)' }}>👤</div>
            <div className="stat-body">
              <div className="stat-value" style={{ fontSize: 16 }}>{agent.user?.full_name}</div>
              <div className="stat-label">{agent.user?.email}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>🗺️</div>
            <div className="stat-body">
              <div className="stat-value" style={{ fontSize: 16 }}>{agent.current_zone?.name ?? '—'}</div>
              <div className="stat-label">Current Zone</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>📦</div>
            <div className="stat-body">
              <div className="stat-value">{orders.length}</div>
              <div className="stat-label">Active Assignments</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon" style={{ background: agent?.availability_status === 'AVAILABLE' ? 'var(--success-bg)' : 'var(--warning-bg)', color: agent?.availability_status === 'AVAILABLE' ? 'var(--success)' : 'var(--warning)' }}>⚡</div>
            <div className="stat-body">
              <div className="stat-value" style={{ fontSize: 14 }}>
                <AvailabilityBadge status={agent.availability_status} />
              </div>
              <div className="stat-label">Availability</div>
            </div>
          </div>
        </div>
      )}

      {/* Orders */}
      <div className="card-header mb-16" style={{ marginBottom: 12 }}>
        <h2 className="card-title">📋 Assigned Orders</h2>
      </div>

      {orders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🎉</div>
            <div className="empty-state-title">No active deliveries</div>
            <div className="empty-state-desc">Mark yourself as Available to receive assignments</div>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Route</th>
                <th>Scheduled</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const attempt = (o.delivery_attempts ?? []).slice(-1)[0];
                return (
                  <tr key={o.id}>
                    <td className="text-mono">{o.order_number}</td>
                    <td>
                      <div className="text-primary">{o.customer?.full_name}</div>
                      <div className="text-sm text-muted">{o.customer?.phone}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: 12.5 }}>
                        <div style={{ color: 'var(--text-secondary)' }}>From: {o.pickup_address?.slice(0, 30)}…</div>
                        <div style={{ color: 'var(--text-secondary)' }}>To: {o.drop_address?.slice(0, 30)}…</div>
                      </div>
                    </td>
                    <td>{attempt ? formatDate(attempt.scheduled_date) : '—'}</td>
                    <td><StatusBadge status={o.current_status} /></td>
                    <td>
                      <button
                        id={`update-${o.id}`}
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/agent/orders/${o.id}`)}
                      >
                        Update Status →
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
