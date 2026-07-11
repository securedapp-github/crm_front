import { api } from './auth'

export const generatePayslip = (data) => api.post('/payslips', data)
export const getAllPayslips = (params) => api.get('/payslips', { params })
export const getPayslipById = (id) => api.get(`/payslips/${id}`)
export const updatePayslip = (id, data) => api.put(`/payslips/${id}`, data)
export const deletePayslip = (id) => api.delete(`/payslips/${id}`)
export const getUsersForPayslip = () => api.get('/payslips/users')
export const getLeavePreviewForPayslip = (userId, month, year) => api.get('/payslips/leave-preview', { params: { userId, month, year } })
