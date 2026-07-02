const API_BASE = '/local-api';

const fetchJSON = async (url, options = {}) => {
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }
  return res.json();
};

const createEntityClient = (entityName) => ({
  list: (sort, limit) => {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    if (limit) params.set('limit', limit);
    return fetchJSON(`${API_BASE}/${entityName}?${params}`);
  },
  filter: (filters) =>
    fetchJSON(`${API_BASE}/${entityName}/filter`, {
      method: 'POST',
      body: JSON.stringify(filters || {}),
    }),
  get: (id) => fetchJSON(`${API_BASE}/${entityName}/${id}`),
  create: (data) =>
    fetchJSON(`${API_BASE}/${entityName}`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id, data) =>
    fetchJSON(`${API_BASE}/${entityName}/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id) =>
    fetchJSON(`${API_BASE}/${entityName}/${id}`, {
      method: 'DELETE',
    }),
});

export const invoiceApi = {
  entities: {
    Invoice: createEntityClient('Invoice'),
    Customer: createEntityClient('Customer'),
    Business: createEntityClient('Business'),
    Product: createEntityClient('Product'),
    Payment: createEntityClient('Payment'),
  },
  auth: {
    me: async () => null,
    logout: () => {},
    redirectToLogin: () => {},
  },
  integrations: {
    Core: {
      UploadFile: async ({ file }) => {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${API_BASE}/upload`, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) {
          const err = await res.text();
          throw new Error(`Upload error ${res.status}: ${err}`);
        }
        return res.json();
      },
    },
  },
};
