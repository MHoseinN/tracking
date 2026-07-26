import api from '../../../utils/api';

export const inventoryService = {
  getDashboard(params = {}) { return api.get('/inventory/dashboard', { params }); },
  getLookups(params = {}) { return api.get('/inventory/lookups', { params }); },
  getActiveReservations() { return api.get('/inventory/reservations/active'); },
  createProduct(payload) { return api.post('/inventory/products', payload); },
  updateProduct(id, payload) { return api.put(`/inventory/products/${id}`, payload); },
  deleteProduct(id) { return api.delete(`/inventory/products/${id}`); },
  createCategory(payload) { return api.post('/inventory/categories', payload); },
  updateCategory(id, payload) { return api.put(`/inventory/categories/${id}`, payload); },
  deleteCategory(id) { return api.delete(`/inventory/categories/${id}`); },
  createReservation(payload) { return api.post('/inventory/reservations', payload); },
  updateReservationOrder(id, payload) { return api.put(`/inventory/reservations/${id}`, payload); },
  updateUnitAssignment(id, payload) { return api.put(`/inventory/units/${id}/assignment`, payload); },
  deleteUnitAssignment(id, reservationItemId) { return api.delete(`/inventory/units/${id}/assignment`, { params: { reservationItemId } }); },
  restoreUnitAssignment(id, reservationItemId) { return api.post(`/inventory/units/${id}/assignment/restore`, null, { params: { reservationItemId } }); },
  releaseReservationOrder(id) { return api.post(`/inventory/reservations/${id}/release`); },
  restoreReservationOrder(id) { return api.post(`/inventory/reservations/${id}/restore`); },
  releaseAllReservations() { return api.post('/inventory/reservations/release-all'); },
  restoreAllReservations() { return api.post('/inventory/reservations/restore-all'); }
};
