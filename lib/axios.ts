import axios from 'axios';
import { getSession } from 'next-auth/react';

// Remove trailing slash from API URL
const API_URL = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || '';

const api = axios.create({
  baseURL: API_URL,
});

api.interceptors.request.use(async (config) => {
  // Adiciona o token JWT nas requisições
  const session = await getSession();
  
  if (session && (session as any).accessToken) {
    config.headers.Authorization = `Bearer ${(session as any).accessToken}`;
  }
  
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Redirect to login on unauthorized
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
