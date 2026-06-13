import { defineStore } from 'pinia';
import api from '../utils/api';

function customerErrorMessage(err, fallback) {
  const message = err.response?.data?.message;
  if (message === 'Customer with this phone already exists') {
    return 'کاربری با این شماره تماس قبلا ثبت شده است';
  }
  if (message === 'Customer with this name already exists') {
    return 'کاربری با این نام قبلا ثبت شده است';
  }
  return message || fallback;
}

export const useInvoiceStore = defineStore('invoice', {
  state: () => ({
    currentInvoices: [],
    allInvoices: [],
    customers: [],
    customersOverview: [],
    loading: false,
    error: null
  }),

  actions: {
    // Fetch invoices for a specific Gregorian year/month
    async fetchInvoices(filters = {}) {
      this.loading = true;
      this.error = null;
      try {
        const params = {};
        if (filters.year) params.year = filters.year;
        if (filters.month) params.month = filters.month;
        const response = await api.get('/invoices', { params });
        this.currentInvoices = response.data;
      } catch (err) {
        this.error = err.response?.data?.message || 'خطا در دریافت حساب‌ها';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Fetch all invoices for global stats
    async fetchAllInvoices() {
      try {
        const response = await api.get('/invoices');
        this.allInvoices = response.data;
        return response.data;
      } catch (err) {
        this.error = err.response?.data?.message || 'خطا در دریافت آمار کل';
        throw err;
      }
    },

    // Fetch invoices for a specific customer
    async fetchCustomerInvoices(customerId) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get(`/invoices/customer/${customerId}`);
        this.currentInvoices = response.data.invoices;
        return response.data.customer;
      } catch (err) {
        this.error = err.response?.data?.message || 'خطا در دریافت حساب های مشتری';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Search invoices
    async searchInvoices(searchParams) {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/invoices/search', { params: searchParams });
        this.currentInvoices = response.data;
      } catch (err) {
        this.error = err.response?.data?.message || 'خطا در جستجو';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Add a new invoice
    async addInvoice(invoiceData) {
      try {
        const response = await api.post('/invoices', invoiceData);
        if (response.data) {
          this.allInvoices.unshift(response.data);
        }
        return { success: true, data: response.data };
      } catch (err) {
        const message = err.response?.data?.message || 'خطا در افزودن حساب';
        return { success: false, message };
      }
    },

    // Update an invoice
    async updateInvoice(id, invoiceData) {
      try {
        const response = await api.put(`/invoices/${id}`, invoiceData);
        const updateListItem = (list) => {
          const index = list.findIndex(inv => inv.id === id);
          if (index !== -1) {
            list[index] = response.data;
          }
        };
        updateListItem(this.currentInvoices);
        updateListItem(this.allInvoices);
        return { success: true, data: response.data };
      } catch (err) {
        const message = err.response?.data?.message || 'خطا در ویرایش حساب';
        return { success: false, message };
      }
    },

    // Delete an invoice
    async deleteInvoice(id) {
      try {
        const removedInvoice = this.currentInvoices.find(inv => inv.id === id) || this.allInvoices.find(inv => inv.id === id) || null;
        await api.delete(`/invoices/${id}`);
        this.currentInvoices = this.currentInvoices.filter(inv => inv.id !== id);
        this.allInvoices = this.allInvoices.filter(inv => inv.id !== id);
        return { success: true, data: removedInvoice };
      } catch (err) {
        const message = err.response?.data?.message || 'خطا در حذف حساب';
        return { success: false, message };
      }
    },

  

    // Update invoice status (is_shipped or is_settled)
    async updateStatus(id, field, value) {
      try {
        const response = await api.patch(`/invoices/${id}/status`, { field, value });
        // Update locally for instant feedback
        const updateListItem = (list) => {
          const index = list.findIndex(inv => inv.id === id);
          if (index !== -1) {
            list[index] = response.data;
          }
        };
        updateListItem(this.currentInvoices);
        updateListItem(this.allInvoices);
        return { success: true, data: response.data };
      } catch (err) {
        const message = err.response?.data?.message || 'خطا در تغییر وضعیت';
        return { success: false, message };
      }
    },

    // Fetch all customers
    async fetchCustomers() {
      try {
        const response = await api.get('/customers');
        this.customers = response.data;
      } catch (err) {
        this.error = err.response?.data?.message || 'خطا در دریافت مشتریان';
        throw err;
      }
    },

    // Fetch customers with invoice aggregates for admin table
    async fetchCustomersOverview() {
      this.loading = true;
      this.error = null;
      try {
        const response = await api.get('/customers/overview');
        this.customersOverview = response.data;
        return response.data;
      } catch (err) {
        this.error = err.response?.data?.message || 'خطا در دریافت لیست کاربران';
        throw err;
      } finally {
        this.loading = false;
      }
    },

    // Add a customer
    async addCustomer(customerData, options = {}) {
      const { allowExisting = true } = options;
      try {
        const response = await api.post('/customers', customerData);
        this.customers.push(response.data);
        return { success: true, data: response.data };
      } catch (err) {
        // If customer already exists, return existing id
        if (allowExisting && err.response?.data?.id) {
          return { success: true, data: { id: err.response.data.id, name: customerData.name } };
        }
        const message = customerErrorMessage(err, 'خطا در افزودن مشتری');
        return { success: false, message };
      }
    },

    // Update a customer
    async updateCustomer(id, customerData) {
      try {
        const response = await api.put(`/customers/${id}`, customerData);
        const index = this.customers.findIndex(c => c.id === id);
        if (index !== -1) this.customers[index] = response.data;
        return { success: true, data: response.data };
      } catch (err) {
        const message = customerErrorMessage(err, 'خطا در ویرایش مشتری');
        return { success: false, message };
      }
    },

    // Update customer profile fields (phone/referrer/account status)
    async updateCustomerProfile(id, payload) {
      try {
        const response = await api.patch(`/customers/${id}/profile`, payload);

        const customerIndex = this.customers.findIndex(c => c.id === id);
        if (customerIndex !== -1) {
          this.customers[customerIndex] = response.data;
        }

        const overviewIndex = this.customersOverview.findIndex(c => c.id === id);
        if (overviewIndex !== -1) {
          this.customersOverview[overviewIndex] = {
            ...this.customersOverview[overviewIndex],
            name: response.data.name || '',
            first_name: response.data.first_name || '',
            last_name: response.data.last_name || '',
            phone: response.data.phone || '',
            referrer: response.data.referrer || '',
            account_status: response.data.account_status || ''
          };
        }

        return { success: true, data: response.data };
      } catch (err) {
        const message = customerErrorMessage(err, 'خطا در ذخیره مشخصات مشتری');
        return { success: false, message };
      }
    },

    // Update customer notes
    async updateCustomerNotes(id, notes) {
      try {
        const response = await api.patch(`/customers/${id}/notes`, { notes: notes || null });

        const customerIndex = this.customers.findIndex(c => c.id === id);
        if (customerIndex !== -1) {
          this.customers[customerIndex] = response.data;
        }

        const overviewIndex = this.customersOverview.findIndex(c => c.id === id);
        if (overviewIndex !== -1) {
          this.customersOverview[overviewIndex] = {
            ...this.customersOverview[overviewIndex],
            notes: response.data.notes || ''
          };
        }

        return { success: true, data: response.data };
      } catch (err) {
        const message = err.response?.data?.message || 'خطا در ذخیره توضیحات مشتری';
        return { success: false, message };
      }
    },

    // Delete a customer
    async deleteCustomer(id) {
      try {
        const removedCustomer = this.customers.find(c => c.id === id) || this.customersOverview.find(c => c.id === id) || null;
        await api.delete(`/customers/${id}`);
        this.customers = this.customers.filter(c => c.id !== id);
        this.customersOverview = this.customersOverview.filter(c => c.id !== id);
        return { success: true, data: removedCustomer };
      } catch (err) {
        const message = err.response?.data?.message || 'خطا در حذف مشتری';
        return { success: false, message };
      }
    }
  }
});
