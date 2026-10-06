import axios from 'axios';
import { tokenStorage } from '../utils/tokenStorage';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 15000,
});

let onUnauthorized = () => {};

/** Registered by AuthProvider: called when the API rejects the session (expired/invalid token). */
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

http.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

http.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) onUnauthorized();
    return Promise.reject(error);
  },
);

/** Unwraps the { success, data, pagination } envelope. */
export const unwrap = (response) => response.data.data;
export const unwrapPage = (response) => ({ data: response.data.data, pagination: response.data.pagination });

export default http;
