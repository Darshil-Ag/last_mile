import React from 'react';
import { useLocation } from 'react-router-dom';

const PAGE_TITLES = {
  '/dashboard':        'My Orders',
  '/orders/new':       'Place New Order',
  '/agent':            'My Deliveries',
  '/admin':            'All Orders',
  '/admin/zones':      'Zone Management',
  '/admin/rate-cards': 'Rate Cards',
  '/admin/cod-configs':'COD Configurations',
  '/admin/agents':     'Agent Management',
};

export default function Navbar() {
  const { pathname } = useLocation();
  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? 'Last-Mile Tracker';

  return (
    <header className="navbar">
      <span className="navbar-title">{title}</span>
      <div className="navbar-right">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
      </div>
    </header>
  );
}
