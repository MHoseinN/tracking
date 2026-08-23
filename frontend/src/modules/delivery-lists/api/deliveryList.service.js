import api from '../../../utils/api';

export const deliveryListService = {
  getDrafts() { return api.get('/delivery-lists/drafts'); },
  getDraft(id) { return api.get(`/delivery-lists/${id}`); },
  createDraft() { return api.post('/delivery-lists/drafts'); },
  saveDraft(id, payload) { return api.put(`/delivery-lists/${id}/draft`, payload); },
  deleteDraft(id) { return api.delete(`/delivery-lists/${id}/draft`); }
};
