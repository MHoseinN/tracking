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
    lists: [],
    listsEtag: '',
    drafts: [],
    currentDraft: null,
    loading: false,
    saving: false,
    error: null
  }),

  actions: {
    async fetchLists(options = {}) {
      const silent = Boolean(options.silent);
      if (!silent) this.loading = true;
      this.error = null;
      try {
        const response = await deliveryListService.getLists(this.listsEtag);
        if (response.status === 304) return this.lists;
        this.listsEtag = response.headers?.etag || '';
        this.lists = response.data.lists || [];
        this.drafts = this.lists.filter((list) => list.status === 'DRAFT');
        return this.lists;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت لیست‌ها');
        throw error;
      } finally {
        if (!silent) this.loading = false;
      }
    },

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

    async getListDetails(id) {
      try {
        return { success: true, data: (await deliveryListService.getDraft(id)).data };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'خطا در دریافت جزئیات لیست') };
      }
    },

    async createDraft() {
      try {
        const draft = (await deliveryListService.createDraft()).data;
        this.currentDraft = draft;
        replaceDraft(this.drafts, draft);
        replaceDraft(this.lists, draft);
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
        if (draft.status === 'DRAFT') replaceDraft(this.drafts, draft);
        else this.drafts = this.drafts.filter((item) => Number(item.id) !== Number(draft.id));
        replaceDraft(this.lists, draft);
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
        this.lists = this.lists.filter((list) => Number(list.id) !== Number(id));
        if (Number(this.currentDraft?.id) === Number(id)) this.currentDraft = null;
        return { success: true };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'حذف پیش‌نویس انجام نشد') };
      }
    },

    async deleteList(id) {
      try {
        await deliveryListService.deleteList(id);
        this.drafts = this.drafts.filter((draft) => Number(draft.id) !== Number(id));
        this.lists = this.lists.filter((list) => Number(list.id) !== Number(id));
        if (Number(this.currentDraft?.id) === Number(id)) this.currentDraft = null;
        return { success: true };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'حذف لیست انجام نشد') };
      }
    },

    async finalizeDraft(id, version) {
      this.saving = true;
      try {
        const list = (await deliveryListService.finalizeDraft(id, version)).data;
        this.currentDraft = list;
        this.drafts = this.drafts.filter((draft) => Number(draft.id) !== Number(id));
        replaceDraft(this.lists, list);
        return { success: true, data: list };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'ثبت نهایی تحویل انجام نشد') };
      } finally {
        this.saving = false;
      }
    },

    async recordReturn(id, payload) {
      this.saving = true;
      try {
        const list = (await deliveryListService.recordReturn(id, payload)).data;
        this.currentDraft = list;
        replaceDraft(this.lists, list);
        return { success: true, data: list };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'ثبت مرجوعی انجام نشد') };
      } finally {
        this.saving = false;
      }
    },

    async getInvoicePreview(id) {
      try {
        return { success: true, data: (await deliveryListService.getInvoicePreview(id)).data };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'دریافت پیش‌نمایش فاکتور انجام نشد') };
      }
    },

    async issueInvoice(id, payload) {
      this.saving = true;
      try {
        const response = (await deliveryListService.issueInvoice(id, payload)).data;
        this.currentDraft = response.list;
        replaceDraft(this.lists, response.list);
        return { success: true, data: response };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'صدور فاکتور انجام نشد') };
      } finally {
        this.saving = false;
      }
    },

    async getInvoice(id, invoiceId) {
      try {
        return { success: true, data: (await deliveryListService.getInvoice(id, invoiceId)).data };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'دریافت اطلاعات فاکتور انجام نشد') };
      }
    },

    async updateInvoice(id, invoiceId, payload) {
      this.saving = true;
      try {
        const response = (await deliveryListService.updateInvoice(id, invoiceId, payload)).data;
        this.currentDraft = response.list;
        replaceDraft(this.lists, response.list);
        return { success: true, data: response };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'ویرایش فاکتور انجام نشد') };
      } finally {
        this.saving = false;
      }
    },

    async updateInvoiceSendStatus(id, invoiceId, payload) {
      this.saving = true;
      try {
        const response = (await deliveryListService.updateInvoiceSendStatus(id, invoiceId, payload)).data;
        this.currentDraft = response.list;
        replaceDraft(this.lists, response.list);
        return { success: true, data: response };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'تغییر وضعیت ارسال فاکتور انجام نشد') };
      } finally {
        this.saving = false;
      }
    },

    async getSettlement(id) {
      try {
        return { success: true, data: (await deliveryListService.getSettlement(id)).data };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'دریافت اطلاعات تسویه انجام نشد') };
      }
    },

    async recordPayment(id, payload) {
      this.saving = true;
      try {
        const summary = (await deliveryListService.recordPayment(id, payload)).data;
        const list = this.lists.find((item) => Number(item.id) === Number(id));
        if (list) list.settlement_status = summary.list.settlement_status;
        if (this.currentDraft && Number(this.currentDraft.id) === Number(id)) {
          this.currentDraft.settlement_status = summary.list.settlement_status;
        }
        return { success: true, data: summary };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'ثبت پرداخت انجام نشد') };
      } finally {
        this.saving = false;
      }
    },

    async voidPayment(id, paymentId) {
      this.saving = true;
      try {
        const summary = (await deliveryListService.voidPayment(id, paymentId)).data;
        const list = this.lists.find((item) => Number(item.id) === Number(id));
        if (list) list.settlement_status = summary.list.settlement_status;
        if (this.currentDraft && Number(this.currentDraft.id) === Number(id)) {
          this.currentDraft.settlement_status = summary.list.settlement_status;
        }
        return { success: true, data: summary };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'ابطال پرداخت انجام نشد') };
      } finally {
        this.saving = false;
      }
    },

    async downloadInvoicePdf(id, invoiceId) {
      try {
        const response = await deliveryListService.downloadInvoicePdf(id, invoiceId);
        const blob = response.data;
        const signature = blob instanceof Blob ? await blob.slice(0, 5).text() : '';
        const contentType = blob?.type || response.headers?.['content-type'] || 'نامشخص';

        if (!(blob instanceof Blob) || !blob.size || signature !== '%PDF-') {
          const size = blob?.size || 0;
          throw new Error(
            `پاسخ PDF معتبر نیست (حجم: ${size} بایت، نوع: ${contentType}، ابتدای پاسخ: ${signature || 'خالی'})`
          );
        }

        return { success: true, data: blob };
      } catch (error) {
        return { success: false, message: getApiErrorMessage(error, 'دانلود PDF فاکتور انجام نشد') };
      }
    }
  }
});
