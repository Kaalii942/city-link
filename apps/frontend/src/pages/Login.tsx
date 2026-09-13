import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Navigate, useNavigate } from 'react-router-dom';
import { setCredentials } from '../store/authSlice.js';
import { RootState } from '../store/index.js';
import { api } from '../utils/api.js';
import { Lock, User, Eye, EyeOff, Building2 } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);

  // If already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await api.post<{
        success: boolean;
        user: any;
        accessToken: string;
        refreshToken: string;
      }>('/api/auth/login', { username, password, rememberMe });

      if (response.success) {
        dispatch(setCredentials({
          user: response.user,
          accessToken: response.accessToken,
          refreshToken: response.refreshToken
        }));
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-corporate-bg font-sans">
      <div className="w-full max-w-md bg-white border border-corporate-border rounded-lg shadow-card overflow-hidden">
        {/* Header Block */}
        <div className="bg-[#0F294A] p-6 flex flex-col items-center text-white">
          <div className="text-2xl font-black tracking-tight leading-none font-sans mb-1">
            <span className="text-white">CITY</span>
            <span className="text-[#F97316]">LINK</span>
          </div>
          <p className="text-[10px] font-bold text-gray-300 tracking-widest uppercase mb-2">Engineering & Services</p>
          <h1 className="text-sm font-bold tracking-tight text-brand-100">Enterprise Inventory & Procurement System</h1>
        </div>

        {/* Form Body */}
        <form onSubmit={handleLogin} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 p-3 text-sm text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Username Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-corporate-muted uppercase tracking-wider">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 w-4 h-4 text-corporate-muted" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="w-full pl-10 pr-3 py-2"
                placeholder="Enter username"
              />
            </div>
          </div>

          {/* Password Input */}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-corporate-muted uppercase tracking-wider">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 w-4 h-4 text-corporate-muted" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2"
                placeholder="Enter password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-3.5 focus:outline-none"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4 text-corporate-muted" />
                ) : (
                  <Eye className="w-4 h-4 text-corporate-muted" />
                )}
              </button>
            </div>
          </div>

          {/* Session Remember Box */}
          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center space-x-2 text-corporate-text cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="rounded border-corporate-border text-brand-500 focus:ring-brand-500 cursor-pointer"
              />
              <span>Remember me on this station</span>
            </label>
            <span className="text-brand-500 cursor-not-allowed hover:underline">Offline LAN Server</span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 bg-brand-500 hover:bg-brand-600 text-white font-medium rounded shadow-dynamics focus:outline-none transition-colors disabled:opacity-50"
          >
            {loading ? 'Authenticating station...' : 'Sign In'}
          </button>
        </form>

        <div className="bg-corporate-bg px-8 py-4 border-t border-corporate-border text-center text-xs text-corporate-muted">
          Offline System Mode &bull; SQL Server 2022 Local Instance
        </div>
      </div>
    </div>
  );
}
