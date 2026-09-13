import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { store } from './store/index.js';
import './index.css';

// Import Pages
import Login from './pages/Login.js';
import Layout from './components/Layout.js';
import Dashboard from './pages/Dashboard.js';
import Products from './pages/Products.js';
import Suppliers from './pages/Suppliers.js';
import Customers from './pages/Customers.js';
import Purchases from './pages/Purchases.js';
import Inventory from './pages/Inventory.js';
import Warehouses from './pages/Warehouses.js';
import Audit from './pages/Audit.js';
import Settings from './pages/Settings.js';
import Inquiries from './pages/Inquiries.js';
import Quotations from './pages/Quotations.js';
import SalesInvoices from './pages/SalesInvoices.js';
import Challans from './pages/Challans.js';
import ExcelWizard from './pages/ExcelWizard.js';
import Users from './pages/Users.js';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<Login />} />

            {/* Protected Routes inside Layout wrapper */}
            <Route path="/" element={<Layout />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />
              <Route path="products" element={<Products />} />
              <Route path="suppliers" element={<Suppliers />} />
              <Route path="customers" element={<Customers />} />
              <Route path="purchases" element={<Purchases />} />
              <Route path="inventory" element={<Inventory />} />
              <Route path="warehouses" element={<Warehouses />} />
              <Route path="users" element={<Users />} />
              <Route path="audit" element={<Audit />} />
              <Route path="settings" element={<Settings />} />
              <Route path="inquiries" element={<Inquiries />} />
              <Route path="quotations" element={<Quotations />} />
              <Route path="invoices" element={<SalesInvoices />} />
              <Route path="challans" element={<Challans />} />
              <Route path="excel-import" element={<ExcelWizard />} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </React.StrictMode>
);
