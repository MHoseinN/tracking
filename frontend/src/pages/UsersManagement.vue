<template>
  <div class="min-h-screen bg-gray-50">
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <button @click="goBack" class="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span class="text-sm font-medium">بازگشت</span>
          </button>

          <div class="w-px h-6 bg-gray-300"></div>

          <div>
            <h1 class="text-xl font-bold text-gray-800">مدیریت کاربران</h1>
            <p class="text-xs text-gray-500">مرتب سازی بر اساس مبلغ کل فاکتور و سپس تعداد فاکتور</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="openAddModal"
            class="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            افزودن کاربر
          </button>

          <button @click="handleLogout" class="flex items-center gap-1 text-red-600 hover:text-red-800 text-sm font-medium transition">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            خروج
          </button>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 py-6 space-y-5">
      <div v-if="errorMessage" class="bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4">
        {{ errorMessage }}
      </div>

      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-semibold text-gray-700">جدول کاربران</h2>
          <span class="text-sm text-gray-400">{{ rows.length }} کاربر</span>
        </div>

        <div v-if="loading" class="flex items-center justify-center py-16 text-gray-500">در حال بارگذاری...</div>

        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[920px]">
            <thead class="bg-gray-50 border-b border-gray-100">
              <tr>
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
              <tr
                v-for="row in rows"
                :key="row.id"
                class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                @click="navigateToCustomer(row.id)"
              >
                <td class="px-4 py-3 text-sm text-gray-700 font-medium">{{ row.first_name }}</td>
                <td class="px-4 py-3 text-sm text-gray-700 font-medium">{{ row.last_name }}</td>
                <td class="px-4 py-3 text-sm text-gray-600">
                  <div @click.stop @mousedown.stop>
                    <select
                      :value="row.account_status || ''"
                      :disabled="statusSavingId === row.id"
                      :class="[
                        'w-full min-w-[180px] border rounded-lg px-3 py-2 text-sm font-medium bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition',
                        row.account_status ? accountStatusSelectClass(row.account_status) : 'border-gray-300 text-gray-400'
                      ]"
                      @click.stop
                      @change="handleStatusChange(row, $event.target.value)"
                    >
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
                    <button @click.stop="openEditModal(row)" class="bg-amber-100 text-amber-700 px-3 py-1.5 rounded-md hover:bg-amber-200">ویرایش</button>
                    <button @click.stop="handleDelete(row)" class="bg-rose-100 text-rose-700 px-3 py-1.5 rounded-md hover:bg-rose-200">حذف</button>
                  </div>
                </td>
              </tr>

              <tr v-if="!rows.length">
                <td colspan="8" class="px-4 py-10 text-center text-sm text-gray-400">کاربری ثبت نشده است</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </main>

    <Teleport to="body">
      <div v-if="showForm" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click.self="closeModal">
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
                <label class="block text-sm font-medium text-gray-700 mb-1">نام <span class="text-red-500">*</span></label>
                <input v-model="form.first_name" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" :class="{ 'border-red-500': errors.first_name }" />
                <p v-if="errors.first_name" class="text-red-500 text-xs mt-1">{{ errors.first_name }}</p>
              </div>
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-1">نام خانوادگی <span class="text-red-500">*</span></label>
                <input v-model="form.last_name" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" :class="{ 'border-red-500': errors.last_name }" />
                <p v-if="errors.last_name" class="text-red-500 text-xs mt-1">{{ errors.last_name }}</p>
              </div>
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">شماره تماس</label>
              <input v-model="form.phone" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">معرف</label>
              <input v-model="form.referrer" type="text" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>

            <div>
              <label class="block text-sm font-medium text-gray-700 mb-1">وضعیت حساب</label>
              <select v-model="form.account_status" class="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                <option value="">وضعیت حساب</option>
                <option v-for="option in accountStatusOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>

            <div class="flex gap-3 pt-2">
              <button type="submit" :disabled="saving" class="flex-1 bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50">
                {{ saving ? 'در حال ذخیره...' : (editingId ? 'ذخیره تغییرات' : 'افزودن کاربر') }}
              </button>
              <button type="button" @click="closeModal" class="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-200 transition">انصراف</button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useAuthStore } from '../stores/authStore';
import { useInvoiceStore } from '../stores/invoiceStore';

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

const rows = computed(() => invoiceStore.customersOverview);

function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('fa-IR');
}

function formatCurrency(value) {
  return `${formatNumber(value)} تومان`;
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
  showForm.value = true;
}

function openEditModal(row) {
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
  resetForm();
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
