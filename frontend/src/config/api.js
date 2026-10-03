/**
 * API Configuration for FlowSight Frontend
 * In development, requests use Vite's proxy by default when VITE_API_BASE_URL is not set.
 * In production (e.g. deployed on Vercel), set VITE_API_BASE_URL to your Render backend URL:
 * e.g. VITE_API_BASE_URL=https://flowsight-backend.onrender.com
 */
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '');

/**
 * Returns the fully-qualified API URL for a given endpoint path.
 * @param {string} endpoint - API endpoint (e.g. '/api/analyze')
 * @returns {string} - Full URL or relative path
 */
export const getApiUrl = (endpoint) => {
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${API_BASE_URL}${path}`;
};

export default API_BASE_URL;
