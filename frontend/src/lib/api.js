import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

// Use sessionStorage (cleared on tab close) instead of localStorage (persists forever)
const TOKEN_KEY = "auth_token";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}
export function setToken(token) {
  sessionStorage.setItem(TOKEN_KEY, token);
}
export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAdminPage = window.location.pathname.startsWith("/admin") && !window.location.pathname.includes("/admin/login");
    if (err.response?.status === 401 && isAdminPage) {
      clearToken();
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_URL };
