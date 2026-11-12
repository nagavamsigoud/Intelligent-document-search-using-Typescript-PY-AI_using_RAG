import axios from "axios";

const authBaseURL = import.meta.env.VITE_AUTH_API_URL || "http://localhost:8000/api";
const aiBaseURL = import.meta.env.VITE_AI_API_URL || "http://localhost:8001";

export const authApi = axios.create({
  baseURL: authBaseURL,
});

export const aiApi = axios.create({
  baseURL: aiBaseURL,
});

export function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Dynamically check localStorage on EVERY request execution path
authApi.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});