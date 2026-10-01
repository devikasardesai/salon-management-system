import axios from "axios";

const API_URL = process.env.REACT_APP_BACKEND_URL;
const api = axios.create({
  baseURL: `${API_URL}/api`,
});

export default api;
export { API_URL };
