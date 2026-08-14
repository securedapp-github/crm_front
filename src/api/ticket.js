import { api } from './auth'

export const getTickets = (params = {}, { signal } = {}) => api.get('/tickets', { params, signal })

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

// Ops/Admin: route a query to a department and/or specific employee
export const routeTicket = (id, { assignedDepartment, assignedToId }) =>
  api.put(`/tickets/${id}`, {
    assignedDepartment: assignedDepartment || null,
    assignedToId: assignedToId || null,
    status: 'In Progress'
  })

// Ops/Admin: re-route to a department only (clears assignee, keeps status)
export const rerouteTicket = (id, department) =>
  api.put(`/tickets/${id}`, {
    assignedDepartment: department || null,
    assignedToId: null
  })

// Team member: mark assigned query as finished (moves to Pending Ops Review)
export const markTicketDone = (id) =>
  api.put(`/tickets/${id}`, { status: 'Pending Ops Review' })

// Ops: send the final response email to the visitor & mark resolved
export const sendResolutionReply = (id, { replyMessage, replySubject }) =>
  api.put(`/tickets/${id}`, {
    status: 'Resolved',
    replyMessage,
    replySubject
  })

export const addTicketComment = (id, data) => {
  if (data instanceof FormData) {
    return api.post(`/tickets/${id}/comments`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  }
  return api.post(`/tickets/${id}/comments`, data)
}

export const deleteTicket = (id) => api.delete(`/tickets/${id}`)
