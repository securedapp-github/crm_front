import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    withCredentials: true
});

export const getMessages = (params) => api.get('/mbti/conversations', { params });
export const getMessage = (id) => api.get(`/mbti/conversations/${id}`);
export const sendReply = (id, body, agentId, files = []) => {
    const formData = new FormData();
    formData.append('conversation_id', id);
    formData.append('body', body || '');
    formData.append('sender_type', 'agent');
    formData.append('sender_id', String(agentId));

    // Append each file to the 'attachments' field
    if (files && files.length > 0) {
        files.forEach(file => {
            formData.append('attachments', file);
        });
    }

    return api.post(`/mbti/messages`, formData, {
        headers: {
            'Content-Type': 'multipart/form-data'
        }
    });
};
export const assignMessage = (id, agentId) => api.patch(`/mbti/conversations/${id}/assign`, { agent_id: agentId });
export const updateMessageStatus = (id, status) => api.patch(`/mbti/conversations/${id}/status`, { status });
export const setViewingStatus = (id, viewing) => api.post(`/mbti/conversations/${id}/${viewing ? 'open' : 'close'}`);
export const getInboxStats = () => api.get('/mbti/stats'); // Note: Stats not yet implemented in modular backend, placeholder.


export default {
    getMessages,
    getMessage,
    sendReply,
    assignMessage,
    updateMessageStatus,
    setViewingStatus,
    getInboxStats
};
