import api from '../../../utils/api';

export const systemService = {
  createManualBackup() { return api.post('/backups/manual'); }
};
