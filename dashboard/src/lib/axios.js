import axios from 'axios';

// Use same-origin relative URL so all requests pass through Astro server action/proxy
const API_URL = import.meta.env.PUBLIC_API_URL || '';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;
