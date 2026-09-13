import { store } from '../store/index.js';
import { updateAccessToken, logout } from '../store/authSlice.js';

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

class ApiClient {
  private async getHeaders(options: RequestOptions): Promise<Headers> {
    const headers = new Headers(options.headers || {});
    
    // Read token from localStorage directly to avoid cycle imports
    const token = localStorage.getItem('accessToken');
    if (token && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }

    return headers;
  }

  private getBaseUrl(): string {
    const envApiUrl = import.meta.env.VITE_API_URL;
    return envApiUrl ? envApiUrl.replace(/\/$/, '') : '';
  }

  private buildUrl(url: string, params?: Record<string, string | number | boolean | undefined>): string {
    const baseUrl = this.getBaseUrl();
    const fullEndpoint = (url.startsWith('/') && baseUrl) ? `${baseUrl}${url}` : url;
    
    if (!params) return fullEndpoint;
    
    const queryParts = Object.entries(params)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`);
    
    if (queryParts.length === 0) return fullEndpoint;
    
    const separator = fullEndpoint.includes('?') ? '&' : '?';
    return `${fullEndpoint}${separator}${queryParts.join('&')}`;
  }

  async request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = this.buildUrl(endpoint, options.params);
    const headers = await this.getHeaders(options);

    const config: RequestInit = {
      ...options,
      headers
    };

    let response = await fetch(url, config);

    // If unauthorized, try to refresh tokens
    if (response.status === 401 && !endpoint.includes('/api/auth/login')) {
      const refreshed = await this.attemptTokenRefresh();
      if (refreshed) {
        // Retry original request with new token
        const newHeaders = await this.getHeaders(options);
        config.headers = newHeaders;
        response = await fetch(url, config);
      } else {
        store.dispatch(logout());
        throw new Error('Session expired. Please log in again.');
      }
    }

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  private isRefreshing = false;
  private refreshSubscribers: ((token: string) => void)[] = [];

  private async attemptTokenRefresh(): Promise<boolean> {
    if (this.isRefreshing) {
      return new Promise((resolve) => {
        this.refreshSubscribers.push((token) => {
          resolve(!!token);
        });
      });
    }

    this.isRefreshing = true;
    const refreshToken = localStorage.getItem('refreshToken');

    if (!refreshToken) {
      this.isRefreshing = false;
      return false;
    }

    try {
      const baseUrl = this.getBaseUrl();
      const refreshUrl = `${baseUrl}/api/auth/refresh`;

      const response = await fetch(refreshUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken })
      });

      if (!response.ok) {
        throw new Error('Refresh failed');
      }

      const data = await response.json();
      const newAccessToken = data.accessToken;
      
      store.dispatch(updateAccessToken(newAccessToken));
      
      this.refreshSubscribers.forEach((cb) => cb(newAccessToken));
      this.refreshSubscribers = [];
      this.isRefreshing = false;
      return true;
    } catch (err) {
      this.refreshSubscribers.forEach((cb) => cb(''));
      this.refreshSubscribers = [];
      this.isRefreshing = false;
      return false;
    }
  }

  get<T>(url: string, params?: Record<string, string | number | boolean | undefined>, options: RequestOptions = {}) {
    return this.request<T>(url, { ...options, method: 'GET', params });
  }

  post<T>(url: string, body?: any, options: RequestOptions = {}) {
    return this.request<T>(url, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  }

  put<T>(url: string, body?: any, options: RequestOptions = {}) {
    return this.request<T>(url, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body)
    });
  }

  delete<T>(url: string, options: RequestOptions = {}) {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
}

export const api = new ApiClient();
export default api;
