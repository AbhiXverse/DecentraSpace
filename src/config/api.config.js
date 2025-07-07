// src/config/api.config.js
const isDevelopment = import.meta.env.DEV;

// API base URL - automatically switches between local and production
export const API_BASE_URL = isDevelopment 
  ? 'http://localhost:3001/api' 
  : '/api';

// API endpoints
export const API_ENDPOINTS = {
  createRoom: `${API_BASE_URL}/create-room`,
  accessToken: `${API_BASE_URL}/access-token`,
  health: `${API_BASE_URL}/health`
};
