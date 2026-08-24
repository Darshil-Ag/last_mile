import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES = {
  '/dashboard':        'My Orders',
  '/orders/new':       'Place New Order',
  '/orders/track':     'Track Order',
  '/calculate':        'Rate Calculator',
  '/agent':            'My Deliveries',
  '/admin':            'All Orders',
  '/admin/zones':      'Zone Management',
  '/admin/rate-cards': 'Rate Cards',
  '/admin/cod-configs':'COD Configurations',
  '/admin/agents':     'Agent Management',
};

export default function Navbar({ onMenuToggle }) {
  const { pathname } = useLocation();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const title = Object.entries(PAGE_TITLES).find(([path]) =>
    pathname === path || pathname.startsWith(path + '/')
  )?.[1] ?? 'Last-Mile Tracker';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        {/* Hamburger — hidden on desktop, shown on mobile via CSS */}
        <button
          className="hamburger-btn"
          onClick={onMenuToggle}
          aria-label="Open menu"
          id="mobile-hamburger-btn"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
        <span className="navbar-title">{title}</span>
      </div>
      <div className="navbar-right">
        <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
        </span>
        {user && (
          <button
            id="navbar-logout-btn"
            onClick={handleLogout}
            title="Logout"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-bg)',
              color: 'var(--danger)',
              border: '1px solid var(--danger-border)',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'background 0.12s',
              whiteSpace: 'nowrap',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#fbd5d5'}
            onMouseLeave={e => e.currentTarget.style.background = 'var(--danger-bg)'}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
            Logout
          </button>
        )}
      </div>
    </header>
  );
}
