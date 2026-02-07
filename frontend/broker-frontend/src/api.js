import axios from "axios";

const apiBase = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: apiBase,
  timeout: 15000
});

export default api;
