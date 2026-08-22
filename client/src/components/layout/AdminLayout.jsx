import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const adminNav = [
  { label: 'Orders', icon: '📋', path: '/admin' },
  { label: 'Zones', icon: '🗺️', path: '/admin/zones' },
  { label: 'Rate Cards', icon: '💰', path: '/admin/rate-cards' },
  { label: 'COD Configs', icon: '🏷️', path: '/admin/cod-configs' },
  { label: 'Agents', icon: '👥', path: '/admin/agents' },
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
