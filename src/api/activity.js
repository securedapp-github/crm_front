import { api } from './auth'

export const fetchDashboardStats = (params) => api.get('/activity/dashboard', { params })
export const fetchUserActivity = (userId, params) => api.get(`/activity/user/${userId}`, { params })
export const fetchLiveActivity = () => api.get('/activity/live')
export const exportActivityCSV = (params) => api.get('/activity/export', { params, responseType: 'blob' })
export const fetchAllowedDomains = () => api.get('/activity/allowed-domains')

export const fetchPolicies = () => api.get('/activity/policies')
export const createPolicy = (data) => api.post('/activity/policies', data)
export const updatePolicy = (id, data) => api.put(`/activity/policies/${id}`, data)
export const deletePolicy = (id) => api.delete(`/activity/policies/${id}`)
