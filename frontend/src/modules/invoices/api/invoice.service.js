import api from '../../../utils/api';

export const invoiceService = {
  getInvoices(params = {}) { return api.get('/invoices', { params }); },
  getCustomerInvoices(id) { return api.get(`/invoices/customer/${id}`); },
  searchInvoices(params) { return api.get('/invoices/search', { params }); },
  createInvoice(payload) { return api.post('/invoices', payload); },
  updateInvoice(id, payload) { return api.put(`/invoices/${id}`, payload); },
  deleteInvoice(id) { return api.delete(`/invoices/${id}`); },
  updateStatus(id, field, value) { return api.patch(`/invoices/${id}/status`, { field, value }); },
  getCustomers() { return api.get('/customers'); },
  getCustomersOverview() { return api.get('/customers/overview'); },
  createCustomer(payload) { return api.post('/customers', payload); },
  updateCustomer(id, payload) { return api.put(`/customers/${id}`, payload); },
  updateCustomerProfile(id, payload) { return api.patch(`/customers/${id}/profile`, payload); },
  updateCustomerNotes(id, notes) { return api.patch(`/customers/${id}/notes`, { notes: notes || null }); },
  deleteCustomer(id) { return api.delete(`/customers/${id}`); }
};
