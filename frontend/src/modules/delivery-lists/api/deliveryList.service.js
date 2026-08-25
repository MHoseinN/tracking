import api from '../../../utils/api';

export const deliveryListService = {
  getLists() { return api.get('/delivery-lists'); },
  getDrafts() { return api.get('/delivery-lists/drafts'); },
  getDraft(id) { return api.get(`/delivery-lists/${id}`); },
  createDraft() { return api.post('/delivery-lists/drafts'); },
  saveDraft(id, payload) { return api.put(`/delivery-lists/${id}/draft`, payload); },
  deleteDraft(id) { return api.delete(`/delivery-lists/${id}/draft`); },
  finalizeDraft(id, version) { return api.post(`/delivery-lists/${id}/finalize`, { version }); },
  recordReturn(id, payload) { return api.post(`/delivery-lists/${id}/returns`, payload); },
  getInvoicePreview(id) { return api.get(`/delivery-lists/${id}/invoice-preview`); },
  issueInvoice(id, payload) { return api.post(`/delivery-lists/${id}/invoices`, payload); },
  getInvoice(id, invoiceId) { return api.get(`/delivery-lists/${id}/invoices/${invoiceId}`); },
  updateInvoice(id, invoiceId, payload) {
    return api.put(`/delivery-lists/${id}/invoices/${invoiceId}`, payload);
  },
  getSettlement(id) { return api.get(`/delivery-lists/${id}/settlement`); },
  recordPayment(id, payload) { return api.post(`/delivery-lists/${id}/payments`, payload); },
  voidPayment(id, paymentId) { return api.post(`/delivery-lists/${id}/payments/${paymentId}/void`); },
  async downloadInvoicePdf(id, invoiceId) {
    const token = localStorage.getItem('token');
    const response = await fetch(`/api/delivery-lists/${id}/invoices/${invoiceId}/pdf?transport=base64`, {
      method: 'GET',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      let data = {};
      try {
        data = await response.json();
      } catch {
        data = { message: `PDF request failed (${response.status})` };
      }

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
    try {
      binary = atob(payload.data_base64);
    } catch {
      throw new Error('داده PDF دریافت‌شده قابل خواندن نیست');
    }

    const bytes = new Uint8Array(binary.length);
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }

    return {
      data: new Blob([bytes], { type: payload.content_type || 'application/pdf' }),
      filename: payload.filename
    };
  }
};
