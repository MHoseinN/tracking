import api from '../../../utils/api';

export function login(credentials) {
  return api.post('/auth/login', credentials);
}

export function getCurrentUser() {
  return api.get('/auth/me');
}
