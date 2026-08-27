import api from '../../../utils/api';

export const reportService = {
  getOverview(params = {}) {
    return api.get('/reports/overview', { params });
  }
};
