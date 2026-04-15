import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({
  baseURL: `${API_URL}/api`,
  withCredentials: true,
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const isAdminPage = window.location.pathname.startsWith("/admin") && !window.location.pathname.includes("/admin/login");
    if (err.response?.status === 401 && isAdminPage) {
      window.location.href = "/admin/login";
    }
    return Promise.reject(err);
  }
);

export default api;
export { API_URL };
