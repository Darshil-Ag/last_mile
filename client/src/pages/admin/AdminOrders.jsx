import React, { useEffect, useState } from 'react';
import { ordersAPI, zonesAPI, agentsAPI } from '../../services/api';
import { StatusBadge } from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import { formatCurrency, formatDateTime, formatDate } from '../../utils/formatters';

export default function AdminOrders() {
  const [orders, setOrders] = useState([]);
  const [zones, setZones] = useState([]);
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [zoneFilter, setZoneFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');

  // Assign Modal state
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [assignType, setAssignType] = useState('AUTO');
  const [manualAgentId, setManualAgentId] = useState('');
  const [schedDate, setSchedDate] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignError, setAssignError] = useState('');

  // Override Status Modal state
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideRemarks, setOverrideRemarks] = useState('');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [overrideError, setOverrideError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [oRes, zRes, aRes] = await Promise.all([
        ordersAPI.listAll({
          status: statusFilter || undefined,
          pickup_zone_id: zoneFilter || undefined,
          agent_id: agentFilter || undefined,
        }),
        zonesAPI.list(),
        agentsAPI.list(),
      ]);
      setOrders(oRes.data.data || []);
      setTotal(oRes.data.total || 0);
      setZones(zRes.data || []);
      setAgents(aRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, zoneFilter, agentFilter]);

  const openAssign = (order) => {
    setSelectedOrder(order);
    setAssignType('AUTO');
    setManualAgentId('');
    setSchedDate(new Date().toISOString().split('T')[0]);
    setAssignError('');
    setAssignModalOpen(true);
  };

  const handleAssignSubmit = async (e) => {
    e.preventDefault();
    setAssignError('');
    setAssignLoading(true);
    try {
      await ordersAPI.assign(selectedOrder.id, {
        type: assignType,
        agent_id: assignType === 'MANUAL' ? manualAgentId : undefined,
        scheduled_date: schedDate,
      });
      setAssignModalOpen(false);
      loadData();
    } catch (err) {
      setAssignError(err.response?.data?.error || 'Assignment failed');
    } finally {
      setAssignLoading(false);
    }
  };

  const openOverrideStatus = (order) => {
    setSelectedOrder(order);
    setOverrideStatus(order.current_status);
    setOverrideRemarks('');
    setOverrideError('');
    setStatusModalOpen(true);
  };

  const handleOverrideSubmit = async (e) => {
    e.preventDefault();
    setOverrideError('');
    setOverrideLoading(true);
    try {
      await ordersAPI.updateStatus(selectedOrder.id, {
        status: overrideStatus,
        remarks: overrideRemarks || 'Admin override',
      });
      setStatusModalOpen(false);
      loadData();
    } catch (err) {
      setOverrideError(err.response?.data?.error || 'Status override failed');
    } finally {
      setOverrideLoading(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Order Management</h1>
          <p className="page-description">Filter, inspect, assign agents, and override statuses across all orders</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="card mb-20" style={{ padding: '16px 20px' }}>
        <div className="filter-bar" style={{ margin: 0 }}>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select className="form-select" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="CREATED">CREATED</option>
              <option value="ASSIGNED">ASSIGNED</option>
              <option value="PICKED_UP">PICKED_UP</option>
              <option value="IN_TRANSIT">IN_TRANSIT</option>
              <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
              <option value="DELIVERED">DELIVERED</option>
              <option value="FAILED">FAILED</option>
              <option value="RESCHEDULED">RESCHEDULED</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Pickup Zone</label>
            <select className="form-select" value={zoneFilter} onChange={(e) => setZoneFilter(e.target.value)}>
              <option value="">All Zones</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Agent</label>
            <select className="form-select" value={agentFilter} onChange={(e) => setAgentFilter(e.target.value)}>
              <option value="">All Agents</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>{a.user?.full_name}</option>
              ))}
            </select>
          </div>

          {(statusFilter || zoneFilter || agentFilter) && (
            <button
              className="btn btn-ghost btn-sm"
              style={{ marginTop: 20 }}
              onClick={() => { setStatusFilter(''); setZoneFilter(''); setAgentFilter(''); }}
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <Spinner size="lg" text="Loading orders..." />
      ) : orders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <div className="empty-state-title">No orders found</div>
            <div className="empty-state-desc">Try clearing or adjusting filters</div>
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
                <th>Type</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className="text-mono">{o.order_number}</td>
                  <td>
                    <div className="text-primary">{o.customer?.full_name}</div>
                    <div className="text-sm text-muted">{o.customer?.phone || o.customer?.email}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: 12.5 }}>
                      <span>{o.pickup_zone?.code}</span>
                      <span style={{ color: 'var(--text-muted)', margin: '0 6px' }}>→</span>
                      <span>{o.drop_zone?.code}</span>
                    </div>
                  </td>
                  <td>
                    <span className="badge badge-default">{o.order_type} · {o.payment_type}</span>
                  </td>
                  <td className="text-primary">{formatCurrency(o.total_charge)}</td>
                  <td><StatusBadge status={o.current_status} /></td>
                  <td>{formatDateTime(o.created_at)}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {['CREATED', 'RESCHEDULED'].includes(o.current_status) && (
                        <button
                          id={`assign-${o.id}`}
                          className="btn btn-primary btn-sm"
                          onClick={() => openAssign(o)}
                        >
                          Assign Agent
                        </button>
                      )}
                      <button
                        id={`override-${o.id}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => openOverrideStatus(o)}
                      >
                        Override Status
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Assign Modal */}
      <Modal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title={`Assign Agent — ${selectedOrder?.order_number}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setAssignModalOpen(false)}>Cancel</button>
            <button
              id="confirm-assign"
              className="btn btn-primary"
              onClick={handleAssignSubmit}
              disabled={assignLoading || (assignType === 'MANUAL' && !manualAgentId)}
            >
              {assignLoading ? 'Assigning...' : 'Confirm Assignment'}
            </button>
          </>
        }
      >
        {assignError && <div className="auth-error mb-16">{assignError}</div>}
        <div className="form-group mb-16">
          <label className="form-label">Assignment Method</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              className={`btn ${assignType === 'AUTO' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAssignType('AUTO')}
            >
              ⚡ Auto-Assign (Nearest Available)
            </button>
            <button
              type="button"
              className={`btn ${assignType === 'MANUAL' ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setAssignType('MANUAL')}
            >
              👤 Manual Choice
            </button>
          </div>
        </div>

        {assignType === 'MANUAL' && (
          <div className="form-group mb-16">
            <label className="form-label">Select Agent *</label>
            <select
              className="form-select"
              value={manualAgentId}
              onChange={(e) => setManualAgentId(e.target.value)}
              required
            >
              <option value="">Select an agent...</option>
              {agents.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.user?.full_name} ({a.availability_status} — {a.current_zone?.code || 'No zone'})
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="form-group">
          <label className="form-label">Scheduled Date</label>
          <input
            type="date"
            className="form-input"
            value={schedDate}
            min={new Date().toISOString().split('T')[0]}
            onChange={(e) => setSchedDate(e.target.value)}
          />
        </div>
      </Modal>

      {/* Override Status Modal */}
      <Modal
        open={statusModalOpen}
        onClose={() => setStatusModalOpen(false)}
        title={`Override Status — ${selectedOrder?.order_number}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setStatusModalOpen(false)}>Cancel</button>
            <button
              id="confirm-override"
              className="btn btn-primary"
              onClick={handleOverrideSubmit}
              disabled={overrideLoading}
            >
              {overrideLoading ? 'Updating...' : 'Apply Override'}
            </button>
          </>
        }
      >
        {overrideError && <div className="auth-error mb-16">{overrideError}</div>}
        <div className="form-group mb-16">
          <label className="form-label">New Status</label>
          <select
            className="form-select"
            value={overrideStatus}
            onChange={(e) => setOverrideStatus(e.target.value)}
          >
            <option value="CREATED">CREATED</option>
            <option value="ASSIGNED">ASSIGNED</option>
            <option value="PICKED_UP">PICKED_UP</option>
            <option value="IN_TRANSIT">IN_TRANSIT</option>
            <option value="OUT_FOR_DELIVERY">OUT_FOR_DELIVERY</option>
            <option value="DELIVERED">DELIVERED</option>
            <option value="FAILED">FAILED</option>
            <option value="RESCHEDULED">RESCHEDULED</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Admin Remarks / Reason</label>
          <input
            className="form-input"
            placeholder="Reason for manual status override"
            value={overrideRemarks}
            onChange={(e) => setOverrideRemarks(e.target.value)}
          />
        </div>
      </Modal>
    </div>
  );
}
