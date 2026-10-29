const getApiBase = () => {
  const browserHost = typeof window !== 'undefined' ? window.location.hostname : '';
  if (['localhost', '127.0.0.1', '::1'].includes(browserHost.toLowerCase())) {
    return '/local-api';
  }
  const viteApiUrl = (import.meta.env.VITE_API_URL || '').trim();
  if (viteApiUrl) {
    try {
      const url = new URL(viteApiUrl);
      if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase())) {
        return `${url.origin}/local-api`;
      }
    } catch (_) {}
  }
  return 'https://crm.securedapp.io/local-api';
};

const API_BASE = getApiBase();

const getAuthHeaders = () => {
  const headers = {};
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const localUser = JSON.parse(rawUser);
      if (localUser && localUser.role) {
        headers['X-Panel-Type'] = localUser.role.toLowerCase().includes('admin') ? 'admin' : 'team';
      }
    }
  } catch (_) {}

  if (!headers['X-Panel-Type']) {
    headers['X-Panel-Type'] = 'admin';
  }

  try {
    const token = localStorage.getItem('token') || localStorage.getItem('authToken');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
  } catch (_) {}

  return headers;
};

const fetchJSON = async (url, options = {}) => {
  const { timeout = 10000, headers: customHeaders = {}, ...restOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, {
      credentials: 'include',
      signal: controller.signal,
      ...restOptions,
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
        ...customHeaders,
      },
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
      const err = new Error(errMsg);
      err.status = res.status;
      throw err;
    }
    return res.json();
  } catch (err) {
    clearTimeout(id);
    console.error('API request error:', err.message);
    const rethrow = new Error(err.message || 'An unexpected connection error occurred');
    rethrow.status = err.status;
    throw rethrow;
  }
};

const createEntityClient = (entityName) => ({
  list: (sort, limit) => {
    const params = new URLSearchParams();
    if (sort) params.set('sort', sort);
    if (limit) params.set('limit', limit);
    const queryString = params.toString();
    return fetchJSON(`${API_BASE}/${entityName}${queryString ? `?${queryString}` : ''}`);
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
    RecurringInvoice: createEntityClient('RecurringInvoice'),
  },
  triggerRecurringRun: (id) =>
    fetchJSON(`${API_BASE}/recurring-invoices/${id}/trigger-run`, { method: 'POST' }),
  sweepRecurringInvoices: () =>
    fetchJSON(`${API_BASE}/recurring-invoices/sweep`, { method: 'POST' }),
  downloadMonthlyZip: async (month) => {
    const url = `${API_BASE}/recurring-invoices/export/${month}`;
    const res = await fetch(url, {
      credentials: 'include',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      let msg = `Monthly export failed: HTTP ${res.status}`;
      try {
        const j = await res.json();
        if (j.error) msg = j.error;
      } catch (_) {}
      throw new Error(msg);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = `Invoices-${month}.zip`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  },
  recordPayment: async (invoiceId, paymentData, invoiceContext) => {
    try {
      return await fetchJSON(`${API_BASE}/invoice/${invoiceId}/record-payment`, {
        method: 'POST',
        body: JSON.stringify(paymentData),
      });
    } catch (err) {
      if (err.status === 404 || (err.message && err.message.includes('404'))) {
        const payAmt = Number(paymentData.amount) || 0;
        const paymentRecord = await invoiceApi.entities.Payment.create({
          invoice_id: invoiceId,
          invoice_number: invoiceContext?.invoice_number || '',
          customer_id: invoiceContext?.customer_id || '',
          customer_name: invoiceContext?.customer_name || '',
          amount: payAmt,
          payment_date: paymentData.payment_date || new Date().toISOString().split('T')[0],
          payment_method: paymentData.payment_method || 'bank_transfer',
          reference_number: paymentData.reference_number || '',
          notes: paymentData.notes || '',
        });

        const grandTotal = Number(invoiceContext?.grand_total) || 0;
        const currentPaid = Number(invoiceContext?.amount_paid) || 0;
        const newPaid = Number((currentPaid + payAmt).toFixed(2));
        const newBalance = Math.max(0, Number((grandTotal - newPaid).toFixed(2)));
        const newStatus = newBalance <= 0 ? 'paid' : 'partially_paid';

        const updatedInvoice = await invoiceApi.entities.Invoice.update(invoiceId, {
          amount_paid: newPaid,
          balance_due: newBalance,
          status: newStatus,
        });

        return { success: true, payment: paymentRecord, invoice: updatedInvoice };
      }
      throw err;
    }
  },
  getPublicInvoice: (id) => fetchJSON(`${API_BASE}/public/invoice/${id}`),
  getInvoicePdfUrl: (id) => `${API_BASE}/public/invoice/${id}/pdf`,
  downloadVectorPdf: async (id, filename) => {
    const url = `${API_BASE}/public/invoice/${id}/pdf`;
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) {
      throw new Error(`Vector PDF download failed: HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = filename || `Invoice-${id}.pdf`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
  },
  previewVectorPdf: async (invoice, business, filename) => {
    const url = `${API_BASE}/public/invoice/preview-pdf`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoice, business }),
      credentials: 'include'
    });
    if (!res.ok) {
      throw new Error(`Preview vector PDF generation failed: HTTP ${res.status}`);
    }
    const blob = await res.blob();
    const blobUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = blobUrl;
    link.download = filename || `Invoice-${invoice.invoice_number || 'draft'}.pdf`;
    document.body.appendChild(link);
    link.click();
    setTimeout(() => {
      if (document.body.contains(link)) document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    }, 1000);
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
            headers: {
              ...getAuthHeaders(),
            },
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
