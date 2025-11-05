import { api } from './auth'

export const getNotes = () => api.get('/notes')
export const createNote = (data) => api.post('/notes', data)
export const deleteNote = (id) => api.delete(`/notes/${id}`)
