import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor to attach the correct token based on the route context
api.interceptors.request.use((config) => {
  // If the request URL starts with /s/, it's a visitor route
  if (config.url?.startsWith('/s/')) {
    const visitorToken = localStorage.getItem('visitor_token');
    if (visitorToken) {
      config.headers.Authorization = `Bearer ${visitorToken}`;
    }
  } else {
    // Otherwise, it's an owner route
    const ownerToken = localStorage.getItem('owner_token');
    if (ownerToken) {
      config.headers.Authorization = `Bearer ${ownerToken}`;
    }
  }
  return config;
});
