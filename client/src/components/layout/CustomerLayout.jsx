import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const customerNav = [
  { label: 'My Orders', icon: '📦', path: '/dashboard' },
  { label: 'New Order', icon: '➕', path: '/orders/new' },
];

export default function CustomerLayout() {
  return (
    <div className="app-shell">
      <Sidebar nav={customerNav} />
      <div className="main-content">
        <Navbar />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
