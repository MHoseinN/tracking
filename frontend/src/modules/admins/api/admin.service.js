import api from '../../../utils/api';

export function getAdmins() {
  return api.get('/admins');
}

export function getAdminPerformance(id, params = {}) {
  return api.get(`/admins/${id}/performance`, { params });
}

export function createAdmin(payload) {
  return api.post('/admins', payload);
}

export function updateAdmin(id, payload) {
  return api.put(`/admins/${id}`, payload);
}

export function updateAdminStatus(id, isActive) {
  return api.patch(`/admins/${id}/status`, { is_active: isActive });
}

export function deleteAdmin(id) {
  return api.delete(`/admins/${id}`);
}
