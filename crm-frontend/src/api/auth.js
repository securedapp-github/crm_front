import axios from 'axios'

const API = import.meta.env.VITE_API_URL

export const api = axios.create({
  baseURL: API,
  withCredentials: true,
})

export const registerUser = (data) => api.post('/auth/signup', data)
export const verifyOTP = (data) => api.post('/auth/verify-otp', data)
export const resendOTP = (data) => api.post('/auth/resend-otp', data)
export const loginUser = (data) => api.post('/auth/login', data)
export const getMe = () => api.get('/auth/me')
export const logout = () => api.post('/auth/logout')
export const signupSales = (data) => api.post('/auth/signup-sales', data)
export const loginSales = (data) => api.post('/auth/login-sales', data)
export const requestPasswordReset = (email) => api.post('/auth/forgot-password', { email })
export const resetPassword = (payload) => api.post('/auth/reset-password', payload)