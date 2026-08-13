import { api } from './auth'

// Get all salespeople (admin only)
export const getAllSalespeople = () => api.get('/users/salespeople')

// Offboard a salesperson (admin only)
export const offboardSalesperson = (userId) => api.post(`/users/${userId}/offboard`)

// Get salesperson report (admin only)
export const getSalespersonReport = (salespersonId) => api.get(`/sales/reports/${salespersonId}`)

// Download salesperson report CSV (admin only)
export const downloadSalespersonReportCSV = (salespersonId) =>
    api.get(`/sales/reports/${salespersonId}/csv`, { responseType: 'blob' })

// Permanent delete user (admin only)
export const permanentDeleteUser = (userId) => api.delete(`/users/${userId}/permanent-delete`)

// Get all active users/staff for dropdowns
export const getStaffUsers = ({ signal } = {}) => api.get('/users/staff', { signal })

// Get active employees filtered by department (ops/admin)
export const getEmployeesByDepartment = (department) =>
  api.get('/users/staff', { params: { department } })

// Update user (admin only)
export const updateUser = (userId, data) => api.put(`/users/${userId}`, data)


