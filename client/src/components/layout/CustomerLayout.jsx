import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const customerNav = [
  { label: 'My Orders',        icon: 'myOrders',    path: '/dashboard' },
  { label: 'New Order',        icon: 'newOrder',     path: '/orders/new' },
  { label: 'Track Order',      icon: 'trackOrder',   path: '/orders/track' },
  { label: 'Rate Calculator',  icon: 'calculator',   path: '/calculate' },
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
