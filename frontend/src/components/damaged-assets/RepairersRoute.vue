<template>
  <div ref="tableRef" class="space-y-5">
    <Teleport to="#app-shell-actions">
      <AppButton variant="secondary" icon="back" block @click="router.push('/damaged-assets')">بازگشت</AppButton>
      <AppButton variant="primary" icon="userAdd" block @click="openRepairer()">افزودن تعمیرکننده</AppButton>
    </Teleport>

    <AppTablePanel title="تعمیرکننده‌ها و مراکز خدمات" :count="loading ? null : filteredRepairers.length"
      description="بدهی هر مرکز از هزینه تعمیر اقلام منهای پرداخت‌های ثبت‌شده محاسبه می‌شود.">
      <template #filters>
        <AppFilterBar columns-class="md:grid-cols-2 xl:grid-cols-3">
          <label class="app-filter-field"><span class="app-filter-label">جست‌وجو</span>
            <input v-model.trim="search" type="search" class="app-filter-control" placeholder="نام یا شماره تماس" /></label>
          <label class="app-filter-field"><span class="app-filter-label">وضعیت بدهی</span>
            <CustomSelect v-model="debtFilter" :options="debtOptions" trigger-class="app-filter-control" /></label>
          <template #actions><AppButton variant="secondary" @click="search = ''; debtFilter = 'all'">پاک‌کردن فیلترها</AppButton></template>
        </AppFilterBar>
      </template>
      <AppDataTable :column-count="6" :loading="loading" :empty="!filteredRepairers.length" min-width="800px"
        sticky-header empty-message="تعمیرکننده‌ای با این جست‌وجو یا فیلتر پیدا نشد.">
        <template #head><tr><th>ردیف</th><th>نام تعمیرکننده / مرکز</th><th>تلفن</th>
          <th>مبلغ پرداخت‌شده</th><th>مانده بدهی</th><th>عملیات</th></tr></template>
        <tr v-for="(repairer, index) in paginatedRepairers" :key="repairer.id" class="app-table-row">
          <td class="text-center text-slate-500">{{ (rowStartIndex + index + 1).toLocaleString('fa-IR') }}</td>
          <td class="font-bold text-slate-900">{{ repairer.name }}</td><td class="text-center">{{ repairer.phone || '—' }}</td>
          <td class="text-center">{{ fmt(repairer.paid) }} تومان</td>
          <td class="text-center font-bold" :class="repairer.due > 0 ? 'text-rose-700' : 'text-emerald-700'">{{ fmt(repairer.due) }} تومان</td>
          <td><div class="flex justify-center gap-2"><AppButton variant="info" size="sm" @click="openPayments(repairer)">پرداخت‌ها</AppButton>
            <AppButton variant="secondary" size="sm" @click="openRepairer(repairer)">ویرایش</AppButton>
            <AppButton variant="danger" size="sm" @click="toDelete = repairer">حذف</AppButton></div></td>
        </tr>
      </AppDataTable>
      <template #footer><AppPagination :total-rows="totalRows" :row-start-index="rowStartIndex"
        :page-size="pageSize" :page-size-options="pageSizeOptions" :current-page="currentPage"
        :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers"
        @update:page-size="pageSize = $event" @go-to-page="goToPage" /></template>
    </AppTablePanel>

    <AppModal :is-open="repairerOpen" :title="repairerForm.id ? 'ویرایش تعمیرکننده' : 'افزودن تعمیرکننده'"
      size="md" :busy="busy" @close="repairerOpen = false">
      <form id="repairer-form" class="space-y-4" @submit.prevent="saveRepairer">
        <label class="app-filter-field"><span class="app-filter-label">نام تعمیرکننده یا مرکز خدمات</span>
          <input v-model.trim="repairerForm.name" class="app-input h-12" maxlength="255" required /></label>
        <label class="app-filter-field"><span class="app-filter-label">شماره تماس</span>
          <input v-model.trim="repairerForm.phone" class="app-input h-12" maxlength="50" /></label>
        <label class="app-filter-field"><span class="app-filter-label">توضیحات</span>
          <textarea v-model.trim="repairerForm.notes" class="app-input min-h-24" /></label>
        <p v-if="formError" class="text-sm text-rose-700">{{ formError }}</p>
      </form>
      <template #footer><AppButton type="submit" form="repairer-form" variant="primary" :loading="busy">ذخیره</AppButton>
        <AppButton variant="secondary" :disabled="busy" @click="repairerOpen = false">انصراف</AppButton></template>
    </AppModal>

    <AppModal :is-open="Boolean(paymentRepairer)" :title="`حساب ${paymentRepairer?.name || ''}`"
      size="lg" :busy="busy" @close="paymentRepairer = null">
      <div v-if="paymentRepairer" class="space-y-5">
        <div class="grid gap-3 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-3">
          <p>هزینه تعمیرها: <strong>{{ fmt(totalCost(paymentRepairer)) }} تومان</strong></p>
          <p>پرداخت‌شده: <strong>{{ fmt(currentRepairer?.paid) }} تومان</strong></p>
          <p>مانده بدهی: <strong class="text-rose-700">{{ fmt(currentRepairer?.due) }} تومان</strong></p>
        </div>
        <form id="repairer-payment-form" class="grid gap-4 sm:grid-cols-2" @submit.prevent="recordPayment">
          <label class="app-filter-field"><span class="app-filter-label">مبلغ پرداخت (تومان)</span>
            <input v-model.number="paymentForm.amount_toman" type="number" min="1" :max="currentRepairer?.due"
              class="app-input h-12" required /></label>
          <label class="app-filter-field"><span class="app-filter-label">تاریخ پرداخت</span>
            <JalaliDatePicker v-model="paymentForm.paid_at" input-class="app-input h-12" /></label>
          <label class="app-filter-field sm:col-span-2"><span class="app-filter-label">توضیحات</span>
            <input v-model.trim="paymentForm.notes" class="app-input h-12" /></label>
          <p v-if="formError" class="text-sm text-rose-700 sm:col-span-2">{{ formError }}</p>
        </form>
        <p class="text-xs text-slate-500">پرداخت از قدیمی‌ترین بدهی‌های این تعمیرکننده کسر می‌شود.</p>
        <div><h3 class="mb-2 font-bold">وضعیت اقلام تعمیری</h3>
          <div v-for="asset in repairerAssets" :key="asset.id" class="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
            <span>{{ asset.product_name_snapshot }} · اموال {{ asset.asset_number }}<span v-if="asset.deleted_at" class="mr-2 text-xs text-slate-500">(پرونده حذف‌شده)</span></span>
            <span>هزینه {{ fmt(asset.repair_cost_toman) }} · مانده {{ fmt(asset.repair_due_toman) }} تومان</span>
          </div><p v-if="!repairerAssets.length" class="text-sm text-slate-500">قلمی ثبت نشده است.</p></div>
        <div><h3 class="mb-2 font-bold">تاریخچه پرداخت‌ها</h3>
          <div v-for="payment in payments" :key="payment.id" class="flex flex-wrap justify-between gap-2 border-b py-2 text-sm">
            <span>{{ faDate(payment.paid_at) }} · {{ payment.notes || 'بدون توضیح' }}</span>
            <strong>{{ fmt(payment.amount_toman) }} تومان</strong>
          </div><p v-if="!payments.length" class="text-sm text-slate-500">پرداختی ثبت نشده است.</p></div>
      </div>
      <template #footer><AppButton type="submit" form="repairer-payment-form" variant="primary"
        :disabled="!currentRepairer?.due" :loading="busy">ثبت پرداخت</AppButton>
        <AppButton variant="secondary" :disabled="busy" @click="paymentRepairer = null">بستن</AppButton></template>
    </AppModal>

    <ConfirmModal :is-open="Boolean(toDelete)" title="حذف تعمیرکننده"
      :message="`تعمیرکننده «${toDelete?.name || ''}» حذف شود؟`" :loading="busy"
      @confirm="deleteRepairer" @cancel="toDelete = null" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppFilterBar from '../ui/AppFilterBar.vue';
import AppModal from '../ui/AppModal.vue';
import AppTablePanel from '../ui/AppTablePanel.vue';
import AppPagination from '../AppPagination.vue';
import ConfirmModal from '../ConfirmModal.vue';
import CustomSelect from '../CustomSelect.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { toGregorianDate, toPersianDate } from '../../utils/dateConverter';
import { getApiErrorMessage } from '../../utils/apiError';
import { damagedAssetService as service } from '../../modules/damaged-assets/api/damagedAsset.service';

const router = useRouter(), toast = useToast(), tableRef = ref(null);
const repairers = ref([]), assets = ref([]), payments = ref([]);
const loading = ref(false), busy = ref(false), repairerOpen = ref(false), formError = ref('');
const paymentRepairer = ref(null), toDelete = ref(null);
const search = ref(''), debtFilter = ref('all');
const repairerForm = reactive({ id: null, name: '', phone: '', notes: '' });
const paymentForm = reactive({ amount_toman: '', paid_at: '', notes: '' });
const fmt = (value) => Number(value || 0).toLocaleString('fa-IR');
const faDate = (value) => value ? toPersianDate(String(value).slice(0, 10)) : '';
const debtOptions = [{ label: 'همه', value: 'all' }, { label: 'دارای بدهی', value: 'open' }, { label: 'تسویه‌شده', value: 'settled' }];
const filteredRepairers = computed(() => repairers.value.filter((repairer) => {
  const query = search.value.toLowerCase();
  return (!query || [repairer.name, repairer.phone].some((value) => String(value || '').toLowerCase().includes(query)))
    && (debtFilter.value === 'all' || (debtFilter.value === 'open' ? repairer.due > 0 : repairer.due === 0));
}));
const { currentPage, pageSize, pageSizeOptions, totalRows, totalPages, rowStartIndex,
  paginatedItems: paginatedRepairers, visiblePageNumbers, goToPage } = usePaginatedList(filteredRepairers,
  { initialPageSize: 15, pageSizeOptions: [10, 15, 20, 50, 100], resetSources: [search, debtFilter], scrollTarget: tableRef });
const currentRepairer = computed(() => repairers.value.find((repairer) => repairer.id === paymentRepairer.value?.id));
const repairerAssets = computed(() => assets.value.filter((asset) => asset.repairer_id === paymentRepairer.value?.id && asset.repair_cost_toman > 0)
  .sort((a, b) => String(a.returned_at || '').localeCompare(String(b.returned_at || ''))));
const totalCost = (repairer) => assets.value.filter((asset) => asset.repairer_id === repairer?.id)
  .reduce((sum, asset) => sum + Number(asset.repair_cost_toman || 0), 0);
async function refresh() {
  loading.value = true;
  try { const [repairerResult, assetResult] = await Promise.all([service.getRepairers(), service.getAssets(true)]);
    repairers.value = repairerResult.data.repairers; assets.value = assetResult.data.assets; }
  catch (error) { toast.error(getApiErrorMessage(error)); } finally { loading.value = false; }
}
async function perform(task, message) {
  busy.value = true; formError.value = '';
  try { await task(); await refresh(); toast.success(message); return true; }
  catch (error) { formError.value = getApiErrorMessage(error); toast.error(formError.value); return false; }
  finally { busy.value = false; }
}
function openRepairer(repairer = null) {
  Object.assign(repairerForm, { id: repairer?.id || null, name: repairer?.name || '', phone: repairer?.phone || '', notes: repairer?.notes || '' });
  formError.value = ''; repairerOpen.value = true;
}
async function saveRepairer() {
  const payload = { name: repairerForm.name, phone: repairerForm.phone, notes: repairerForm.notes };
  if (await perform(() => repairerForm.id ? service.updateRepairer(repairerForm.id, payload)
    : service.createRepairer(payload), 'اطلاعات تعمیرکننده ذخیره شد')) repairerOpen.value = false;
}
async function deleteRepairer() {
  if (await perform(() => service.deleteRepairer(toDelete.value.id), 'تعمیرکننده حذف شد')) toDelete.value = null;
}
async function openPayments(repairer) {
  paymentRepairer.value = repairer; formError.value = '';
  try { payments.value = (await service.getPayments(repairer.id)).data.payments; }
  catch (error) { toast.error(getApiErrorMessage(error)); }
}
async function recordPayment() {
  if (!paymentForm.paid_at) { formError.value = 'تاریخ پرداخت را انتخاب کنید'; return; }
  const repairerId = paymentRepairer.value.id;
  const payload = { ...paymentForm, paid_at: `${toGregorianDate(paymentForm.paid_at)}T12:00:00+03:30` };
  if (await perform(() => service.recordPayment(repairerId, payload), 'پرداخت ثبت شد')) {
    Object.assign(paymentForm, { amount_toman: '', paid_at: '', notes: '' });
    await openPayments(repairers.value.find((repairer) => repairer.id === repairerId));
  }
}
onMounted(refresh);
</script>
