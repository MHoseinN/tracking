import api from '../../../utils/api';

export const settingsService = {
  getSettings() { return api.get('/settings'); },
  updateBillingCutoff(billingCutoffTime) {
    return api.put('/settings/billing-cutoff', { billing_cutoff_time: billingCutoffTime });
  }
};
