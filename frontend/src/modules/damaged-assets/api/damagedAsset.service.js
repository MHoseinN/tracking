import api from '../../../utils/api';

export const damagedAssetService = {
  getAssets: () => api.get('/damaged-assets'),
  getCandidates: () => api.get('/damaged-assets/candidates'),
  createAsset: (payload) => api.post('/damaged-assets', payload),
  updateAsset: (id, payload) => api.patch(`/damaged-assets/${id}`, payload),
  issueInvoice: (id) => api.post(`/damaged-assets/${id}/invoice`),
  sendInvoice: (id, payload) => api.patch(`/damaged-assets/${id}/send-invoice`, payload),
  downloadInvoice: (id) => api.get(`/damaged-assets/${id}/invoice/pdf`, { params: { transport: 'base64' } }),
  getRepairers: () => api.get('/damaged-assets/repairers'),
  createRepairer: (payload) => api.post('/damaged-assets/repairers', payload),
  updateRepairer: (id, payload) => api.put(`/damaged-assets/repairers/${id}`, payload),
  deleteRepairer: (id) => api.delete(`/damaged-assets/repairers/${id}`),
  getPayments: (id) => api.get(`/damaged-assets/repairers/${id}/payments`),
  recordPayment: (id, payload) => api.post(`/damaged-assets/repairers/${id}/payments`, payload)
};
