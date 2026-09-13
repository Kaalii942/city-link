import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { RootState } from '../store/index.js';
import Sidebar from './Sidebar.js';
import { Monitor, Network, Clock } from 'lucide-react';

export default function Layout() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const user = useSelector((state: RootState) => state.auth.user);

  // Protected Route Logic
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const currentDateString = new Date().toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  return (
    <div className="flex h-screen overflow-hidden bg-corporate-bg font-sans">
      {/* Sidebar Navigation */}
      <Sidebar />

      {/* Main View Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="h-16 bg-white border-b border-corporate-border px-8 flex items-center justify-between select-none">
          {/* Station Status Indicators */}
          <div className="flex items-center space-x-6 text-xs text-corporate-muted font-medium">
            <div className="flex items-center space-x-2">
              <Monitor className="w-3.5 h-3.5 text-brand-500" />
              <span>STATION: local-workstation</span>
            </div>
            <div className="flex items-center space-x-2">
              <Network className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-600 font-semibold">LAN: ONLINE (SQL Server 2022)</span>
            </div>
          </div>

          {/* Quick Date Display */}
          <div className="flex items-center space-x-2 text-xs text-corporate-muted font-medium">
            <Clock className="w-3.5 h-3.5" />
            <span>{currentDateString}</span>
          </div>
        </header>

        {/* Content Viewport */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
