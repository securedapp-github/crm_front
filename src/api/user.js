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
