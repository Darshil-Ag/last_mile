import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

const agentNav = [
  { label: 'My Deliveries', icon: 'deliveries', path: '/agent' },
];

export default function AgentLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar
        nav={agentNav}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="main-content">
        <Navbar onMenuToggle={() => setSidebarOpen((o) => !o)} />
        <main className="page-body">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
