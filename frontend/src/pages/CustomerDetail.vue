<template>
  <div class="min-h-screen bg-gray-50" dir="rtl">
    <header class="sticky top-0 z-10 bg-white shadow-sm">
      <div class="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <div class="min-w-0">
          <p class="text-xs font-medium text-slate-500">صفحه اختصاصی مشتری</p>
          <h1 class="truncate text-xl font-black text-slate-800 sm:text-2xl">
            {{ customer?.name || 'مشتری' }}
          </h1>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="openAddModal"
            class="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>افزودن حساب</span>
          </button>

          <button
            @click="goBack"
            class="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            <span>بازگشت</span>
            <svg class="h-5 w-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </header>

    <main class="mx-auto max-w-7xl space-y-6 px-4 py-6">

      <section class="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-200">
        <div class="border-b border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-6">
          <div class="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 class="text-lg font-bold text-slate-800">فرم اطلاعات مشتری</h2>
            </div>
          </div>
        </div>

        <div class="space-y-5 px-5 py-5 sm:px-6">
          <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">نام</label>
              <input v-model="customerProfileDraft.first_name" type="text" placeholder="نام" class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">نام خانوادگی</label>
              <input v-model="customerProfileDraft.last_name" type="text" placeholder="نام خانوادگی" class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">شماره تماس</label>
              <input v-model="customerProfileDraft.phone" type="text" placeholder="شماره تماس" class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">معرف</label>
              <input v-model="customerProfileDraft.referrer" type="text" placeholder="معرف" class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            </div>
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">وضعیت حساب</label>
              <select v-model="customerProfileDraft.account_status" class="w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100">
                <option value="">وضعیت حساب</option>
                <option v-for="option in accountStatusOptions" :key="option" :value="option">{{ option }}</option>
              </select>
            </div>
          </div>

          <div class="grid gap-4 xl:grid-cols-[1fr_280px] xl:items-start">
            <div>
              <label class="mb-1 block text-sm font-medium text-gray-700">درباره مشتری</label>
              <textarea v-model="customerNotesDraft" rows="7" placeholder="درباره این مشتری بنویسید..." class="w-full rounded-3xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"></textarea>
            </div>

            <div class="flex h-full flex-col justify-between rounded-3xl border border-slate-200 bg-slate-50 p-4">
              <div class="space-y-2">
                <p class="text-sm font-semibold text-slate-700">وضعیت فرم</p>
                <div class="rounded-2xl bg-white px-3 py-3 text-sm text-slate-600 shadow-sm ring-1 ring-slate-200">
                  <span v-if="customerFormChanged" class="font-semibold text-amber-600">تغییرات ذخیره نشده</span>
                  <span v-else class="font-semibold text-emerald-600">همه چیز به روز است</span>
                </div>
              </div>

              <button :disabled="customerFormSaving || !customerFormChanged" @click="saveCustomerForm" class="mt-4 inline-flex items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
                <svg v-if="customerFormSaving" class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                {{ customerFormSaving ? 'در حال ذخیره...' : 'ذخیره اطلاعات مشتری' }}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">تعداد فاکتورها</p>
          <p class="mt-2 text-3xl font-black text-blue-600">{{ totalRows.toLocaleString('fa-IR') }}</p>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">فاکتورهای تسویه شده</p>
          <p class="mt-2 text-3xl font-black text-emerald-600">{{ settledCount.toLocaleString('fa-IR') }}</p>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">مبلغ تسویه شده</p>
          <p class="mt-2 text-2xl font-black text-emerald-600">{{ settledAmountFormatted }}</p>
        </div>
        <div class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p class="text-sm text-slate-500">مبلغ تسویه نشده</p>
          <p class="mt-2 text-2xl font-black text-rose-600">{{ remainingAmountFormatted }}</p>
        </div>
      </section>

      <section class="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="mt-4 grid gap-3 lg:grid-cols-[minmax(260px,1fr)_auto_auto] lg:items-end">
          <div class="min-w-0 space-y-2">
            <label class="block text-sm font-semibold text-slate-700">جستجو در فاکتورها</label>
            <div class="rounded-2xl border border-slate-200 bg-white px-2 py-1 shadow-sm focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100">
              <JalaliDatePicker v-model="searchDate" />
            </div>
          </div>

          <button
            @click="clearSearch"
            class="inline-flex h-[46px] items-center justify-center rounded-2xl bg-slate-100 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-200"
          >
            پاک کردن
          </button>

          <button
            :class="unsettledOnly ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/15' : 'border border-amber-200 bg-amber-50 text-amber-700'"
            @click="toggleUnsettledCustomer"
            class="inline-flex h-[46px] items-center justify-center rounded-2xl px-4 text-sm font-semibold transition hover:-translate-y-0.5"
          >
            تسویه نشده
          </button>
        </div>
      </section>

      <section class="overflow-hidden rounded-xl bg-white shadow">
        <div class="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
          <h2 class="font-semibold text-gray-700">فاکتورها</h2>
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-400">{{ totalRows.toLocaleString('fa-IR') }} فاکتور</span>
            <div class="flex items-center gap-2 text-sm text-gray-500">
              <select v-model.number="pageSize" class="rounded-md border border-gray-300 bg-white px-2 py-1 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option v-for="size in pageSizeOptions" :key="size" :value="size">{{ size.toLocaleString('fa-IR') }}</option>
              </select>
            </div>
          </div>
        </div>

        <div v-if="invoiceStore.loading" class="flex items-center justify-center py-16">
          <div class="flex flex-col items-center gap-3">
            <svg class="h-10 w-10 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span class="text-gray-500">در حال بارگذاری...</span>
          </div>
        </div>

        <InvoiceTable v-else :invoices="paginatedInvoices" :show-customer-column="false" :show-actions="true" @edit="openEditModal" @delete="openDeleteModal" />

        <div v-if="!invoiceStore.loading && totalRows > 0" class="flex flex-col items-center justify-between gap-3 border-t border-gray-100 bg-white px-5 py-4 sm:flex-row">
          <p class="text-sm text-gray-500">
            نمایش
            <span class="font-medium text-gray-700">{{ (rowStartIndex + 1).toLocaleString('fa-IR') }}</span>
            تا
            <span class="font-medium text-gray-700">{{ Math.min(rowStartIndex + pageSize, totalRows).toLocaleString('fa-IR') }}</span>
            از
            <span class="font-medium text-gray-700">{{ totalRows.toLocaleString('fa-IR') }}</span>
          </p>

          <div class="flex items-center gap-2">
            <button @click="goToPage(currentPage - 1)" :disabled="currentPage === 1" class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">قبلی</button>
            <span class="text-sm text-gray-600">صفحه {{ currentPage.toLocaleString('fa-IR') }} از {{ totalPages.toLocaleString('fa-IR') }}</span>
            <button @click="goToPage(currentPage + 1)" :disabled="currentPage === totalPages" class="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40">بعدی</button>
          </div>
        </div>
      </section>
    </main>

    <InvoiceForm :is-open="showInvoiceForm" :customer-id="customerId" :invoice-data="selectedInvoice" :customers-list="[]" @save="handleSaveInvoice" @close="closeInvoiceForm" />

    <ConfirmModal
      :is-open="showConfirmDelete"
      title="حذف فاکتور"
      message="آیا از حذف این فاکتور مطمئن هستید؟ این عملیات قابل بازگشت نیست."
      :loading="deleting"
      @confirm="handleDeleteInvoice"
      @cancel="showConfirmDelete = false"
    />
  </div>
</template>
<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useInvoiceStore } from '../stores/invoiceStore';

import InvoiceTable from '../components/InvoiceTable.vue';
import InvoiceForm from '../components/InvoiceForm.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
import JalaliDatePicker from '../components/JalaliDatePicker.vue';
import { toGregorianDate } from '../utils/dateConverter';

const props = defineProps({
  id: { type: [String, Number], required: true }
});

const router = useRouter();
const toast = useToast();
const invoiceStore = useInvoiceStore();


const customerId = computed(() => parseInt(props.id));
const customer = ref(null);
const showInvoiceForm = ref(false);
const selectedInvoice = ref(null);
const showConfirmDelete = ref(false);
const deleteTargetId = ref(null);
const deleting = ref(false);
const searchDate = ref('');
const unsettledOnly = ref(false);
const customerNotesDraft = ref('');
const customerFormSaving = ref(false);
const accountStatusOptions = ['خوش حساب', 'بد حساب', 'پرداخت نقدی', 'هماهنگی با مدیر'];
const currentPage = ref(1);
const pageSize = ref(15);
const pageSizeOptions = [10, 15, 20, 50, 100];
let filterRequestId = 0;
const customerProfileDraft = ref({
  first_name: '',
  last_name: '',
  phone: '',
  referrer: '',
  account_status: ''
});

const profileChanged = computed(() => {
  const currentFirstName = String(customer.value?.first_name || '').trim();
  const currentLastName = String(customer.value?.last_name || '').trim();
  const currentPhone = String(customer.value?.phone || '').trim();
  const currentReferrer = String(customer.value?.referrer || '').trim();
  const currentStatus = String(customer.value?.account_status || '').trim();

  return (
    currentFirstName !== String(customerProfileDraft.value.first_name || '').trim() ||
    currentLastName !== String(customerProfileDraft.value.last_name || '').trim() ||
    currentPhone !== String(customerProfileDraft.value.phone || '').trim() ||
    currentReferrer !== String(customerProfileDraft.value.referrer || '').trim() ||
    currentStatus !== String(customerProfileDraft.value.account_status || '').trim()
  );
});

const notesChanged = computed(() => {
  const currentNotes = String(customer.value?.notes || '').trim();
  const draft = String(customerNotesDraft.value || '').trim();
  return currentNotes !== draft;
});

const customerFormChanged = computed(() => profileChanged.value || notesChanged.value);

const totalRows = computed(() => invoiceStore.currentInvoices.length);
const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)));
const rowStartIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const paginatedInvoices = computed(() =>
  invoiceStore.currentInvoices.slice(rowStartIndex.value, rowStartIndex.value + pageSize.value)
);

watch(pageSize, () => {
  currentPage.value = 1;
});

watch(searchDate, () => {
  applyCustomerInvoiceFilters();
});

watch([totalRows, totalPages], () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }

  if (currentPage.value < 1) {
    currentPage.value = 1;
  }
});

// Computed stats
const settledCount = computed(() =>
  invoiceStore.currentInvoices.filter(i => i.is_settled).length
);

const settledAmount = computed(() => {
  return invoiceStore.currentInvoices
    .filter(i => i.is_settled)
    .reduce((sum, i) => sum + (Number(i.price) || 0), 0);
});

const settledAmountFormatted = computed(() => {
  return settledAmount.value.toLocaleString('fa-IR') + ' تومان';
});

const remainingAmount = computed(() =>
  invoiceStore.currentInvoices
    .filter(i => !i.is_settled)
    .reduce((sum, i) => sum + (Number(i.price) || 0), 0)
);
const remainingAmountFormatted = computed(() =>
  remainingAmount.value.toLocaleString('fa-IR') + ' تومان'
);

// Load customer invoices on mount
onMounted(async () => {
  await loadCustomerInvoices();
});

async function loadCustomerInvoices() {
  try {
    currentPage.value = 1;
    customer.value = await invoiceStore.fetchCustomerInvoices(customerId.value);
    customerProfileDraft.value = {
      first_name: customer.value?.first_name || '',
      last_name: customer.value?.last_name || '',
      phone: customer.value?.phone || '',
      referrer: customer.value?.referrer || '',
      account_status: customer.value?.account_status || ''
    };
    customerNotesDraft.value = customer.value?.notes || '';
  } catch (err) {
    toast.error('خطا در بارگذاری فاکتورهای مشتری');
    if (err.response?.status === 404) {
      router.push('/home');
    }
  }
}

async function saveCustomerForm() {
  if (!customerFormChanged.value) return;

  customerFormSaving.value = true;

  try {
    if (profileChanged.value) {
      const firstName = String(customerProfileDraft.value.first_name || '').trim();
      const lastName = String(customerProfileDraft.value.last_name || '').trim();
      if (!firstName || !lastName) {
        toast.error('نام و نام خانوادگی الزامی است');
        return;
      }

      const profileResult = await invoiceStore.updateCustomerProfile(customerId.value, {
        first_name: firstName,
        last_name: lastName,
        phone: String(customerProfileDraft.value.phone || '').trim() || null,
        referrer: String(customerProfileDraft.value.referrer || '').trim() || null,
        account_status: String(customerProfileDraft.value.account_status || '').trim() || null
      });

      if (!profileResult.success) {
        toast.error(profileResult.message || 'ذخیره مشخصات مشتری با خطا مواجه شد');
        return;
      }

      customer.value = {
        ...customer.value,
        name: profileResult.data?.name || customer.value?.name || '',
        first_name: profileResult.data?.first_name || '',
        last_name: profileResult.data?.last_name || '',
        phone: profileResult.data?.phone || '',
        referrer: profileResult.data?.referrer || '',
        account_status: profileResult.data?.account_status || ''
      };
    }

    if (notesChanged.value) {
      const notesResult = await invoiceStore.updateCustomerNotes(customerId.value, customerNotesDraft.value);
      if (!notesResult.success) {
        toast.error(notesResult.message || 'ذخیره توضیحات با خطا مواجه شد');
        return;
      }

      customer.value = {
        ...customer.value,
        notes: notesResult.data?.notes || ''
      };
    }

    customerProfileDraft.value = {
      first_name: customer.value?.first_name || '',
      last_name: customer.value?.last_name || '',
      phone: customer.value?.phone || '',
      referrer: customer.value?.referrer || '',
      account_status: customer.value?.account_status || ''
    };
    customerNotesDraft.value = customer.value?.notes || '';

    toast.success('اطلاعات مشتری با موفقیت ذخیره شد');
  } finally {
    customerFormSaving.value = false;
  }
}

async function applyCustomerInvoiceFilters() {
  currentPage.value = 1;
  const requestId = ++filterRequestId;

  try {
    const dateFilter = String(searchDate.value || '').trim();

    if (dateFilter) {
      const greg = toGregorianDate(dateFilter);
      if (!greg) {
        toast.error('تاریخ انتخاب شده نامعتبر است');
        return;
      }

      await invoiceStore.searchInvoices({
        start_date: greg,
        end_date: greg,
        customer_id: customerId.value
      });
    } else {
      await loadCustomerInvoices();
    }

    if (requestId !== filterRequestId) return;

    if (unsettledOnly.value) {
      invoiceStore.currentInvoices = invoiceStore.currentInvoices.filter(i => !i.is_settled);
    }
  } catch (err) {
    toast.error('خطا در جستجو');
  }
}

async function clearSearch() {
  currentPage.value = 1;
  unsettledOnly.value = false;
  if (searchDate.value) {
    searchDate.value = '';
  } else {
    await applyCustomerInvoiceFilters();
  }
}

// Toggle unsettled-only view for this customer
async function toggleUnsettledCustomer() {
  unsettledOnly.value = !unsettledOnly.value;
  await applyCustomerInvoiceFilters();
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}

// Modal handlers
function openAddModal() {
  selectedInvoice.value = null;
  showInvoiceForm.value = true;
}

function openEditModal(invoice) {
  selectedInvoice.value = invoice;
  showInvoiceForm.value = true;
}

function closeInvoiceForm() {
  showInvoiceForm.value = false;
  selectedInvoice.value = null;
}

function openDeleteModal(invoiceId) {
  deleteTargetId.value = invoiceId;
  showConfirmDelete.value = true;
}

// Save invoice
async function handleSaveInvoice({ data, isEdit }) {
  let result;

  if (isEdit && selectedInvoice.value) {
    result = await invoiceStore.updateInvoice(selectedInvoice.value.id, data);
    if (result.success) {
      toast.success('فاکتور با موفقیت ویرایش شد');
    } else {
      toast.error(result.message);
      return;
    }
  } else {
    result = await invoiceStore.addInvoice(data);
    if (result.success) {
      toast.success('فاکتور با موفقیت اضافه شد');
    } else {
      toast.error(result.message);
      return;
    }
  }

  closeInvoiceForm();
  await applyCustomerInvoiceFilters();
}

// Delete invoice
async function handleDeleteInvoice() {
  if (!deleteTargetId.value) return;

  deleting.value = true;
  const result = await invoiceStore.deleteInvoice(deleteTargetId.value);
  deleting.value = false;

  if (result.success) {
    toast.success('فاکتور با موفقیت حذف شد');
    showConfirmDelete.value = false;
    deleteTargetId.value = null;
    await applyCustomerInvoiceFilters();
  } else {
    toast.error(result.message);
  }
}

// Navigate back
function goBack() {
  router.push('/home');
}
</script>
