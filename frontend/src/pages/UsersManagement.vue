<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <div>
            <h1 class="text-xl font-bold text-gray-800">مدیریت کاربران</h1>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button @click="goBack"
            class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
            <span>بازگشت</span>
            <svg class="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div v-if="errorMessage" class="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4">
        {{ errorMessage }}
      </div>

      <form class="bg-white rounded-xl shadow border border-gray-100 overflow-hidden" @submit.prevent>
        <div class="p-5 space-y-4">
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p class="text-xs font-medium text-slate-500">تمامی کاربران</p>
              <p class="mt-2 text-2xl font-bold text-slate-800">{{ formatNumber(totalCustomers) }}</p>
            </div>

            <div v-for="item in statusSummary" :key="item.label"
              :class="['rounded-lg border px-4 py-3', item.containerClass]">
              <p :class="['text-xs font-medium', item.labelClass]">{{ item.label }}</p>
              <p :class="['mt-2 text-2xl font-bold', item.valueClass]">{{ formatNumber(item.count) }}</p>
            </div>
          </div>
        </div>
      </form>

      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-center">
          <div class="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div class="relative flex-1 w-[600px]">
              <svg class="pointer-events-none absolute right-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400"
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                  d="M21 21l-4.35-4.35m1.1-5.4a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" />
              </svg>
              <input v-model="searchQuery" type="search"
                placeholder="جستجو بر اساس نام، نام خانوادگی، شماره تماس، معرف یا وضعیت حساب..."
                class="w-full border border-gray-300 rounded-lg bg-white p-4  pr-10 pl-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="button" @click="openAddModal"
              class="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-600 p-4 text-sm font-medium text-white transition hover:bg-blue-700 sm:w-auto">
              افزودن کاربر
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-16 text-gray-500">در حال بارگذاری...</div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[920px]">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">شماره</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">نام</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">نام خانوادگی</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">وضعیت حساب</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">تعداد فاکتور</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">مبلغ کل فاکتور ها</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">شماره تماس</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">معرف</th>
                <th class="px-4 py-3 text-right text-xs font-medium text-gray-700 uppercase">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, index) in paginatedRows" :key="row.id"
                class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer" @click="navigateToCustomer(row.id)">
                <td class="px-4 py-3 text-sm text-gray-700 font-medium">{{ formatNumber(rowStartIndex + index + 1) }}
                </td>
                <td class="px-4 py-3 text-sm text-gray-700 font-medium">{{ row.first_name }}</td>
                <td class="px-4 py-3 text-sm text-gray-700 font-medium">{{ row.last_name }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  <div @click.stop @mousedown.stop>
                    <select :value="row.account_status || ''" :disabled="statusSavingId === row.id" :class="[
                      'w-full min-w-[180px] border rounded-lg px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition',
                      row.account_status ? accountStatusSelectClass(row.account_status) : 'border-gray-300 text-gray-400'
                    ]" @click.stop @change="handleStatusChange(row, $event.target.value)">
                      <option value="">وضعیت حساب</option>
                      <option v-for="option in accountStatusOptions" :key="option" :value="option">{{ option }}</option>
                    </select>
                  </div>
                </td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ formatNumber(row.invoice_count) }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ formatCurrency(row.total_invoices_amount) }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ row.phone || '-' }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">{{ row.referrer || '-' }}</td>
                <td class="px-4 py-3 text-sm">
                  <div class="flex items-center gap-2">
                    <button @click.stop="openEditModal(row)"
                      class="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md hover:bg-amber-200">ویرایش</button>
                    <button @click.stop="handleDelete(row)"
                      class="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-md hover:bg-rose-200">حذف</button>
                  </div>
                </td>
              </tr>

              <tr v-if="!filteredRows.length">
                <td colspan="9" class="px-4 py-10 text-center text-sm text-gray-400">
                  {{ rows.length ? 'کاربری با این جستجو پیدا نشد' : 'کاربری ثبت نشده است' }}
                </td>
              </tr>
            </tbody>
          </table>

          <div v-if="!invoiceStore.loading && totalRows > 0"
            class="px-5 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-white">
            <div class="flex items-center justify-between gap-8">
              <div>
                <p class="text-sm text-gray-500">
                  نمایش
                  <span class="font-medium text-gray-700">{{ (rowStartIndex + 1).toLocaleString('fa-IR') }}</span>
                  تا
                  <span class="font-medium text-gray-700">{{ Math.min(rowStartIndex + pageSize,
                    totalRows).toLocaleString('fa-IR') }}</span>
                  از
                  <span class="font-medium text-gray-700">{{ totalRows.toLocaleString('fa-IR') }}</span>
                </p>
              </div>

              <div class="flex items-center gap-3">
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <select v-model.number="pageSize"
                    class="border border-gray-300 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size.toLocaleString('fa-IR') }}
                    </option>
                  </select>
                </div>
              </div>
            </div>
            <div class="flex items-center gap-2">
              <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1"
                class="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                قبلی
              </button>

              <span class="text-sm text-gray-600">
                صفحه {{ currentPage.toLocaleString('fa-IR') }} از {{ totalPages.toLocaleString('fa-IR') }}
              </span>

              <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages"
                class="px-3 py-1.5 rounded-md border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                بعدی
              </button>
            </div>
          </div>
        </div>
      </div>
    </main>

    <CustomerFormModal :is-open="showForm" :customer="selectedCustomer"
      :existing-customers="invoiceStore.customersOverview" @close="closeModal" @saved="handleCustomerSaved" />

    <Teleport to="body">
      <div v-if="false && showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        @click.self="closeModal">
        <div class="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
          <div class="flex items-center justify-between p-5 border-b">
            <h3 class="text-lg font-bold text-gray-800">{{ editingId ? 'ویرایش کاربر' : 'افزودن کاربر' }}</h3>
            <button @click="closeModal" class="text-gray-400 hover:text-gray-600 transition">
              <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <form @submit.prevent="saveCustomer" class="p-5 space-y-4">
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">نام <span
                    class="text-red-500">*</span></label>
                <input v-model="form.first_name" type="text"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="{ 'border-red-500': errors.first_name }" />
                <p v-if="errors.first_name" class="text-red-500 text-xs mt-1">{{ errors.first_name }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی <span
                    class="text-red-500">*</span></label>
                <input v-model="form.last_name" type="text"
                  class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  :class="{ 'border-red-500': errors.last_name }" />
                <p v-if="errors.last_name" class="text-red-500 text-xs mt-1">{{ errors.last_name }}</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">شماره تماس</label>
              <input v-model="form.phone" type="text"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">معرف</label>
              <input v-model="form.referrer" type="text"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">وضعیت حساب</label>
              <select v-model="form.account_status"
                class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">وضعیت حساب</option>
                <option v-for="option in accountStatusOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>

            <div class="flex gap-3 pt-2">
              <button type="submit" :disabled="saving"
                class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {{ saving ? 'در حال ذخیره...' : (editingId ? 'ذخیره تغییرات' : 'افزودن کاربر') }}
              </button>
              <button type="button" @click="closeModal"
                class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">انصراف</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../stores/authStore';
import { useInvoiceStore } from '../stores/invoiceStore';
import CustomerFormModal from '../components/CustomerFormModal.vue';

const router = useRouter();
const toast = useToast();
const authStore = useAuthStore();
const invoiceStore = useInvoiceStore();

const loading = ref(false);
const saving = ref(false);
const statusSavingId = ref(null);
const errorMessage = ref('');

const showForm = ref(false);
const editingId = ref(null);
const selectedCustomer = ref(null);

const form = reactive({
  first_name: '',
  last_name: '',
  phone: '',
  referrer: '',
  account_status: ''
});

const errors = reactive({
  first_name: '',
  last_name: ''
});

const accountStatusOptions = ['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'];
const pageSizeOptions = [10, 15, 20, 50, 100];

const rows = computed(() => invoiceStore.customersOverview);
const searchQuery = ref('');
const currentPage = ref(1);
const pageSize = ref(15);

const totalCustomers = computed(() => rows.value.length);

function countCustomersByStatus(status) {
  return rows.value.filter((row) => row.account_status === status).length;
}

const statusSummary = computed(() => [
  {
    label: 'خوش حساب',
    count: countCustomersByStatus('خوش حساب'),
    containerClass: 'border-emerald-200 bg-emerald-50',
    labelClass: 'text-emerald-600',
    valueClass: 'text-emerald-700'
  },
  {
    label: 'بد حساب',
    count: countCustomersByStatus('بد حساب'),
    containerClass: 'border-rose-200 bg-rose-50',
    labelClass: 'text-rose-600',
    valueClass: 'text-rose-700'
  },
  {
    label: 'پرداخت نقدی',
    count: countCustomersByStatus('پرداخت نقدی'),
    containerClass: 'border-blue-200 bg-blue-50',
    labelClass: 'text-blue-600',
    valueClass: 'text-blue-700'
  },
  {
    label: 'هماهنگی با مدیر',
    count: countCustomersByStatus('هماهنگی با مدیر'),
    containerClass: 'border-amber-200 bg-amber-50',
    labelClass: 'text-amber-600',
    valueClass: 'text-amber-700'
  }
]);

function normalizeForSearch(value) {
  return String(value ?? '')
    .replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (d) => String(d.charCodeAt(0) - 0x06f0))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim()
    .toLowerCase();
}

const filteredRows = computed(() => {
  const query = normalizeForSearch(searchQuery.value);
  if (!query) return rows.value;

  return rows.value.filter((row) => {
    const searchable = [
      row.first_name,
      row.last_name,
      row.phone,
      row.referrer,
      row.account_status
    ];

    return searchable.some((field) => normalizeForSearch(field).includes(query));
  });
});

const totalRows = computed(() => filteredRows.value.length);
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)));
const rowStartIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const paginatedRows = computed(() => filteredRows.value.slice(rowStartIndex.value, rowStartIndex.value + pageSize.value));

watch(pageSize, () => {
  currentPage.value = 1;
});

watch(searchQuery, () => {
  currentPage.value = 1;
});

watch([rows, totalPages], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }

  if (currentPage.value < 1) {
    currentPage.value = 1;
  }
});

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('fa-IR');
}

function formatCurrency(value) {
  return `${formatNumber(value)} تومان`;
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}

function accountStatusSelectClass(status) {
  switch (status) {
    case 'خوش حساب':
      return 'border-emerald-300 text-emerald-700 bg-emerald-50';
    case 'بد حساب':
      return 'border-rose-300 text-rose-700 bg-rose-50';
    case 'پرداخت نقدی':
      return 'border-blue-300 text-blue-700 bg-blue-50';
    case 'هماهنگی با مدیر':
      return 'border-amber-300 text-amber-700 bg-amber-50';
    default:
      return 'border-gray-300 text-gray-500';
  }
}

function resetForm() {
  editingId.value = null;
  form.first_name = '';
  form.last_name = '';
  form.phone = '';
  form.referrer = '';
  form.account_status = '';
  errors.first_name = '';
  errors.last_name = '';
}

function validate() {
  errors.first_name = '';
  errors.last_name = '';

  let valid = true;

  if (!String(form.first_name || '').trim()) {
    errors.first_name = 'نام الزامی است';
    valid = false;
  }

  if (!String(form.last_name || '').trim()) {
    errors.last_name = 'نام خانوادگی الزامی است';
    valid = false;
  }

  return valid;
}

async function loadOverview() {
  loading.value = true;
  errorMessage.value = '';
  try {
    await invoiceStore.fetchCustomersOverview();
  } catch (err) {
    errorMessage.value = 'دریافت لیست کاربران با خطا مواجه شد.';
  } finally {
    loading.value = false;
  }
}

function openAddModal() {
  resetForm();
  selectedCustomer.value = null;
  showForm.value = true;
}

function openEditModal(row) {
  selectedCustomer.value = row;
  editingId.value = row.id;
  form.first_name = row.first_name || '';
  form.last_name = row.last_name || '';
  form.phone = row.phone || '';
  form.referrer = row.referrer || '';
  form.account_status = row.account_status || '';
  errors.first_name = '';
  errors.last_name = '';
  showForm.value = true;
}

function closeModal() {
  showForm.value = false;
  selectedCustomer.value = null;
  resetForm();
}

async function handleCustomerSaved() {
  await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
}

async function saveCustomer() {
  if (!validate()) return;

  saving.value = true;

  const payload = {
    first_name: form.first_name.trim(),
    last_name: form.last_name.trim(),
    phone: String(form.phone || '').trim() || null,
    referrer: String(form.referrer || '').trim() || null,
    account_status: String(form.account_status || '').trim() || null
  };

  let result;
  if (editingId.value) {
    result = await invoiceStore.updateCustomer(editingId.value, payload);
  } else {
    result = await invoiceStore.addCustomer(payload, { allowExisting: false });
  }

  saving.value = false;

  if (!result.success) {
    toast.error(result.message || 'عملیات با خطا مواجه شد');
    return;
  }

  toast.success(editingId.value ? 'کاربر با موفقیت ویرایش شد' : 'کاربر با موفقیت اضافه شد');
  closeModal();
  await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
}

async function handleStatusChange(row, value) {
  const previousStatus = row.account_status || '';
  row.account_status = String(value || '').trim() || '';
  statusSavingId.value = row.id;

  const result = await invoiceStore.updateCustomer(row.id, {
    first_name: row.first_name || '',
    last_name: row.last_name || '',
    phone: row.phone || null,
    referrer: row.referrer || null,
    account_status: String(value || '').trim() || null
  });

  statusSavingId.value = null;

  if (!result.success) {
    row.account_status = previousStatus;
    toast.error(result.message || 'به‌روزرسانی وضعیت حساب با خطا مواجه شد');
    return;
  }

  toast.success('وضعیت حساب با موفقیت ثبت شد');
  await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
}

async function handleDelete(row) {
  const accepted = window.confirm(`آیا از حذف کاربر ${row.first_name} ${row.last_name} مطمئن هستید؟`);
  if (!accepted) return;

  const result = await invoiceStore.deleteCustomer(row.id);
  if (!result.success) {
    toast.error(result.message || 'حذف کاربر با خطا مواجه شد');
    return;
  }

  toast.success('کاربر با موفقیت حذف شد');
  await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
}

function goBack() {
  router.back();
}

function navigateToCustomer(customerId) {
  router.push(`/customer/${customerId}`);
}

function handleLogout() {
  authStore.logout();
  router.push('/login');
}

onMounted(async () => {
  await Promise.all([loadOverview(), invoiceStore.fetchCustomers()]);
});
</script>
