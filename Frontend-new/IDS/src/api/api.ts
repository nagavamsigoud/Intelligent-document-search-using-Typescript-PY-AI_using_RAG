import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
});

// Automatically add the Bearer token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token'); // Ensure the string 'access_token' matches your login storage key
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;