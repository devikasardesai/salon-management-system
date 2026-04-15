import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
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
      localStorage.removeItem("auth_token");
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_URL };
