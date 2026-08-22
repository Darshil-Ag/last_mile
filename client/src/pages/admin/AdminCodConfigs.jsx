import React, { useEffect, useState } from 'react';
import { codConfigsAPI } from '../../services/api';
import { formatCurrency } from '../../utils/formatters';
import Spinner from '../../components/ui/Spinner';
import Modal from '../../components/ui/Modal';

export default function AdminCodConfigs() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    order_type: 'B2C',
    surcharge_type: 'PERCENTAGE',
    surcharge_value: '',
  });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadConfigs = async () => {
    setLoading(true);
    try {
      const res = await codConfigsAPI.list();
      setConfigs(res.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConfigs();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await codConfigsAPI.create({
        ...form,
        surcharge_value: Number(form.surcharge_value),
      });
      setModalOpen(false);
      setForm({ order_type: 'B2C', surcharge_type: 'PERCENTAGE', surcharge_value: '' });
      loadConfigs();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save COD surcharge configuration');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <Spinner size="lg" text="Loading COD configs..." />;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">COD Surcharge Configurations</h1>
          <p className="page-description">Manage Cash-On-Delivery surcharge rules per order type (Flat fee or Percentage)</p>
        </div>
        <button id="add-cod-config-btn" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          ➕ Add COD Config
        </button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Order Type</th>
              <th>Surcharge Type</th>
              <th>Value</th>
              <th>Effective From</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {configs.map((c) => (
              <tr key={c.id}>
                <td>
                  <span className={`badge ${c.order_type === 'B2B' ? 'badge-b2b' : 'badge-b2c'}`}>
                    {c.order_type}
                  </span>
                </td>
                <td>
                  <span className="badge badge-default">{c.surcharge_type}</span>
                </td>
                <td className="fw-700 text-primary">
                  {c.surcharge_type === 'FIXED'
                    ? formatCurrency(c.surcharge_value)
                    : `${c.surcharge_value}% of base charge`}
                </td>
                <td>{new Date(c.effective_from).toLocaleDateString('en-IN')}</td>
                <td>
                  <span className={`badge ${c.is_active ? 'badge-success' : 'badge-default'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Configure COD Surcharge"
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancel</button>
            <button
              id="confirm-cod-config"
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={submitting || !form.surcharge_value}
            >
              {submitting ? 'Saving...' : 'Save Configuration'}
            </button>
          </>
        }
      >
        {error && <div className="auth-error mb-16">{error}</div>}
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

        <div className="form-group mb-16">
          <label className="form-label">Surcharge Type *</label>
          <select
            className="form-select"
            value={form.surcharge_type}
            onChange={(e) => setForm({ ...form, surcharge_type: e.target.value })}
          >
            <option value="PERCENTAGE">PERCENTAGE (% of base charge)</option>
            <option value="FIXED">FIXED (Flat rupee amount)</option>
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">Value *</label>
          <input
            type="number"
            step="0.01"
            className="form-input"
            placeholder={form.surcharge_type === 'FIXED' ? 'e.g. 25.00 (₹)' : 'e.g. 2.00 (%)'}
            value={form.surcharge_value}
            onChange={(e) => setForm({ ...form, surcharge_value: e.target.value })}
            required
          />
        </div>
      </Modal>
    </div>
  );
}
