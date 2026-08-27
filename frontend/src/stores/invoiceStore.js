import { defineStore } from 'pinia';
import { invoiceService } from '../modules/invoices/api/invoice.service';
import { getApiErrorMessage } from '../utils/apiError';

const customerErrorMessage = (error, fallback) => getApiErrorMessage(error, fallback);

function replaceInvoice(lists, id, invoice) {
  lists.forEach((list) => {
    const index = list.findIndex((entry) => entry.id === id);
    if (index !== -1) list[index] = invoice;
  });
}

export const useInvoiceStore = defineStore('invoice', {
  state: () => ({
    currentInvoices: [], allInvoices: [], customers: [], customersOverview: [], loading: false, error: null
  }),

  actions: {
    async fetchInvoices(filters = {}) {
      this.loading = true; this.error = null;
      try {
        const params = {};
        if (filters.year) params.year = filters.year;
        if (filters.month) params.month = filters.month;
        this.currentInvoices = (await invoiceService.getInvoices(params)).data;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت حساب‌ها'); throw error;
      } finally { this.loading = false; }
    },

    async fetchAllInvoices() {
      try {
        this.allInvoices = (await invoiceService.getInvoices()).data;
        return this.allInvoices;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت آمار کل'); throw error;
      }
    },

    async fetchCustomerInvoices(customerId) {
      this.loading = true; this.error = null;
      try {
        const snapshot = (await invoiceService.getCustomerInvoices(customerId)).data;
        this.currentInvoices = snapshot.invoices;
        return snapshot.customer;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت حساب های مشتری'); throw error;
      } finally { this.loading = false; }
    },

    async fetchCustomerInvoiceSnapshot(customerId) {
      try { return (await invoiceService.getCustomerInvoices(customerId)).data; }
      catch (error) { this.error = getApiErrorMessage(error, 'خطا در دریافت اطلاعات فاکتورهای مشتری'); throw error; }
    },

    async searchInvoices(searchParams) {
      this.loading = true; this.error = null;
      try { this.currentInvoices = (await invoiceService.searchInvoices(searchParams)).data; }
      catch (error) { this.error = getApiErrorMessage(error, 'خطا در جستجو'); throw error; }
      finally { this.loading = false; }
    },

    async addInvoice(invoiceData) {
      try {
        const data = (await invoiceService.createInvoice(invoiceData)).data;
        if (data) this.allInvoices.unshift(data);
        return { success: true, data };
      } catch (error) { return { success: false, message: getApiErrorMessage(error, 'خطا در افزودن حساب') }; }
    },

    async updateInvoice(id, invoiceData) {
      try {
        const data = (await invoiceService.updateInvoice(id, invoiceData)).data;
        replaceInvoice([this.currentInvoices, this.allInvoices], id, data);
        return { success: true, data };
      } catch (error) { return { success: false, message: getApiErrorMessage(error, 'خطا در ویرایش حساب') }; }
    },

    async deleteInvoice(id) {
      try {
        const removedInvoice = this.currentInvoices.find((invoice) => invoice.id === id)
          || this.allInvoices.find((invoice) => invoice.id === id) || null;
        await invoiceService.deleteInvoice(id);
        this.currentInvoices = this.currentInvoices.filter((invoice) => invoice.id !== id);
        this.allInvoices = this.allInvoices.filter((invoice) => invoice.id !== id);
        return { success: true, data: removedInvoice };
      } catch (error) { return { success: false, message: getApiErrorMessage(error, 'خطا در حذف حساب') }; }
    },

    async updateStatus(id, field, value) {
      try {
        const data = (await invoiceService.updateStatus(id, field, value)).data;
        replaceInvoice([this.currentInvoices, this.allInvoices], id, data);
        return { success: true, data };
      } catch (error) { return { success: false, message: getApiErrorMessage(error, 'خطا در تغییر وضعیت') }; }
    },

    async fetchCustomers() {
      try { this.customers = (await invoiceService.getCustomers()).data; }
      catch (error) { this.error = getApiErrorMessage(error, 'خطا در دریافت مشتریان'); throw error; }
    },

    async fetchCustomersOverview() {
      this.loading = true; this.error = null;
      try {
        this.customersOverview = (await invoiceService.getCustomersOverview()).data;
        return this.customersOverview;
      } catch (error) {
        this.error = getApiErrorMessage(error, 'خطا در دریافت فهرست مشتریان'); throw error;
      } finally { this.loading = false; }
    },

    async fetchCustomerWorkflow(customerId) {
      this.loading = true; this.error = null;
      try { return (await invoiceService.getCustomerWorkflow(customerId)).data; }
      catch (error) { this.error = getApiErrorMessage(error, 'خطا در دریافت لیست‌های مشتری'); throw error; }
      finally { this.loading = false; }
    },

    async addCustomer(customerData, { allowExisting = true } = {}) {
      try {
        const data = (await invoiceService.createCustomer(customerData)).data;
        this.customers.push(data);
        return { success: true, data };
      } catch (error) {
        if (allowExisting && error.response?.data?.id) {
          return { success: true, data: { id: error.response.data.id, name: customerData.name } };
        }
        return { success: false, message: customerErrorMessage(error, 'خطا در افزودن مشتری') };
      }
    },

    async updateCustomer(id, customerData) {
      try {
        const data = (await invoiceService.updateCustomer(id, customerData)).data;
        const index = this.customers.findIndex((customer) => customer.id === id);
        if (index !== -1) this.customers[index] = data;
        return { success: true, data };
      } catch (error) { return { success: false, message: customerErrorMessage(error, 'خطا در ویرایش مشتری') }; }
    },

    async updateCustomerProfile(id, payload) {
      try {
        const data = (await invoiceService.updateCustomerProfile(id, payload)).data;
        const customerIndex = this.customers.findIndex((customer) => customer.id === id);
        if (customerIndex !== -1) this.customers[customerIndex] = data;
        const overviewIndex = this.customersOverview.findIndex((customer) => customer.id === id);
        if (overviewIndex !== -1) {
          this.customersOverview[overviewIndex] = {
            ...this.customersOverview[overviewIndex],
            name: data.name || '', first_name: data.first_name || '', last_name: data.last_name || '',
            phone: data.phone || '', referrer: data.referrer || '', account_status: data.account_status || ''
          };
        }
        return { success: true, data };
      } catch (error) { return { success: false, message: customerErrorMessage(error, 'خطا در ذخیره مشخصات مشتری') }; }
    },

    async updateCustomerNotes(id, notes) {
      try {
        const data = (await invoiceService.updateCustomerNotes(id, notes)).data;
        const customerIndex = this.customers.findIndex((customer) => customer.id === id);
        if (customerIndex !== -1) this.customers[customerIndex] = data;
        const overviewIndex = this.customersOverview.findIndex((customer) => customer.id === id);
        if (overviewIndex !== -1) this.customersOverview[overviewIndex] = { ...this.customersOverview[overviewIndex], notes: data.notes || '' };
        return { success: true, data };
      } catch (error) { return { success: false, message: getApiErrorMessage(error, 'خطا در ذخیره توضیحات مشتری') }; }
    },

    async deleteCustomer(id) {
      try {
        const removedCustomer = this.customers.find((customer) => customer.id === id)
          || this.customersOverview.find((customer) => customer.id === id) || null;
        await invoiceService.deleteCustomer(id);
        this.customers = this.customers.filter((customer) => customer.id !== id);
        this.customersOverview = this.customersOverview.filter((customer) => customer.id !== id);
        return { success: true, data: removedCustomer };
      } catch (error) { return { success: false, message: getApiErrorMessage(error, 'خطا در حذف مشتری') }; }
    }
  }
});
