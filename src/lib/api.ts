import axios from 'axios';
import { useAuthStore } from '../store/authStore';

// If VITE_API_URL is set, always use it. Otherwise, derive the API host
// from whatever host the browser used to load the app itself — this is
// what makes the SAME build work unmodified from http://localhost:5173,
// http://192.168.x.x:5173 (a tester's PC on the LAN), etc., without each
// person needing their own .env. The API is assumed to run on port 4000
// on that same host.
const inferredApiUrl = `${window.location.protocol}//${window.location.hostname}:4000`;

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? inferredApiUrl,
  withCredentials: true, // send the httpOnly refresh-token cookie
});

// Attach the in-memory access token to every request.
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// On a 401, try refreshing the access token once, then retry the request.
// The refresh endpoint itself is explicitly excluded here — otherwise a
// 401 from /auth/refresh (e.g. no/expired cookie) would trigger another
// call to /auth/refresh through this same interceptor, which recurses
// into itself and never resolves instead of just failing cleanly.
let isRefreshing = false;
let pendingQueue: Array<() => void> = [];
const REFRESH_URL = '/v1/auth/refresh';

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isRefreshCall = originalRequest?.url?.includes(REFRESH_URL);

    if (error.response?.status === 401 && !originalRequest._retry && !isRefreshCall) {
      originalRequest._retry = true;

      if (isRefreshing) {
        // Wait for the in-flight refresh to finish, then retry.
        return new Promise((resolve) => {
          pendingQueue.push(() => resolve(api(originalRequest)));
        });
      }

      isRefreshing = true;
      try {
        const { data } = await api.post(REFRESH_URL);
        // /auth/refresh now returns the user profile too, not just tokens —
        // use it directly instead of trusting whatever (possibly stale, or
        // on a hard reload, null) user is already sitting in the store.
        useAuthStore.getState().setAuth(data.accessToken, data.user);
        pendingQueue.forEach((cb) => cb());
        pendingQueue = [];
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().clearAuth();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);
