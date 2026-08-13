import { api } from './auth';

// Marketing Posts
export const getCalendar = (start, end, params = {}) => api.get(`/marketing/calendar?start=${start}&end=${end}`, { params });
export const getPosts = (params) => api.get('/marketing/posts', { params });
export const getPost = (id) => api.get(`/marketing/posts/${id}`);
export const createPost = (data) => api.post('/marketing/posts', data);
export const updatePost = (id, data) => api.patch(`/marketing/posts/${id}`, data);
export const deletePost = (id) => api.delete(`/marketing/posts/${id}`);

// Advanced Features
export const addComment = (id, text) => api.post(`/marketing/posts/${id}/comments`, { text });
export const approvePost = (id) => api.post(`/marketing/posts/${id}/approve`);

export const getSummary = (start, end) => api.get(`/marketing/summary?start=${start}&end=${end}`);

