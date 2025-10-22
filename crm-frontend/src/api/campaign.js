import { api } from './auth'

export const getCampaigns = () => api.get('/campaigns')
export const createCampaign = (data) => api.post('/campaigns', data)
export const getCampaign = (id) => api.get(`/campaigns/${id}`)
export const updateCampaign = (id, data) => api.put(`/campaigns/${id}`, data)
export const getCampaignLeads = (id) => api.get(`/campaigns/${id}/leads`)
export const captureLead = (id, data) => api.post(`/campaigns/${id}/capture`, data)
export const deleteCampaign = (id) => api.delete(`/campaigns/${id}`)
