import React, { useEffect, useState } from 'react';
import { agentsAPI, zonesAPI } from '../../services/api';
import { AvailabilityBadge } from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import { formatDateTime } from '../../utils/formatters';

/* ─── Flat single-color SVG icons for Stat Cards (Item 4 fix) ─── */
const UsersIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
  </svg>
);

const AvailableIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <path d="M12 8v8M8 12h8" />
  </svg>
);

const TruckStatIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    <rect x="1" y="3" width="15" height="13" rx="1" />
    <path d="M16 8h4l3 5v3h-7V8z" />
    <circle cx="5.5" cy="18.5" r="1.5" />
    <circle cx="18.5" cy="18.5" r="1.5" />
  </svg>
);

export default function AdminAgents() {
  const [agents, setAgents]   = useState([]);
  const [zones, setZones]     = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen]     = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);

  const [selectedAgent, setSelectedAgent] = useState(null);

  // Create form
  const [createForm, setCreateForm] = useState({
    full_name: '', email: '', phone: '', password: '', current_zone_id: '',
  });
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError]     = useState('');

  // Edit form
  const [editForm, setEditForm] = useState({
    full_name: '', phone: '', current_zone_id: '', availability_status: 'OFFLINE',
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError]     = useState('');

  // Deactivate/Reactivate loading
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [aRes, zRes] = await Promise.all([agentsAPI.list(), zonesAPI.list()]);
      setAgents(aRes.data || []);
      setZones(zRes.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  // Open Create Modal
  const openCreate = () => {
    setCreateForm({ full_name: '', email: '', phone: '', password: '', current_zone_id: '' });
    setCreateError('');
    setCreateModalOpen(true);
  };

  // Submit Create Agent
  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    setCreateError(''); setCreateLoading(true);
    try {
      await agentsAPI.create(createForm);
      setCreateModalOpen(false);
      loadData();
    } catch (err) {
      setCreateError(err.response?.data?.error || 'Failed to create agent');
    } finally {
      setCreateLoading(false);
    }
  };

  // Open Edit Modal
  const openEdit = (agent) => {
    setSelectedAgent(agent);
    setEditForm({
      full_name: agent.user?.full_name || '',
      phone: agent.user?.phone || '',
      current_zone_id: agent.current_zone?.id || '',
      availability_status: agent.availability_status || 'OFFLINE',
    });
    setEditError('');
    setEditModalOpen(true);
  };

  // Submit Edit Agent
  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(''); setEditLoading(true);
    try {
      await agentsAPI.update(selectedAgent.id, editForm);
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      setEditError(err.response?.data?.error || 'Failed to update agent');
    } finally {
      setEditLoading(false);
    }
  };

  // Open Deactivate Confirmation Modal
  const openDeactivateConfirm = (agent) => {
    setSelectedAgent(agent);
    setActionError('');
    setDeactivateModalOpen(true);
  };

  // Confirm Deactivate
  const handleDeactivate = async () => {
    setActionError(''); setActionLoading(true);
    try {
      await agentsAPI.deactivate(selectedAgent.id);
      setDeactivateModalOpen(false);
      loadData();
    } catch (err) {
      setActionError(err.response?.data?.error || 'Failed to deactivate agent');
    } finally {
      setActionLoading(false);
    }
  };

  // Reactivate Agent
  const handleReactivate = async (agent) => {
    try {
      await agentsAPI.reactivate(agent.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <Spinner size="lg" text="Loading delivery agents..." />;

  return (
    <div>
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery Agent Management</h1>
          <p className="page-description">Monitor agent status, active zone assignments, and manage fleet accounts</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          + Create Agent
        </button>
      </div>

      {/* Stat Cards */}
      <div className="stats-grid mb-20">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>
            <UsersIcon />
          </div>
          <div className="stat-body">
            <div className="stat-value">{agents.length}</div>
            <div className="stat-label">Total Agents</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>
            <AvailableIcon />
          </div>
          <div className="stat-body">
            <div className="stat-value">
              {agents.filter((a) => a.is_active && a.availability_status === 'AVAILABLE').length}
            </div>
            <div className="stat-label">Available Now</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>
            <TruckStatIcon />
          </div>
          <div className="stat-body">
            <div className="stat-value">
              {agents.filter((a) => a.is_active && a.availability_status === 'BUSY').length}
            </div>
            <div className="stat-label">Busy on Delivery</div>
          </div>
        </div>
      </div>

      {/* Agents Table */}
      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Agent Name</th>
              <th>Phone / Email</th>
              <th>Current Zone</th>
              <th>Availability</th>
              <th>GPS Location</th>
              <th>Last Update</th>
              <th>Account Status</th> {/* Item 3 Fix: Renamed Active to Account Status */}
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id} style={!a.is_active ? { opacity: 0.6, background: 'var(--surface-alt)' } : {}}>
                <td className="text-primary fw-600">
                  {a.user?.full_name}
                  {!a.is_active && <span className="text-muted text-xs ms-2">(Deactivated)</span>}
                </td>
                <td>
                  <div>{a.user?.phone || '—'}</div>
                  <div className="text-muted text-sm">{a.user?.email}</div>
                </td>
                <td>
                  {a.current_zone ? (
                    <span className="badge badge-default">{a.current_zone.name} ({a.current_zone.code})</span>
                  ) : (
                    <span className="text-muted">Unassigned</span>
                  )}
                </td>
                <td><AvailabilityBadge status={a.availability_status} /></td>
                <td className="text-mono">
                  {a.latitude != null && a.longitude != null
                    ? `${a.latitude.toFixed(4)}, ${a.longitude.toFixed(4)}`
                    : '—'}
                </td>
                <td>{formatDateTime(a.last_location_at)}</td>
                <td>
                  <span className={`badge ${a.is_active ? 'badge-success' : 'badge-default'}`}>
                    {a.is_active ? 'ACTIVE' : 'INACTIVE'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      id={`edit-agent-${a.id}`}
                      className="btn btn-secondary btn-sm"
                      onClick={() => openEdit(a)}
                    >
                      Edit
                    </button>
                    {a.is_active ? (
                      <button
                        id={`deactivate-agent-${a.id}`}
                        className="btn btn-danger btn-sm"
                        onClick={() => openDeactivateConfirm(a)}
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        id={`reactivate-agent-${a.id}`}
                        className="btn btn-secondary btn-sm"
                        onClick={() => handleReactivate(a)}
                      >
                        Reactivate
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Agent Modal */}
      <Modal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create New Delivery Agent"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setCreateModalOpen(false)}>Cancel</button>
            <button
              id="confirm-create-agent"
              className="btn btn-primary"
              onClick={handleCreateSubmit}
              disabled={createLoading || !createForm.full_name || !createForm.email || !createForm.password}
            >
              {createLoading ? 'Creating...' : 'Create Agent Account'}
            </button>
          </>
        }
      >
        {createError && <div className="auth-error mb-16">{createError}</div>}
        <div className="form-group mb-16">
          <label className="form-label">Full Name *</label>
          <input
            className="form-input"
            placeholder="e.g. Ramesh Kumar"
            value={createForm.full_name}
            onChange={(e) => setCreateForm({ ...createForm, full_name: e.target.value })}
            required
          />
        </div>
        <div className="form-grid-2 mb-16">
          <div className="form-group">
            <label className="form-label">Email Address *</label>
            <input
              className="form-input"
              type="email"
              placeholder="agent@lastmile.dev"
              value={createForm.email}
              onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Phone Number</label>
            <input
              className="form-input"
              type="tel"
              placeholder="9876543210"
              value={createForm.phone}
              onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
            />
          </div>
        </div>
        <div className="form-group mb-16">
          <label className="form-label">Initial Password *</label>
          <input
            className="form-input"
            type="password"
            placeholder="Min 8 characters"
            value={createForm.password}
            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Assigned Zone</label>
          <select
            className="form-select"
            value={createForm.current_zone_id}
            onChange={(e) => setCreateForm({ ...createForm, current_zone_id: e.target.value })}
          >
            <option value="">Select a zone (optional)...</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
            ))}
          </select>
        </div>
      </Modal>

      {/* Edit Agent Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Agent — ${selectedAgent?.user?.full_name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button
              id="confirm-edit-agent"
              className="btn btn-primary"
              onClick={handleEditSubmit}
              disabled={editLoading}
            >
              {editLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {editError && <div className="auth-error mb-16">{editError}</div>}
        <div className="form-group mb-16">
          <label className="form-label">Full Name</label>
          <input
            className="form-input"
            value={editForm.full_name}
            onChange={(e) => setEditForm({ ...editForm, full_name: e.target.value })}
          />
        </div>
        <div className="form-group mb-16">
          <label className="form-label">Phone Number</label>
          <input
            className="form-input"
            value={editForm.phone}
            onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
          />
        </div>
        <div className="form-group mb-16">
          <label className="form-label">Assigned Zone</label>
          <select
            className="form-select"
            value={editForm.current_zone_id}
            onChange={(e) => setEditForm({ ...editForm, current_zone_id: e.target.value })}
          >
            <option value="">Unassigned</option>
            {zones.map((z) => (
              <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
            ))}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Availability Status</label>
          <select
            className="form-select"
            value={editForm.availability_status}
            onChange={(e) => setEditForm({ ...editForm, availability_status: e.target.value })}
          >
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="BUSY">BUSY</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>
        </div>
      </Modal>

      {/* Deactivate Confirmation Modal */}
      <Modal
        open={deactivateModalOpen}
        onClose={() => setDeactivateModalOpen(false)}
        title={`Deactivate Agent — ${selectedAgent?.user?.full_name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setDeactivateModalOpen(false)}>Cancel</button>
            <button
              id="confirm-deactivate-agent"
              className="btn btn-danger"
              onClick={handleDeactivate}
              disabled={actionLoading}
            >
              {actionLoading ? 'Deactivating...' : 'Confirm Deactivation'}
            </button>
          </>
        }
      >
        {actionError && <div className="auth-error mb-16">{actionError}</div>}
        <p style={{ fontSize: 13.5, color: 'var(--steel)', lineHeight: 1.6 }}>
          Deactivating <strong>{selectedAgent?.user?.full_name}</strong> will set their availability to <strong>OFFLINE</strong> and remove them from auto-assignment eligibility.
        </p>
        <p style={{ fontSize: 12.5, color: 'var(--mist)', marginTop: 8 }}>
          Note: Historical order assignments and tracking logs for this agent will be preserved intact. Account can be reactivated at any time.
        </p>
      </Modal>
    </div>
  );
}
