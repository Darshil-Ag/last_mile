import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const agentNav = [
  { label: 'My Deliveries', icon: 'deliveries', path: '/agent' },
];

export default function AgentLayout() {
  return (
    <div className="app-shell">
      <Sidebar nav={agentNav} />
      <div className="main-content">
        <Navbar />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
