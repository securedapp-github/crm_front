import { api } from './auth';

export const getAssets = () => api.get('/marketing/assets');
export const uploadAsset = (formData) => api.post('/marketing/assets', formData, {
    headers: {
        'Content-Type': 'multipart/form-data'
    }
});
export const deleteAsset = (id) => api.delete(`/marketing/assets/${id}`);

export const downloadAsset = (id) => api.get(`/marketing/assets/${id}/download`, {
    responseType: 'blob'
});
