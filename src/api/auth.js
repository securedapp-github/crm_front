import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
})

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
export const loginSales = (data) => api.post('/auth/login-sales', data)
// Admin OTP signup flow
export const signupAdminStart = (data) => api.post('/auth/signup-admin-start', data)
export const verifyAdminOtp = (data) => api.post('/auth/verify-admin-otp', data)
export const resendAdminOtp = (data) => api.post('/auth/resend-admin-otp', data)
export const loginAdmin = (data) => api.post('/auth/login-admin', data)
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