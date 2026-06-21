import { api } from './auth'

export const createLeaveRequest = (data) => api.post('/leave', data)
export const getMyLeaves = () => api.get('/leave/my')
export const getLeaveSummary = (params) => api.get('/leave/summary', { params })
export const getAllLeaves = (params) => api.get('/leave', { params })
export const approveLeave = (id, data) => api.put(`/leave/${id}/approve`, data)
export const rejectLeave = (id, data) => api.put(`/leave/${id}/reject`, data)
export const assignLeave = (data) => api.post('/leave/assign', data)
