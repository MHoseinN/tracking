<template>
  <div class="space-y-6">
    <Teleport to="#app-shell-actions">
      <div class="w-full sm:w-42">
        <CustomSelect v-model="selectedYear" :options="yearOptions" trigger-class="app-filter-control" />
      </div>
      <AppButton variant="primary" block :loading="creatingList" @click="createNewList">ایجاد لیست جدید</AppButton>
      <AppButton variant="secondary" block @click="showCustomerForm = true">افزودن مشتری</AppButton>
    </Teleport>

    <AppContentState v-if="loading" loading message="در حال بارگذاری نمای کلی سیستم..."
      surface-class="border-0 bg-transparent py-24 shadow-none" />

    <template v-else>
      <p v-if="errorMessage" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{{
        errorMessage }}</p>

      <section class="grid gap-3 md:grid-cols-3">
        <AppStatCard label="جمع فاکتورها" :value="formatCurrency(summary.total_invoiced_toman)"
          value-class="text-slate-800" />
        <AppStatCard label="مانده قابل دریافت" :value="formatCurrency(summary.outstanding_toman)"
          value-class="text-rose-600" />
        <AppStatCard label="مبلغ دریافت‌شده" :value="formatCurrency(summary.total_paid_toman)"
          value-class="text-emerald-600" />
      </section>
      <section class="grid gap-3 md:grid-cols-3">
        <AppStatCard label="تعداد فاکتورها" :value="formatNumber(summary.invoice_count)"
          value-class="text-violet-600" />
        <AppStatCard label="بهترین مشتری" :value="bestCustomer?.customer_name || '—'" value-class="text-sky-700" />
        <AppStatCard label="مانده / پیگیری" :value="formatNumber(openListCount)" value-class="text-amber-600" />
      </section>

      <section class="grid gap-6 2xl:grid-cols-2">
        <AppTablePanel>
          <template #header>
            <div class="flex w-full flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-black text-slate-900">آخرین لیست‌ها</h2>
                <span class="app-table-panel__count">{{ formatNumber(recentLists.length) }} ردیف</span>
              </div>
              <AppButton size="sm" variant="secondary" @click="router.push('/lists')">مشاهده همه لیست‌ها</AppButton>
            </div>
          </template>

          <AppDataTable class="home-table" :column-count="6" :empty="!recentLists.length" min-width="100%"
            empty-message="هنوز لیستی ثبت نشده است.">
            <template #head>
              <tr>
                <th>شماره لیست</th>
                <th>مشتری</th>
                <th>تاریخ تحویل</th>
                <th>وضعیت لیست</th>
                <th>مبلغ فاکتور</th>
                <th>جزئیات</th>
              </tr>
            </template>
            <tr v-for="list in recentLists" :key="list.id" class="app-table-row">
              <td class="font-black">{{ displayListNumber(list) }}</td>
              <td class="font-bold text-slate-900">{{ list.customer_name }}</td>
              <td>{{ formatDate(list.delivered_at || list.created_at) }}</td>
              <td>
                <AppStatusBadge group="list" :status="list.status" />
              </td>
              <td class="font-black">{{ hasInvoice(list) ? formatCurrency(list.invoice_total_toman) : '—' }}</td>
              <td>
                <AppIconButton label="مشاهده جزئیات لیست" size="sm" @click="router.push(`/lists/${list.id}`)">
                  <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="5" cy="12" r="1.7" />
                    <circle cx="12" cy="12" r="1.7" />
                    <circle cx="19" cy="12" r="1.7" />
                  </svg>
                </AppIconButton>
              </td>
            </tr>
          </AppDataTable>
        </AppTablePanel>

        <AppTablePanel>
          <template #header>
            <div class="flex w-full flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <h2 class="text-lg font-black text-slate-900">آخرین تسویه‌ها و پرداخت‌ها</h2>
                <span class="app-table-panel__count">{{ formatNumber(recentPayments.length) }} ردیف</span>
              </div>
              <AppButton size="sm" variant="secondary" @click="router.push('/lists')">پیگیری در مدیریت لیست‌ها</AppButton>
            </div>
          </template>
          <AppDataTable class="home-table" :column-count="5" :empty="!recentPayments.length" min-width="100%"
            empty-message="هنوز پرداختی ثبت نشده است.">
            <template #head>
              <tr>
                <th>مشتری</th>
                <th>شماره لیست</th>
                <th>تاریخ پرداخت</th>
                <th>مبلغ</th>
                <th>وضعیت تسویه</th>
              </tr>
            </template>
            <tr v-for="payment in recentPayments" :key="payment.id" class="app-table-row cursor-pointer"
              @click="router.push(`/lists/${payment.delivery_list_id}`)">
              <td class="font-bold text-slate-900">{{ payment.customer_name }}</td>
              <td class="font-black">{{ payment.list_number || `سابقه ${formatNumber(payment.delivery_list_id)}` }}</td>
              <td>{{ formatDateTime(payment.paid_at) }}</td>
              <td class="font-black text-emerald-700">{{ formatCurrency(payment.amount_toman) }}</td>
              <td>
                <AppStatusBadge group="settlement" :status="payment.settlement_status" />
              </td>
            </tr>
          </AppDataTable>
        </AppTablePanel>
      </section>

      <section class="grid gap-4 md:grid-cols-3">
        <AppStatCard label="تعداد مشتریان" :value="formatNumber(dashboard.customer_count)" value-class="text-sky-600" />
        <AppStatCard label="تعداد محصولات" :value="formatNumber(dashboard.product_count)"
          value-class="text-amber-600" />
        <AppStatCard label="تعداد دسته‌بندی‌ها" :value="formatNumber(dashboard.category_count)"
          value-class="text-indigo-600" />
      </section>
    </template>
  </div>

  <CustomerFormModal :is-open="showCustomerForm" :existing-customers="invoiceStore.customers"
    @close="showCustomerForm = false" @saved="handleCustomerSaved" />
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import AppStatCard from '../AppStatCard.vue';
import CustomerFormModal from '../CustomerFormModal.vue';
import CustomSelect from '../CustomSelect.vue';
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppIconButton from '../ui/AppIconButton.vue';
import AppStatusBadge from '../ui/AppStatusBadge.vue';
import AppTablePanel from '../ui/AppTablePanel.vue';
import { reportService } from '../../modules/reports/api/report.service';
import { useDeliveryListStore } from '../../stores/deliveryListStore';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { getApiErrorMessage } from '../../utils/apiError';
import { formatYear, toPersianDate } from '../../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const invoiceStore = useInvoiceStore();
const deliveryListStore = useDeliveryListStore();
const loading = ref(true);
const creatingList = ref(false);
const errorMessage = ref('');
const showCustomerForm = ref(false);
const selectedYear = ref(currentPersianYear());
const report = ref({ summary: {}, operational: { list_status: {} }, dashboard: {} });
const summary = computed(() => report.value.summary || {});
const dashboard = computed(() => report.value.dashboard || {});
const recentLists = computed(() => dashboard.value.recent_lists || []);
const recentPayments = computed(() => dashboard.value.recent_payments || []);
const bestCustomer = computed(() => report.value.top_customers?.[0] || null);
const yearOptions = computed(() => {
  const years = new Set((report.value.available_years || []).map(String));
  years.add(String(selectedYear.value));
  return [{ label: 'همه سال‌ها', value: 'all' }, ...[...years].sort((a, b) => Number(b) - Number(a))
    .map((year) => ({ label: `سال ${formatYear(year)}`, value: year }))];
});
const openListCount = computed(() => Number(report.value.operational?.list_status?.REMAINING || 0)
  + Number(report.value.operational?.list_status?.NEEDS_FOLLOW_UP || 0));

onMounted(async () => {
  await Promise.all([loadDashboard(), invoiceStore.fetchCustomers().catch(() => undefined)]);
});
async function loadDashboard() {
  loading.value = true; errorMessage.value = '';
  try {
    const params = selectedYear.value === 'all' ? {} : { persian_year: selectedYear.value };
    report.value = (await reportService.getOverview(params)).data;
  }
  catch (error) { errorMessage.value = getApiErrorMessage(error, 'دریافت اطلاعات داشبورد با خطا مواجه شد'); }
  finally { loading.value = false; }
}
async function createNewList() {
  if (creatingList.value) return;
  creatingList.value = true;
  const result = await deliveryListStore.createDraft();
  creatingList.value = false;
  if (!result.success) return toast.error(result.message);
  router.push(`/lists/${result.data.id}/edit`);
}
async function handleCustomerSaved() { showCustomerForm.value = false; await Promise.all([invoiceStore.fetchCustomers(), loadDashboard()]); }
function currentPersianYear() {
  const part = new Intl.DateTimeFormat('en-u-ca-persian', { year: 'numeric', timeZone: 'Asia/Tehran' })
    .formatToParts(new Date()).find((entry) => entry.type === 'year');
  return part?.value || 'all';
}
function hasInvoice(list) { return ['PARTIALLY_ISSUED', 'ISSUED'].includes(list.invoice_status); }
function displayListNumber(list) { return list.list_number || (list.status === 'DRAFT' ? `پیش‌نویس ${formatNumber(list.id)}` : `سابقه ${formatNumber(list.id)}`); }
function formatNumber(value) { return Math.round(Number(value) || 0).toLocaleString('fa-IR'); }
function formatCurrency(value) { return `${formatNumber(value)} تومان`; }
function formatDate(value) { return value ? toPersianDate(String(value).slice(0, 10)) : '—'; }
function formatDateTime(value) { return value ? `${formatDate(value)} - ${String(value).slice(11, 16)}` : '—'; }
watch(selectedYear, loadDashboard);
</script>

<style scoped>
.home-table :deep(.app-table) {
  width: 100%;
  table-layout: fixed;
}

.home-table :deep(th),
.home-table :deep(td) {
  padding: .7rem .5rem;
  text-align: center;
  vertical-align: middle;
}

.home-table :deep(.app-status-badge) {
  white-space: normal;
  justify-content: center;
}

@media (max-width: 767px) {

  .home-table :deep(th:nth-child(3)),
  .home-table :deep(td:nth-child(3)) {
    display: none;
  }
}
</style>
