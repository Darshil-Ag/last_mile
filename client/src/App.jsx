import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';

// Auth
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Public (no auth required)
import PublicTrack      from './pages/public/PublicTrack';
import PublicCalculator from './pages/public/PublicCalculator';

// Customer
import CustomerLayout from './components/layout/CustomerLayout';
import CustomerDashboard from './pages/customer/CustomerDashboard';
import NewOrder from './pages/customer/NewOrder';
import TrackOrder from './pages/customer/TrackOrder';

// Agent
import AgentLayout from './components/layout/AgentLayout';
import AgentDashboard from './pages/agent/AgentDashboard';
import UpdateStatus from './pages/agent/UpdateStatus';

// Admin
import AdminLayout from './components/layout/AdminLayout';
import AdminOrders from './pages/admin/AdminOrders';
import AdminZones from './pages/admin/AdminZones';
import AdminRateCards from './pages/admin/AdminRateCards';
import AdminCodConfigs from './pages/admin/AdminCodConfigs';
import AdminAgents from './pages/admin/AdminAgents';

import Spinner from './components/ui/Spinner';

function RoleRoute({ role, children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) {
    // Redirect to their correct home
    const home = user.role === 'ADMIN' ? '/admin' : user.role === 'AGENT' ? '/agent' : '/';
    return <Navigate to={home} replace />;
  }
  return children;
}

function RootRedirect() {
  const { user, loading } = useAuth();
  if (loading) return <div className="spinner-center"><div className="spinner spinner-lg" /></div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  if (user.role === 'AGENT') return <Navigate to="/agent" replace />;
  return <Navigate to="/dashboard" replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<RootRedirect />} />
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Public pages — no auth, no nav shell */}
      <Route path="/track"           element={<PublicTrack />} />
      <Route path="/track/:orderId"  element={<PublicTrack />} />
      <Route path="/calculate"       element={<PublicCalculator />} />

      {/* Customer */}
      <Route path="/dashboard" element={<RoleRoute role="CUSTOMER"><CustomerLayout /></RoleRoute>}>
        <Route index element={<CustomerDashboard />} />
      </Route>
      <Route path="/orders/new" element={<RoleRoute role="CUSTOMER"><CustomerLayout /></RoleRoute>}>
        <Route index element={<NewOrder />} />
      </Route>
      <Route path="/orders/:id" element={<RoleRoute role="CUSTOMER"><CustomerLayout /></RoleRoute>}>
        <Route index element={<TrackOrder />} />
      </Route>

      {/* Agent */}
      <Route path="/agent" element={<RoleRoute role="AGENT"><AgentLayout /></RoleRoute>}>
        <Route index element={<AgentDashboard />} />
      </Route>
      <Route path="/agent/orders/:id" element={<RoleRoute role="AGENT"><AgentLayout /></RoleRoute>}>
        <Route index element={<UpdateStatus />} />
      </Route>

      {/* Admin */}
      <Route path="/admin" element={<RoleRoute role="ADMIN"><AdminLayout /></RoleRoute>}>
        <Route index element={<AdminOrders />} />
      </Route>
      <Route path="/admin/zones" element={<RoleRoute role="ADMIN"><AdminLayout /></RoleRoute>}>
        <Route index element={<AdminZones />} />
      </Route>
      <Route path="/admin/rate-cards" element={<RoleRoute role="ADMIN"><AdminLayout /></RoleRoute>}>
        <Route index element={<AdminRateCards />} />
      </Route>
      <Route path="/admin/cod-configs" element={<RoleRoute role="ADMIN"><AdminLayout /></RoleRoute>}>
        <Route index element={<AdminCodConfigs />} />
      </Route>
      <Route path="/admin/agents" element={<RoleRoute role="ADMIN"><AdminLayout /></RoleRoute>}>
        <Route index element={<AdminAgents />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
