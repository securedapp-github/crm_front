import { api } from './auth'

export const getPipeline = () => api.get('/sales/deals')
export const moveDealStage = (id, stage) => api.patch(`/sales/deals/${id}/stage`, { stage })
export const markDealDone = (id) => api.post(`/sales/deals/${id}/complete`)
export const getCompletedDeals = (params) => api.get('/sales/completed-deals', { params })
export const getOverview = () => api.get('/sales/overview')
export const deleteDeal = (id) => api.delete(`/sales/${id}`)
export const getDeletedDeals = () => api.get('/deals/deleted')
export const getPeople = () => api.get('/sales/people')
export const sendSalesEmail = (payload) => api.post('/sales/email', payload)
export const getSalesEmailHistory = () => api.get('/sales/email-history')
