import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('lm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Global error handling — auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('lm_token');
      localStorage.removeItem('lm_user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ──────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// ─── Zones ─────────────────────────────────────────────────
export const zonesAPI = {
  list: () => api.get('/zones'),
  get: (id) => api.get(`/zones/${id}`),
  lookup: (pincode) => api.get(`/zones/lookup?pincode=${pincode}`),
  create: (data) => api.post('/zones', data),
  update: (id, data) => api.put(`/zones/${id}`, data),
  addPincodes: (id, pincodes) => api.post(`/zones/${id}/pincodes`, { pincodes }),
  deletePincode: (zoneId, pincodeId) => api.delete(`/zones/${zoneId}/pincodes/${pincodeId}`),
};

// ─── Rate Cards ─────────────────────────────────────────────
export const rateCardsAPI = {
  list: (params) => api.get('/rate-cards', { params }),
  create: (data) => api.post('/rate-cards', data),
  update: (id, data) => api.put(`/rate-cards/${id}`, data),
};

// ─── COD Configs ────────────────────────────────────────────
export const codConfigsAPI = {
  list: (params) => api.get('/cod-configs', { params }),
  create: (data) => api.post('/cod-configs', data),
  update: (id, data) => api.put(`/cod-configs/${id}`, data),
};

// ─── Orders ─────────────────────────────────────────────────
export const ordersAPI = {
  calculate: (data) => api.post('/orders/calculate', data),
  create: (data) => api.post('/orders', data),
  listAll: (params) => api.get('/orders', { params }),
  mine: () => api.get('/orders/mine'),
  get: (id) => api.get(`/orders/${id}`),
  assign: (id, data) => api.post(`/orders/${id}/assign`, data),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  reschedule: (id, data) => api.post(`/orders/${id}/reschedule`, data),
};

// ─── Agents ─────────────────────────────────────────────────
export const agentsAPI = {
  list: (params) => api.get('/agents', { params }),
  create: (data) => api.post('/agents', data),
  me: () => api.get('/agents/me'),
  myOrders: () => api.get('/agents/me/orders'),
  updateLocation: (data) => api.put('/agents/me/location', data),
  updateAvailability: (data) => api.put('/agents/me/availability', data),
  updateStatus: (id, data) => api.put(`/agents/${id}/status`, data),
};

export default api;
