import api from '../../../utils/api';

export function login(credentials) {
  return api.post('/auth/login', credentials);
}
