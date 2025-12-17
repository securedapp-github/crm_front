import { api } from './auth';

export const getSequences = () => api.get('/marketing/sequences');
export const getSequence = (id) => api.get(`/marketing/sequences/${id}`);
export const createSequence = (data) => api.post('/marketing/sequences', data);
export const updateSequence = (id, data) => api.put(`/marketing/sequences/${id}`, data);
export const deleteSequence = (id) => api.delete(`/marketing/sequences/${id}`);

export const addStep = (seqId, data) => api.post(`/marketing/sequences/${seqId}/steps`, data);
export const deleteStep = (stepId) => api.delete(`/marketing/sequences/steps/${stepId}`);

export const updateStep = (stepId, data) => api.put(`/marketing/sequences/steps/${stepId}`, data);
export const reorderSteps = (seqId, steps) => api.post(`/marketing/sequences/${seqId}/reorder`, { steps });
export const enrollAudience = (data) => api.post('/marketing/sequences/enroll-audience', data);
export const getSequenceStats = (id) => api.get(`/marketing/sequences/${id}/stats`);
export const getSequenceSubscribers = (id) => api.get(`/marketing/sequences/${id}/subscribers`);

export const enrollLead = (data) => api.post('/marketing/enroll', data);
export const stopSequence = (data) => api.post('/marketing/stop-sequence', data);
