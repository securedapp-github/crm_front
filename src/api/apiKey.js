import { api } from './auth';
import axios from 'axios';

// Base API endpoint determination
const getApiBaseUrl = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api';
  }
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
};

// CRM Internal Management Endpoints (authenticated via JWT)
export const getApiKeys = () => api.get('/api-keys');
export const createApiKey = (data) => api.post('/api-keys', data);
export const revokeApiKey = (id) => api.delete(`/api-keys/${id}`);
export const testApiKeyConnection = (apiKey) => api.post('/api-keys/test', { apiKey });

// External Ticket Submission (Direct test simulation using x-api-key)
export const testExternalTicketSubmission = async (payload, apiKey) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/tickets/external`;

  const headers = {
    'x-api-key': apiKey
  };

  if (payload instanceof FormData) {
    headers['Content-Type'] = 'multipart/form-data';
    return axios.post(url, payload, { headers });
  }

  headers['Content-Type'] = 'application/json';
  return axios.post(url, payload, { headers });
};

// External Lead Submission (Direct test simulation using x-api-key)
export const testExternalLeadSubmission = async (payload, apiKey) => {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl.replace(/\/$/, '')}/leads/external`;

  return axios.post(url, payload, {
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey
    }
  });
};
