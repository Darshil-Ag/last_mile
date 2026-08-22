import React, { useEffect, useState } from 'react';
import { rateCardsAPI, zonesAPI } from '../../services/api';
import { formatCurrency, formatWeight } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';

export default function AdminRateCards() {
  const [rateCards, setRateCards] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    from_zone_id: '',
    to_zone_id: '',
    order_type: 'B2C',
    base_price: '',
    rate_per_kg: '',
    min_chargeable_kg: '0.5',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [rcRes, zRes] = await Promise.all([rateCardsAPI.list(), zonesAPI.list()]);
      setRateCards(rcRes.data || []);
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

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await rateCardsAPI.create({
        ...form,
        base_price: Number(form.base_price),
        rate_per_kg: Number(form.rate_per_kg),
        min_chargeable_kg: Number(form.min_chargeable_kg),
      });
      setModalOpen(false);
      setForm({
        from_zone_id: '',
        to_zone_id: '',
        order_type: 'B2C',
        base_price: '',
        rate_per_kg: '',
        min_chargeable_kg: '0.5',
      });
      loadData();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save rate card');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner size="lg" text="Loading rate cards..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rate Cards</h1>
          <p className="page-description">Configure zone-to-zone pricing rules for B2B and B2C orders</p>
        </div>
        <button id="add-rate-card-btn" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          ➕ Create Rate Card
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>From Zone</th>
              <th>To Zone</th>
              <th>Order Type</th>
              <th>Category</th>
              <th>Base Price</th>
              <th>Rate / kg</th>
              <th>Min Chargeable Weight</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rateCards.map((rc) => {
              const isIntra = rc.from_zone_id === rc.to_zone_id;
              return (
                <tr key={rc.id}>
                  <td className="text-primary">{rc.from_zone?.name} ({rc.from_zone?.code})</td>
                  <td className="text-primary">{rc.to_zone?.name} ({rc.to_zone?.code})</td>
                  <td>
                    <span className={`badge ${rc.order_type === 'B2B' ? 'badge-purple' : 'badge-info'}`}>
                      {rc.order_type}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${isIntra ? 'badge-success' : 'badge-warning'}`}>
                      {isIntra ? 'Intra-Zone' : 'Inter-Zone'}
                    </span>
                  </td>
                  <td className="fw-600">{formatCurrency(rc.base_price)}</td>
                  <td className="fw-600">{formatCurrency(rc.rate_per_kg)} / kg</td>
                  <td>{formatWeight(rc.min_chargeable_kg)}</td>
                  <td>
                    <span className={`badge ${rc.is_active ? 'badge-success' : 'badge-default'}`}>
                      {rc.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Configure Rate Card"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              id="confirm-rate-card"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={submitting || !form.from_zone_id || !form.to_zone_id || !form.base_price || !form.rate_per_kg}
            >
              {submitting ? 'Saving...' : 'Save Rate Card'}
            </button>
          </>
        }
      >
        {error && <div className="auth-error mb-16">{error}</div>}
        <div className="form-grid-2 mb-16">
          <div className="form-group">
            <label className="form-label">From Zone *</label>
            <select
              className="form-select"
              value={form.from_zone_id}
              onChange={(e) => setForm({ ...form, from_zone_id: e.target.value })}
              required
            >
              <option value="">Select origin zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">To Zone *</label>
            <select
              className="form-select"
              value={form.to_zone_id}
              onChange={(e) => setForm({ ...form, to_zone_id: e.target.value })}
              required
            >
              <option value="">Select destination zone</option>
              {zones.map((z) => (
                <option key={z.id} value={z.id}>{z.name} ({z.code})</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group mb-16">
          <label className="form-label">Order Type *</label>
          <select
            className="form-select"
            value={form.order_type}
            onChange={(e) => setForm({ ...form, order_type: e.target.value })}
          >
            <option value="B2C">B2C — Consumer</option>
            <option value="B2B">B2B — Business</option>
          </select>
        </div>

        <div className="form-grid-3">
          <div className="form-group">
            <label className="form-label">Base Price (₹) *</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="40.00"
              value={form.base_price}
              onChange={(e) => setForm({ ...form, base_price: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Rate / kg (₹) *</label>
            <input
              type="number"
              step="0.01"
              className="form-input"
              placeholder="12.00"
              value={form.rate_per_kg}
              onChange={(e) => setForm({ ...form, rate_per_kg: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Min Charge Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              className="form-input"
              value={form.min_chargeable_kg}
              onChange={(e) => setForm({ ...form, min_chargeable_kg: e.target.value })}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
}
