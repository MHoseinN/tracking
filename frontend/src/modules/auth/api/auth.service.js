import api from '../../../utils/api';

export function login(credentials) {
  return api.post('/auth/login', credentials);
}

export function getCurrentUser() {
  return api.get('/auth/me');
}

export function getProfile() {
  return api.get('/auth/profile');
}

export function updateProfile(payload) {
  return api.patch('/auth/profile', payload);
}
