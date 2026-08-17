import axios from 'axios'

const getBaseApiUrl = () => {
  if (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
    return 'http://localhost:5000/api'
  }
  if (import.meta.env.VITE_API_URL) {
    const raw = import.meta.env.VITE_API_URL.trim()
    return raw.endsWith('/api') ? raw : `${raw.replace(/\/$/, '')}/api`
  }
  return `${window.location.origin}/api`
}

const API = getBaseApiUrl()

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
  timeout: 60000
})

// Request interceptor to attach X-Panel-Type header for session isolation
api.interceptors.request.use((config) => {
  const localUser = JSON.parse(localStorage.getItem('user') || 'null');
  if (localUser && localUser.role) {
    config.headers['X-Panel-Type'] = localUser.role.toLowerCase().includes('admin') ? 'admin' : 'team';
  }
  return config;
}, (error) => Promise.reject(error));


// Centralized safe GET request retry interceptor
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const { config } = error;
    if (!config || !config.retryCount) {
      config.retryCount = 0;
    }
    // Only retry GET requests on network errors or 502/503/504 gateway errors
    const isRetryable = config.method === 'get' && (!error.response || [502, 503, 504].includes(error.response.status));
    if (isRetryable && config.retryCount < 2) {
      config.retryCount += 1;
      // Exponential backoff: 1s, 2s
      await new Promise((resolve) => setTimeout(resolve, config.retryCount * 1000));
      return api(config);
    }
    return Promise.reject(error);
  }
);

export const registerUser = (data) => api.post('/auth/signup', data)
export const verifyOTP = (data) => api.post('/auth/verify-otp', data)
export const resendOTP = (data) => api.post('/auth/resend-otp', data)
export const loginUser = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')
export const logout = () => api.post('/auth/logout')
export const signupSales = (data) => api.post('/auth/signup-sales', data)
export const loginSales = (data) => api.post('/auth/login-sales', data, { headers: { 'X-Panel-Type': 'team' } })
// Admin OTP signup flow
export const signupAdminStart = (data) => api.post('/auth/signup-admin-start', data)
export const verifyAdminOtp = (data) => api.post('/auth/verify-admin-otp', data)
export const resendAdminOtp = (data) => api.post('/auth/resend-admin-otp', data)
export const loginAdmin = (data) => api.post('/auth/login-admin', data, { headers: { 'X-Panel-Type': 'admin' } })
// Sales OTP signup flow
export const signupSalesStart = (data) => api.post('/auth/signup-sales-start', data)
export const verifySalesOtp = (data) => api.post('/auth/verify-sales-otp', data)
export const resendSalesOtp = (data) => api.post('/auth/resend-sales-otp', data)
export const requestPasswordReset = (email) => api.post('/auth/forgot-password', { email })
export const resetPassword = (payload) => api.post('/auth/reset-password', payload)
export const requestForgotPasswordOtp = (email) => api.post('/auth/forgot-password-otp', { email })
export const resetPasswordWithOtp = (payload) => api.post('/auth/reset-password-otp', payload)
export const resendForgotOtp = (email) => api.post('/auth/resend-forgot-otp', { email })
export const permanentLogout = () => api.delete('/users/permanent-logout')
export const changePassword = (data) => api.post('/auth/change-password', data)