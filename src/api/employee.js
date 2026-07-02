import { api } from './auth'

export const getEmployees = (params) => api.get('/employees', { params })
export const getEmployeeById = (id) => api.get(`/employees/${id}`)
export const createEmployee = (data) => api.post('/employees', data)
export const updateEmployee = (id, data) => api.put(`/employees/${id}`, data)
export const toggleEmployeeStatus = (id) => api.patch(`/employees/${id}/status`)
