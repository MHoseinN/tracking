<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white shadow-sm sticky top-0 z-10">
      <div class="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <!-- Back button -->
          <button @click="goBack" class="flex items-center gap-1 text-gray-600 hover:text-gray-900 transition">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
            <span class="text-sm font-medium">بازگشت</span>
          </button>

          <div class="w-px h-6 bg-gray-300"></div>

          <!-- Customer name -->
          <div>
            <h1 class="text-xl font-bold text-gray-800">
              {{ customer?.name || 'مشتری' }}
            </h1>
            <p class="text-xs text-gray-500">مشاهده فاکتورهای مشتری</p>
          </div>
        </div>

        <!-- Add invoice button -->
        <button @click="openAddModal"
          class="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition shadow-sm text-sm">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          افزودن فاکتور
        </button>
      </div>
    </header>

    <!-- Main content -->
    <main class="max-w-7xl mx-auto px-4 py-6 space-y-5">
          <!-- Search by single Persian date -->
          <div class="bg-white rounded-xl shadow p-4 flex items-center justify-center gap-3">
            <div>
              <JalaliDatePicker v-model="searchDate"/>
            </div>
              <div class="flex items-end gap-2">
                <button @click="performSearch" class="bg-blue-600 text-white px-4 py-2 rounded-lg">جستجو</button>
                <button @click="clearSearch" class="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">پاک کردن</button>
                <button
                  :class="unsettledOnly ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-700'"
                  @click="toggleUnsettledCustomer"
                  class="px-3 py-2 rounded-lg ml-2"
                >
                  تسویه‌نشده
                </button>
              </div>
          </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-2xl font-bold text-blue-600">{{ invoiceStore.currentInvoices.length }}</p>
          <p class="text-sm text-gray-500 mt-1">تعداد فاکتورها</p>
        </div>
        <div class="bg-white rounded-xl shadow p-4 text-center">
          <p class="text-2xl font-bold text-green-600">{{ settledCount }}</p>
          <p class="text-sm text-gray-500 mt-1">تسویه شده</p>
        </div>
        <div class="bg-white rounded-xl shadow p-4 text-center col-span-2 sm:col-span-1">
          <p class="text-lg font-bold text-green-600">{{ settledAmountFormatted }}</p>
          <p class="text-sm text-gray-500 mt-1">مبلغ تسویه شده </p>
        </div>
        <div class="bg-white rounded-xl shadow p-4 text-center col-span-2 sm:col-span-1">
          <p class="text-lg font-bold text-orange-600">{{ remainingAmountFormatted }}</p>
          <p class="text-sm text-gray-500 mt-1">مبلغ تسویه نشده</p>
        </div>
      </div>

      <!-- Invoice table -->
      <div class="bg-white rounded-xl shadow overflow-hidden">
        <div class="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 class="font-semibold text-gray-700">فاکتورها</h2>
          <span class="text-sm text-gray-400">{{ invoiceStore.currentInvoices.length }} فاکتور</span>
        </div>

        <!-- Loading -->
        <div v-if="invoiceStore.loading" class="flex items-center justify-center py-16">
          <div class="flex flex-col items-center gap-3">
            <svg class="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            <span class="text-gray-500">در حال بارگذاری...</span>
          </div>
        </div>

        <InvoiceTable v-else :invoices="invoiceStore.currentInvoices" :show-customer-column="false" :show-actions="true"
          @edit="openEditModal" @delete="openDeleteModal" />
      </div>
    </main>

    <!-- Invoice Form Modal -->
    <InvoiceForm :is-open="showInvoiceForm" :customer-id="customerId" :invoice-data="selectedInvoice"
      :customers-list="[]" @save="handleSaveInvoice" @close="closeInvoiceForm" />

    <!-- Confirm Delete Modal -->
    <ConfirmModal :is-open="showConfirmDelete" title="حذف فاکتور"
      message="آیا از حذف این فاکتور اطمینان دارید؟ این عملیات قابل بازگشت نیست." :loading="deleting"
      @confirm="handleDeleteInvoice" @cancel="showConfirmDelete = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
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
    customer.value = await invoiceStore.fetchCustomerInvoices(customerId.value);
  } catch (err) {
    toast.error('خطا در بارگذاری فاکتورهای مشتری');
    if (err.response?.status === 404) {
      router.push('/home');
    }
  }
}

// Search handler
async function handleSearch(params) {
  if (Object.keys(params).length === 0) {
    // Reset: load all customer invoices
    await loadCustomerInvoices();
  } else {
    try {
      await invoiceStore.searchInvoices({
        ...params,
        customer_id: customerId.value
      });
    } catch (err) {
      toast.error('خطا در جستجو');
    }
  }
}

async function performSearch() {
  if (!searchDate.value) {
    await handleSearch({});
    return;
  }

  const greg = toGregorianDate(searchDate.value);
  if (!greg) {
    toast.error('تاریخ انتخاب شده نامعتبر است');
    return;
  }

  try {
    await invoiceStore.searchInvoices({ start_date: greg, end_date: greg, customer_id: customerId.value });
  } catch (err) {
    toast.error('خطا در جستجو');
  }
}

async function clearSearch() {
  searchDate.value = '';
  await handleSearch({});
}

// Toggle unsettled-only view for this customer
async function toggleUnsettledCustomer() {
  unsettledOnly.value = !unsettledOnly.value;
  if (unsettledOnly.value) {
    // reload this customer's invoices then filter
    await loadCustomerInvoices();
    invoiceStore.currentInvoices = invoiceStore.currentInvoices.filter(i => !i.is_settled);
  } else {
    await loadCustomerInvoices();
  }
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
  await loadCustomerInvoices();
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
    await loadCustomerInvoices();
  } else {
    toast.error(result.message);
  }
}

// Navigate back
function goBack() {
  router.push('/home');
}
</script>
