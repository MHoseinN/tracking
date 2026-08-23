import { defineStore } from 'pinia';
import { deliveryListService } from '../modules/delivery-lists/api/deliveryList.service';
import { getApiErrorMessage } from '../utils/apiError';

function replaceDraft(drafts, draft) {
  const index = drafts.findIndex((item) => Number(item.id) === Number(draft.id));
  if (index === -1) drafts.unshift(draft);
  else drafts[index] = { ...drafts[index], ...draft };
}

export const useDeliveryListStore = defineStore('deliveryLists', {
  state: () => ({
    drafts: [],
    currentDraft: null,
    loading: false,
    saving: false,
    error: null
  }),

  actions: {
    async fetchDrafts() {
      this.loading = true;
      this.error = null;
      try {
        this.drafts = (await deliveryListService.getDrafts()).data.drafts || [];
        return this.drafts;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت پیش‌نویس‌ها');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async fetchDraft(id) {
      this.loading = true;
      this.error = null;
      try {
        this.currentDraft = (await deliveryListService.getDraft(id)).data;
        return this.currentDraft;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت پیش‌نویس');
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async createDraft() {
      try {
        const draft = (await deliveryListService.createDraft()).data;
        this.currentDraft = draft;
        replaceDraft(this.drafts, draft);
        return { success: true, data: draft };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'خطا در ایجاد پیش‌نویس') };
      }
    },

    async saveDraft(id, payload) {
      this.saving = true;
      try {
        const draft = (await deliveryListService.saveDraft(id, payload)).data;
        this.currentDraft = draft;
        replaceDraft(this.drafts, draft);
        return { success: true, data: draft };
      } catch (error) {
        return {
          success: false,
          status: error.response?.status,
          message: getApiErrorMessage(error, 'ذخیره خودکار انجام نشد')
        };
      } finally {
        this.saving = false;
      }
    },

    async deleteDraft(id) {
      try {
        await deliveryListService.deleteDraft(id);
        this.drafts = this.drafts.filter((draft) => Number(draft.id) !== Number(id));
        if (Number(this.currentDraft?.id) === Number(id)) this.currentDraft = null;
        return { success: true };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'حذف پیش‌نویس انجام نشد') };
      }
    }
  }
});
