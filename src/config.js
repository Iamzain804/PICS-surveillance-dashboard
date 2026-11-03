// Central API Configuration
// Environment variable VITE_API_BASE overrides default localhost URL for production / QA deployment
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8000';
export const API = API_BASE;
