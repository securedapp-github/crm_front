import { api } from './auth'

export const getDeals = () => api.get('/deals')
export const getDeal = (id) => api.get(`/deals/${id}`)
export const createDeal = (data) => api.post('/deals', data)
export const updateDeal = (id, data) => api.put(`/deals/${id}`, data)
export const deleteDeal = (id) => api.delete(`/deals/${id}`)
export const updateDealNotes = (id, notes) => api.put(`/deals/${id}`, { notes })
