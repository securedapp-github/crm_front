import { api } from './auth';

// Marketing Posts
export const getCalendar = (start, end, params = {}) => api.get(`/marketing/calendar?start=${start}&end=${end}`, { params });
export const getPosts = (params) => api.get('/marketing/posts', { params });
export const getPost = (id) => api.get(`/marketing/posts/${id}`);
export const createPost = (data, force = false) => api.post('/marketing/posts', data, {
    headers: force ? { 'x-force': 'true' } : {}
});
export const updatePost = (id, data, force = false) => api.patch(`/marketing/posts/${id}`, data, {
    headers: force ? { 'x-force': 'true' } : {}
});
export const deletePost = (id) => api.delete(`/marketing/posts/${id}`);

// Advanced Features
export const addComment = (id, text) => api.post(`/marketing/posts/${id}/comments`, { text });
export const approvePost = (id) => api.post(`/marketing/posts/${id}/approve`);
export const checkConflict = (data) => api.post('/marketing/conflicts/check', data);
export const getSummary = (start, end) => api.get(`/marketing/summary?start=${start}&end=${end}`);

// Marketing Assets
export const getAssets = () => api.get('/marketing-assets');
export const uploadAsset = (formData) => api.post('/marketing-assets', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
});
export const deleteAsset = (id) => api.delete(`/marketing-assets/${id}`);
export const downloadAsset = (id) => api.get(`/marketing-assets/${id}/download`, { responseType: 'blob' });
