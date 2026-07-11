const getApiBase = () => {
  const viteApiUrl = import.meta.env.VITE_API_URL;
  if (viteApiUrl) {
    try {
      const url = new URL(viteApiUrl);
      return `${url.origin}/local-api`;
    } catch (e) {
      return '/local-api';
    }
  }
  return '/local-api';
};

const API_BASE = getApiBase();

const fetchJSON = async (url, options = {}) => {
  const { timeout = 10000 } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      signal: controller.signal,
      ...options,
    });
    clearTimeout(id);

    if (!res.ok) {
      let errMsg = `Request failed with status ${res.status}`;
      try {
        const contentType = res.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const jsonErr = await res.json();
          errMsg = jsonErr.message || jsonErr.error || errMsg;
        } else {
          const textErr = await res.text();
          if (textErr && textErr.length < 150 && !textErr.includes('<!DOCTYPE html>')) {
            errMsg = textErr;
          }
        }
      } catch (_) {}
      throw new Error(errMsg);
    }
    return res.json();
  } catch (err) {
    clearTimeout(id);
    console.error('API request error:', err.message);
    throw new Error(err.message || 'An unexpected connection error occurred');
  }
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
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000);

        try {
          const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData,
            credentials: 'include',
            signal: controller.signal,
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            let errMsg = `Upload failed with status ${res.status}`;
            try {
              const contentType = res.headers.get('content-type');
              if (contentType && contentType.includes('application/json')) {
                const jsonErr = await res.json();
                errMsg = jsonErr.message || jsonErr.error || errMsg;
              } else {
                const textErr = await res.text();
                if (textErr && textErr.length < 150 && !textErr.includes('<!DOCTYPE html>')) {
                  errMsg = textErr;
                }
              }
            } catch (_) {}
            throw new Error(errMsg);
          }
          return res.json();
        } catch (err) {
          clearTimeout(timeoutId);
          console.error('File upload error:', err.message);
          throw new Error(err.message || 'An error occurred during file upload');
        }
      },
    },
  },
};
