import React, { useEffect, useState } from 'react';
import { agentsAPI, zonesAPI } from '../../services/api';
import { AvailabilityBadge } from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';
import { formatDateTime } from '../../utils/formatters';

export default function AdminAgents() {
  const [agents, setAgents] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit agent status modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [availStatus, setAvailStatus] = useState('OFFLINE');
  const [isActive, setIsActive] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState('');

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

  useEffect(() => {
    loadData();
  }, []);

  const openEdit = (agent) => {
    setSelectedAgent(agent);
    setAvailStatus(agent.availability_status);
    setIsActive(agent.is_active);
    setError('');
    setEditModalOpen(true);
  };

  const handleUpdateAgent = async (e) => {
    e.preventDefault();
    setError('');
    setUpdating(true);
    try {
      await agentsAPI.updateStatus(selectedAgent.id, {
        availability_status: availStatus,
        is_active: isActive,
      });
      setEditModalOpen(false);
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update agent status');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) return <Spinner size="lg" text="Loading delivery agents..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Delivery Agent Management</h1>
          <p className="page-description">Monitor agent status, active zone assignments, and GPS availability</p>
        </div>
      </div>

      <div className="stats-grid mb-20">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--info-bg)', color: 'var(--info)' }}>👥</div>
          <div className="stat-body">
            <div className="stat-value">{agents.length}</div>
            <div className="stat-label">Total Agents</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--success-bg)', color: 'var(--success)' }}>🟢</div>
          <div className="stat-body">
            <div className="stat-value">
              {agents.filter((a) => a.availability_status === 'AVAILABLE').length}
            </div>
            <div className="stat-label">Available Now</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>🚚</div>
          <div className="stat-body">
            <div className="stat-value">
              {agents.filter((a) => a.availability_status === 'BUSY').length}
            </div>
            <div className="stat-label">Busy on Delivery</div>
          </div>
        </div>
      </div>

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
              <th>Active</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.map((a) => (
              <tr key={a.id}>
                <td className="text-primary fw-600">{a.user?.full_name}</td>
                <td>
                  <div>{a.user?.phone || '—'}</div>
                  <div className="text-muted text-sm">{a.user?.email}</div>
                </td>
                <td>
                  {a.current_zone ? (
                    <span className="badge badge-purple">{a.current_zone.name} ({a.current_zone.code})</span>
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
                    {a.is_active ? 'Yes' : 'No'}
                  </span>
                </td>
                <td>
                  <button id={`edit-agent-${a.id}`} className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>
                    Edit Status
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={`Edit Agent Status — ${selectedAgent?.user?.full_name}`}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setEditModalOpen(false)}>Cancel</button>
            <button
              id="confirm-agent-status"
              className="btn btn-primary"
              onClick={handleUpdateAgent}
              disabled={updating}
            >
              {updating ? 'Updating...' : 'Save Changes'}
            </button>
          </>
        }
      >
        {error && <div className="auth-error mb-16">{error}</div>}
        <div className="form-group mb-16">
          <label className="form-label">Availability Status</label>
          <select
            className="form-select"
            value={availStatus}
            onChange={(e) => setAvailStatus(e.target.value)}
          >
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="BUSY">BUSY</option>
            <option value="OFFLINE">OFFLINE</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Active Status</label>
          <select
            className="form-select"
            value={isActive ? 'true' : 'false'}
            onChange={(e) => setIsActive(e.target.value === 'true')}
          >
            <option value="true">Active (Eligible for assignment)</option>
            <option value="false">Inactive (Suspended / Disabled)</option>
          </select>
        </div>
      </Modal>
    </div>
  );
}
