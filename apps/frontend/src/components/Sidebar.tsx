import React from 'react';
import { NavLink } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../store/authSlice.js';
import { RootState } from '../store/index.js';
import { api } from '../utils/api.js';
import {
  LayoutDashboard,
  Box,
  Truck,
  Users,
  ShoppingCart,
  FileText,
  Warehouse,
  History,
  Settings as SettingsIcon,
  LogOut,
  ShieldCheck,
  FileQuestion,
  FileSpreadsheet,
  FileUp
} from 'lucide-react';

import { LesLogo } from './Letterhead.js';

export default function Sidebar() {
  const dispatch = useDispatch();
  const user = useSelector((state: RootState) => state.auth.user);
  const refreshToken = useSelector((state: RootState) => state.auth.refreshToken);

  const handleLogout = async () => {
    if (confirm('Are you sure you want to end your EIPMS session?')) {
      try {
        if (refreshToken) {
          await api.post('/api/auth/logout', { refreshToken });
        }
      } catch (err) {
        console.error('Logout error:', err);
      } finally {
        dispatch(logout());
      }
    }
  };

  const navItems = [
    { name: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, permission: null },
    { name: 'Customer Inquiries', path: '/inquiries', icon: FileQuestion, permission: 'product:read' },
    { name: 'Quotations', path: '/quotations', icon: FileSpreadsheet, permission: 'quotation:read' },
    { name: 'Sales Invoices', path: '/invoices', icon: FileText, permission: 'finance:read' },
    { name: 'Delivery Challans', path: '/challans', icon: Truck, permission: 'challan:read' },
    { name: 'Product Catalog', path: '/products', icon: Box, permission: 'product:read' },
    { name: 'Customers', path: '/customers', icon: Users, permission: 'customer:read' },
    { name: 'Procurement', path: '/purchases', icon: ShoppingCart, permission: 'purchase:read' },
    { name: 'User Management', path: '/users', icon: ShieldCheck, permission: 'user:write' },
    { name: 'Excel Import Wizard', path: '/excel-import', icon: FileUp, permission: 'product:read' },
    { name: 'Audit Trail', path: '/audit', icon: History, permission: 'audit:read' },
    { name: 'System Settings', path: '/settings', icon: SettingsIcon, permission: 'setting:read' }
  ];

  const hasPermission = (perm: string | null) => {
    if (!perm) return true;
    if (!user) return false;
    return user.roles.includes('Super Admin') || user.permissions.includes(perm);
  };

  return (
    <aside className="w-64 bg-white border-r border-corporate-border flex flex-col h-screen select-none">
      {/* Brand Block */}
      <div className="h-16 border-b border-corporate-border flex items-center px-4 bg-[#0F294A] text-white">
        <div className="flex items-center space-x-2">
          <LesLogo className="w-9 h-9 shrink-0" />
          <div>
            <div className="font-black text-base tracking-tight leading-none font-sans">
              <span className="text-white">CITY</span>
              <span className="text-[#F97316]">LINK</span>
            </div>
            <div className="text-[7.5px] text-gray-300 font-bold tracking-widest uppercase font-sans mt-0.5">Engineering & Services</div>
          </div>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (!hasPermission(item.permission)) return null;

          return (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-brand-500 text-white shadow-dynamics'
                    : 'text-corporate-text hover:bg-corporate-bg hover:text-brand-500'
                }`
              }
            >
              {({ isActive }) => {
                const Icon = item.icon;
                return (
                  <>
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-corporate-muted'}`} />
                    <span>{item.name}</span>
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </nav>

      {/* User Footer Block */}
      <div className="p-4 border-t border-corporate-border bg-brand-50/50 flex flex-col space-y-3">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-brand-200 text-brand-700 flex items-center justify-center font-bold text-sm">
            {user ? `${user.firstName[0]}${user.lastName[0]}` : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-corporate-text truncate">
              {user ? `${user.firstName} ${user.lastName}` : 'Guest User'}
            </p>
            <p className="text-[10px] text-corporate-muted truncate">
              {user ? user.roles.join(', ') : 'Operator'}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center space-x-2 py-1.5 px-3 border border-red-200 text-red-600 hover:bg-red-50 rounded text-xs font-medium transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Sign Out Session</span>
        </button>
      </div>
    </aside>
  );
}
