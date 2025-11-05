import { api } from './auth'

export const getQuotes = (params = {}) => api.get('/quotes', { params })
export const createQuote = (data) => api.post('/quotes', data)
export const updateQuote = (id, data) => api.put(`/quotes/${id}`, data)
export const deleteQuote = (id) => api.delete(`/quotes/${id}`)
