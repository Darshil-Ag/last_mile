import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const adminNav = [
  { label: 'Orders',      icon: 'orders',      path: '/admin' },
  { label: 'Zones',       icon: 'zones',        path: '/admin/zones' },
  { label: 'Rate Cards',  icon: 'rateCards',    path: '/admin/rate-cards' },
  { label: 'COD Configs', icon: 'codConfigs',   path: '/admin/cod-configs' },
  { label: 'Agents',      icon: 'agents',       path: '/admin/agents' },
];

export default function AdminLayout() {
  return (
    <div className="app-shell">
      <Sidebar nav={adminNav} />
      <div className="main-content">
        <Navbar />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
