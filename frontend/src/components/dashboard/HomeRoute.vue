<template>
  <div>
    <Teleport defer to="#app-shell-actions">
      <button @click="openAddModal" class="app-button-primary w-full justify-between">
        <span> حساب جدید</span>
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
      <button @click="openAddCustomerModal" class="app-button-primary w-full justify-between">
        <span> کاربر جدید</span>
        <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
        </svg>
      </button>
    </Teleport>

    <AppContentState v-if="loading" loading message="در حال بارگذاری نمای کلی سیستم..."
      surface-class="border-0 bg-transparent py-24 shadow-none" />

    <div v-else class="space-y-6">
      <section class="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        <AppStatCard label="کل حساب‌ها" :value="formatNumber(totalInvoices)" value-class="text-indigo-600" />
        <AppStatCard label="مبلغ کل" :value="formatCurrency(totalRevenue)" value-class="text-emerald-600" />
        <AppStatCard label="تسویه‌نشده" :value="formatCurrency(unsettledAmount)" value-class="text-rose-600" />
        <AppStatCard label="کل کاربران" :value="formatNumber(totalCustomers)" value-class="text-sky-600" />
        <AppStatCard label="رزرو فعال" :value="formatNumber(activeReservations)" value-class="text-amber-600" />
        <AppStatCard label="بهترین مشتری" :value="123456" value-class="text-amber-600" />
      </section>

      <section class="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <div class="app-panel">
          <div class="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div>
              <h3 class="text-base font-bold text-slate-800">آخرین حساب‌ها</h3>
            </div>
            <button type="button" class="app-button-secondary px-3 py-2 text-xs" @click="router.push('/accounts')">
              مشاهده همه
            </button>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th class="px-5 py-3 text-right text-xs font-bold text-slate-500">مشتری</th>
                  <th class="px-5 py-3 text-right text-xs font-bold text-slate-500">تاریخ</th>
                  <th class="px-5 py-3 text-right text-xs font-bold text-slate-500">مبلغ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="invoice in latestInvoices" :key="invoice.id"
                  class="border-b border-slate-100 last:border-b-0">
                  <td class="px-5 py-4 text-sm font-semibold text-slate-700">{{ invoice.customer_name || 'بدون نام' }}
                  </td>
                  <td class="px-5 py-4 text-sm text-slate-500">{{ toPersianDate(invoice.date) }}</td>
                  <td class="px-5 py-4 text-sm font-bold text-slate-700">{{ formatCurrency(invoice.price) }}</td>
                </tr>
                <tr v-if="!latestInvoices.length">
                  <td colspan="3" class="px-5 py-10 text-center text-sm text-slate-400">حسابی برای نمایش وجود ندارد</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="space-y-6">
          <div class="app-panel p-5">
            <div class="mb-4 text-center">
              <h3 class="text-base font-bold text-slate-800">وضعیت رزرو</h3>
            </div>
            <div class="space-y-3 text-center">
              <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p class="text-xs text-slate-500">واحدهای آزاد</p>
                <p class="mt-2 text-lg font-black text-emerald-700">{{ formatNumber(inventorySummary.total_available) }}
                </p>
              </div>
              <div class="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                <p class="text-xs text-slate-500">واحدهای رزروشده</p>
                <p class="mt-2 text-lg font-black text-rose-600">{{ formatNumber(inventorySummary.total_reserved) }}</p>
              </div>
            </div>
          </div>

          <div class="app-panel p-5">
            <div class="mb-4 text-center">
              <h3 class="text-base font-bold text-slate-800">میانبرها</h3>
            </div>
            <div class="grid gap-3">
              <button type="button" class="app-button-secondary justify-between" @click="router.push('/accounts')">
                <span>ورود به حساب‌ها</span>
              </button>
              <button type="button" class="app-button-secondary justify-between" @click="router.push('/users')">
                <span>ورود به کاربران</span>
              </button>
              <button type="button" class="app-button-secondary justify-between"
                @click="router.push('/inventory/reservations/active')">
                <span>رزروهای فعال</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>

  <InvoiceForm :is-open="showInvoiceForm" :customer-id="null" :invoice-data="selectedInvoice"
    :customers-list="invoiceStore.customers" @save="handleSaveInvoice" @close="closeInvoiceForm" />

  <CustomerFormModal :is-open="showCustomerForm" :existing-customers="invoiceStore.customers" @close="closeCustomerForm"
    @saved="handleCustomerSaved" />

</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import AppStatCard from '../AppStatCard.vue';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { useInventoryStore } from '../../stores/inventoryStore';
import { toPersianDate } from '../../utils/dateConverter';
import InvoiceForm from '../InvoiceForm.vue';
import CustomerFormModal from '../CustomerFormModal.vue';


const router = useRouter();
const toast = useToast();
const invoiceStore = useInvoiceStore();
const inventoryStore = useInventoryStore();
const selectedInvoice = ref(null);
const showInvoiceForm = ref(false);
const showCustomerForm = ref(false);

const loading = ref(true);

const totalInvoices = computed(() => invoiceStore.allInvoices.length);
const totalRevenue = computed(() =>
  invoiceStore.allInvoices.reduce((sum, invoice) => sum + (Number(invoice.price) || 0), 0)
);
const unsettledAmount = computed(() =>
  invoiceStore.allInvoices
    .filter((invoice) => !invoice.is_settled)
    .reduce((sum, invoice) => sum + (Number(invoice.price) || 0), 0)
);
const totalCustomers = computed(() => invoiceStore.customersOverview.length);
const activeReservations = computed(() => inventoryStore.activeReservations.length);
const inventorySummary = computed(() => inventoryStore.dashboard.summary || {});

const latestInvoices = computed(() =>
  [...invoiceStore.allInvoices]
    .sort((left, right) => {
      const dateCompare = String(right.date || '').localeCompare(String(left.date || ''));
      if (dateCompare !== 0) return dateCompare;
      return (Number(right.id) || 0) - (Number(left.id) || 0);
    })
    .slice(0, 9)
);

function openAddModal() {
  selectedInvoice.value = null;
  showInvoiceForm.value = true;
}

function closeInvoiceForm() {
  showInvoiceForm.value = false;
  selectedInvoice.value = null;
}

function openAddCustomerModal() {
  showCustomerForm.value = true;
}

function closeCustomerForm() {
  showCustomerForm.value = false;
}

async function handleSaveInvoice({ data, isEdit }) {
  let result;

  if (isEdit && selectedInvoice.value) {
    result = await invoiceStore.updateInvoice(selectedInvoice.value.id, data);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('فاکتور با موفقیت ویرایش شد');
  } else {
    result = await invoiceStore.addInvoice(data);
    if (!result.success) {
      toast.error(result.message);
      return;
    }
    toast.success('فاکتور با موفقیت اضافه شد');
  }

  closeInvoiceForm();
  await Promise.all([
    invoiceStore.fetchAllInvoices(),
    invoiceStore.fetchCustomersOverview()
  ]);
}

async function handleCustomerSaved() {
  closeCustomerForm();
  await Promise.all([
    invoiceStore.fetchCustomers(),
    invoiceStore.fetchCustomersOverview()
  ]);
}

onMounted(async () => {
  loading.value = true;
  try {
    await Promise.all([
      invoiceStore.fetchCustomers(),
      invoiceStore.fetchAllInvoices(),
      invoiceStore.fetchCustomersOverview(),
      inventoryStore.fetchDashboard(),
      inventoryStore.fetchActiveReservations()
    ]);
  } finally {
    loading.value = false;
  }
});


function formatNumber(value) {
  return Math.round(Number(value) || 0).toLocaleString('fa-IR');
}

function formatCurrency(value) {
  return `${formatNumber(value)} تومان`;
}
</script>
