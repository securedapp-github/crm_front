import { api } from './auth'

export const getPipeline = () => api.get('/sales/deals')
export const moveDealStage = (id, stage) => api.patch(`/sales/deals/${id}/stage`, { stage })
export const getOverview = () => api.get('/sales/overview')
export const getPeople = () => api.get('/sales/people')
