import React, { useEffect, useState } from 'react';
import { zonesAPI } from '../../services/api';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';

export default function AdminZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Zone Modal
  const [newZoneOpen, setNewZoneOpen] = useState(false);
  const [zoneForm, setZoneForm] = useState({ name: '', code: '', description: '' });
  const [zoneError, setZoneError] = useState('');
  const [zoneLoading, setZoneLoading] = useState(false);

  // Add Pincode Modal
  const [pincodeOpen, setPincodeOpen] = useState(false);
  const [selectedZone, setSelectedZone] = useState(null);
  const [pincodesInput, setPincodesInput] = useState('');
  const [pincodeError, setPincodeError] = useState('');
  const [pincodeLoading, setPincodeLoading] = useState(false);

  const loadZones = async () => {
    setLoading(true);
    try {
      const res = await zonesAPI.list();
      setZones(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadZones();
  }, []);

  const handleCreateZone = async (e) => {
    e.preventDefault();
    setZoneError('');
    setZoneLoading(true);
    try {
      await zonesAPI.create(zoneForm);
      setNewZoneOpen(false);
      setZoneForm({ name: '', code: '', description: '' });
      loadZones();
    } catch (err) {
      setZoneError(err.response?.data?.error || 'Failed to create zone');
    } finally {
      setZoneLoading(false);
    }
  };

  const openAddPincodes = async (zone) => {
    setSelectedZone(zone);
    setPincodesInput('');
    setPincodeError('');
    setPincodeOpen(true);
    // Fetch full details of zone with pincodes
    try {
      const res = await zonesAPI.get(zone.id);
      setSelectedZone(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPincodes = async (e) => {
    e.preventDefault();
    setPincodeError('');
    const list = pincodesInput
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean);

    if (!list.length) return setPincodeError('Enter at least one pincode');

    setPincodeLoading(true);
    try {
      await zonesAPI.addPincodes(selectedZone.id, list);
      setPincodeOpen(false);
      loadZones();
    } catch (err) {
      setPincodeError(err.response?.data?.error || 'Failed to add pincodes');
    } finally {
      setPincodeLoading(false);
    }
  };

  const handleDeletePincode = async (zoneId, pincodeId) => {
    try {
      await zonesAPI.deletePincode(zoneId, pincodeId);
      // Refresh zone details
      const res = await zonesAPI.get(zoneId);
      setSelectedZone(res.data);
      loadZones();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <Spinner size="lg" text="Loading zones..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Zone Management</h1>
          <p className="page-description">Configure operational delivery zones and map pincodes to zones</p>
        </div>
        <button id="add-zone-btn" className="btn btn-primary" onClick={() => setNewZoneOpen(true)}>
          ➕ Add Zone
        </button>
      </div>

      <div className="stats-grid mb-20" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
        {zones.map((zone) => (
          <div key={zone.id} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
            <div>
              <div className="flex-between mb-16">
                <div>
                  <h3 className="card-title" style={{ fontSize: 16 }}>{zone.name}</h3>
                  <span className="badge badge-default mt-4">{zone.code}</span>
                </div>
                <span className={`badge ${zone.is_active ? 'badge-success' : 'badge-default'}`}>
                  {zone.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                {zone.description || 'No description provided.'}
              </p>
            </div>

            <div style={{ paddingTop: 16, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="text-sm text-muted">
                Pincodes mapped
              </span>
              <button
                id={`manage-pincodes-${zone.id}`}
                className="btn btn-secondary btn-sm"
                onClick={() => openAddPincodes(zone)}
              >
                Manage Pincodes →
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Create Zone Modal */}
      <Modal
        open={newZoneOpen}
        onClose={() => setNewZoneOpen(false)}
        title="Create Delivery Zone"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setNewZoneOpen(false)}>Cancel</button>
            <button
              id="confirm-create-zone"
              className="btn btn-primary"
              onClick={handleCreateZone}
              disabled={zoneLoading || !zoneForm.name || !zoneForm.code}
            >
              {zoneLoading ? 'Saving...' : 'Create Zone'}
            </button>
          </>
        }
      >
        {zoneError && <div className="auth-error mb-16">{zoneError}</div>}
        <div className="form-group mb-16">
          <label className="form-label">Zone Name *</label>
          <input
            className="form-input"
            placeholder="e.g. South Mumbai"
            value={zoneForm.name}
            onChange={(e) => setZoneForm({ ...zoneForm, name: e.target.value })}
            required
          />
        </div>
        <div className="form-group mb-16">
          <label className="form-label">Zone Code *</label>
          <input
            className="form-input"
            placeholder="e.g. ZONE-S-MUM"
            value={zoneForm.code}
            onChange={(e) => setZoneForm({ ...zoneForm, code: e.target.value.toUpperCase() })}
            required
          />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-input"
            rows={3}
            placeholder="Coverage details..."
            value={zoneForm.description}
            onChange={(e) => setZoneForm({ ...zoneForm, description: e.target.value })}
          />
        </div>
      </Modal>

      {/* Manage Pincodes Modal */}
      <Modal
        open={pincodeOpen}
        onClose={() => setPincodeOpen(false)}
        title={`Pincodes for ${selectedZone?.name} (${selectedZone?.code})`}
      >
        {pincodeError && <div className="auth-error mb-16">{pincodeError}</div>}

        <div className="mb-20">
          <label className="form-label" style={{ marginBottom: 8, display: 'block' }}>Add New Pincodes (comma separated)</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              className="form-input"
              placeholder="e.g. 400001, 400005, 400018"
              value={pincodesInput}
              onChange={(e) => setPincodesInput(e.target.value)}
            />
            <button className="btn btn-primary" onClick={handleAddPincodes} disabled={pincodeLoading}>
              {pincodeLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>

        <div className="card-title" style={{ fontSize: 13, marginBottom: 12 }}>Mapped Pincodes:</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
          {(selectedZone?.zone_pincodes || []).length === 0 ? (
            <span className="text-muted text-sm">No pincodes added to this zone yet.</span>
          ) : (
            selectedZone?.zone_pincodes?.map((p) => (
              <span key={p.id} className="badge badge-default" style={{ padding: '6px 10px', fontSize: 12.5 }}>
                {p.pincode}
                <button
                  style={{ marginLeft: 6, background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                  onClick={() => handleDeletePincode(selectedZone.id, p.id)}
                >
                  ✕
                </button>
              </span>
            ))
          )}
        </div>
      </Modal>
    </div>
  );
}
