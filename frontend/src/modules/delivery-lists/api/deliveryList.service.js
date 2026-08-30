import api from '../../../utils/api';

async function downloadPdf(path) {
  const token = localStorage.getItem('token');
  const response = await fetch(`${path}?transport=base64`, {
    method: 'GET',
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    }
  });

  if (!response.ok) {
    let data = {};
    try { data = await response.json(); }
    catch { data = { message: `PDF request failed (${response.status})` }; }
    if (response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') window.location.replace('/login');
    }
    const error = new Error(data.message || `PDF request failed (${response.status})`);
    error.response = { status: response.status, data };
    throw error;
  }

  const payload = await response.json();
  if (!payload.data_base64) throw new Error('پاسخ PDF از سرور خالی است');
  let binary;
  try { binary = atob(payload.data_base64); }
  catch { throw new Error('داده PDF دریافت‌شده قابل خواندن نیست'); }
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return {
    data: new Blob([bytes], { type: payload.content_type || 'application/pdf' }),
    filename: payload.filename
  };
}

export const deliveryListService = {
  getLists(etag = '') {
    return api.get('/delivery-lists', {
      headers: etag ? { 'If-None-Match': etag } : {},
      validateStatus: (status) => (status >= 200 && status < 300) || status === 304
    });
  },
  getDrafts() { return api.get('/delivery-lists/drafts'); },
  subscribeToChanges(onChange) {
    const controller = new AbortController();
    let stopped = false;
    let connectedOnce = false;

    const wait = (milliseconds) => new Promise((resolve) => window.setTimeout(resolve, milliseconds));
    const connect = async () => {
      while (!stopped) {
        try {
          const token = localStorage.getItem('token');
          if (!token) return;
          const response = await fetch('/api/delivery-lists/events', {
            method: 'GET',
            cache: 'no-store',
            signal: controller.signal,
            headers: { Accept: 'text/event-stream', Authorization: `Bearer ${token}` }
          });
          if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/login') window.location.replace('/login');
            return;
          }
          if (!response.ok || !response.body) throw new Error(`Live updates failed (${response.status})`);
          if (connectedOnce) onChange({ action: 'RECONNECTED' });
          connectedOnce = true;

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';
          while (!stopped) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
            let boundary = buffer.indexOf('\n\n');
            while (boundary !== -1) {
              const block = buffer.slice(0, boundary);
              buffer = buffer.slice(boundary + 2);
              const data = block.split('\n').filter((line) => line.startsWith('data:'))
                .map((line) => line.slice(5).trim()).join('\n');
              if (data) {
                try { onChange(JSON.parse(data)); } catch { /* Ignore malformed live events. */ }
              }
              boundary = buffer.indexOf('\n\n');
            }
          }
        } catch (error) {
          if (stopped || error?.name === 'AbortError') return;
        }
        if (!stopped) await wait(3000);
      }
    };

    void connect();
    return () => { stopped = true; controller.abort(); };
  },
  getDraft(id) { return api.get(`/delivery-lists/${id}`); },
  createDraft() { return api.post('/delivery-lists/drafts'); },
  saveDraft(id, payload) { return api.put(`/delivery-lists/${id}/draft`, payload); },
  deleteDraft(id) { return api.delete(`/delivery-lists/${id}/draft`); },
  deleteList(id) { return api.delete(`/delivery-lists/${id}/draft`); },
  finalizeDraft(id, version) { return api.post(`/delivery-lists/${id}/finalize`, { version }); },
  recordReturn(id, payload) { return api.post(`/delivery-lists/${id}/returns`, payload); },
  getInvoicePreview(id) { return api.get(`/delivery-lists/${id}/invoice-preview`); },
  issueInvoice(id, payload) { return api.post(`/delivery-lists/${id}/invoices`, payload); },
  getInvoice(id, invoiceId) { return api.get(`/delivery-lists/${id}/invoices/${invoiceId}`); },
  updateInvoice(id, invoiceId, payload) {
    return api.put(`/delivery-lists/${id}/invoices/${invoiceId}`, payload);
  },
  updateInvoiceSendStatus(id, invoiceId, payload) {
    return api.patch(`/delivery-lists/${id}/invoices/${invoiceId}/send-status`, payload);
  },
  getSettlement(id) { return api.get(`/delivery-lists/${id}/settlement`); },
  recordPayment(id, payload) { return api.post(`/delivery-lists/${id}/payments`, payload); },
  voidPayment(id, paymentId) { return api.post(`/delivery-lists/${id}/payments/${paymentId}/void`); },
  async downloadInvoicePdf(id, invoiceId) {
    return downloadPdf(`/api/delivery-lists/${id}/invoices/${invoiceId}/pdf`);
  },
  async downloadProformaPdf(id) {
    return downloadPdf(`/api/delivery-lists/${id}/proforma/pdf`);
  }
};
