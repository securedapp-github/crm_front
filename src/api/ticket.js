import { api } from './auth'

export const getTickets = (params = {}) => api.get('/tickets', { params })

export const getTicketById = (id) => api.get(`/tickets/${id}`)

export const createTicket = (data) => {
  if (data instanceof FormData) {
    return api.post('/tickets', data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
  return api.post('/tickets', data)
}

export const updateTicket = (id, data) => api.put(`/tickets/${id}`, data)

export const addTicketComment = (id, data) => {
  if (data instanceof FormData) {
    return api.post(`/tickets/${id}/comments`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
  return api.post(`/tickets/${id}/comments`, data)
}

export const deleteTicket = (id) => api.delete(`/tickets/${id}`)
