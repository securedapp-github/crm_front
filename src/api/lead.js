import { api } from './auth'

export const getLeads = () => api.get('/leads')
export const createLead = (data) => api.post('/leads', data)
export const updateLead = (id, data) => api.put(`/leads/${id}`, data)
export const deleteLead = (id) => api.delete(`/leads/${id}`)
export const assignLead = (payload) => api.post('/leads/assign', payload)
export const convertLead = (id) => api.post(`/leads/convert/${id}`)
export const importLeads = (payload) => api.post('/leads/import', payload)
export const getLeadActivities = (id) => api.get(`/leads/${id}/activities`)
export const addLeadActivity = (id, data) => api.post(`/leads/${id}/activities`, data)
export const getLeadTimeline = (id) => api.get(`/leads/${id}/timeline`)
