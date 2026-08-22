/**
 * Typed axios wrapper — attaches JWT, handles token refresh, and provides typed API calls.
 * API base URL configured via VITE_API_URL or defaults to localhost:4000.
 */
import axios from 'axios';

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1',
});

// Attach access token to every request
api.interceptors.request.use(config => {
  const token = localStorage.getItem('dayflow_access');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Auto-refresh on 401
api.interceptors.response.use(
  response => response,
  async error => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('dayflow_refresh');
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${api.defaults.baseURL}/auth/refresh`,
            { refreshToken: refresh }
          );
          localStorage.setItem('dayflow_access', data.accessToken);
          localStorage.setItem('dayflow_refresh', data.refreshToken);
          original.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = '/';
        }
      }
    }
    return Promise.reject(error);
  }
);
