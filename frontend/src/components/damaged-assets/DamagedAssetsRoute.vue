<template>
  <div ref="tableRef" class="space-y-5">
    <Teleport to="#app-shell-actions">
      <AppButton variant="primary" block @click="createOpen = true">ثبت پرونده</AppButton>
      <AppButton variant="secondary" block @click="router.push('/damaged-assets/repairers')">تعمیرکننده‌ها و پرداخت‌ها</AppButton>
    </Teleport>

    <AppTablePanel>
      <template #filters>
        <AppFilterBar :expanded="filtersExpanded" collapsible columns-class="grid-cols-1"
          advanced-columns-class="md:grid-cols-2 xl:grid-cols-4" @update:expanded="filtersExpanded = $event">
          <label class="app-filter-field"><span class="app-filter-label">جست‌وجو</span>
            <input v-model.trim="search" type="search" class="app-filter-control"
              placeholder="نام محصول، شماره اموال، مشتری یا شرح ایراد" /></label>
          <template #advanced>
          <label class="app-filter-field"><span class="app-filter-label">وضعیت</span>
            <CustomSelect v-model="statusFilter" :options="statusOptions" trigger-class="app-filter-control" /></label>
          <label class="app-filter-field"><span class="app-filter-label">منبع پرونده</span>
            <CustomSelect v-model="sourceFilter" :options="sourceOptions" trigger-class="app-filter-control" /></label>
          <label class="app-filter-field"><span class="app-filter-label">تعمیرکننده</span>
            <CustomSelect v-model="repairerFilter" :options="repairerOptions" trigger-class="app-filter-control" /></label>
          <label class="app-filter-field"><span class="app-filter-label">ترتیب تاریخ خسارت</span>
            <CustomSelect v-model="sortOrder" :options="sortOptions" trigger-class="app-filter-control" /></label>
          </template>
          <template #actions><AppButton variant="secondary" @click="clearFilters">پاک‌کردن فیلترها</AppButton></template>
        </AppFilterBar>
      </template>
      <AppDataTable class="damage-assets-table" :column-count="9" :loading="loading" :empty="!filteredAssets.length"
        min-width="100%" sticky-header loading-message="در حال دریافت پرونده‌ها..."
        empty-message="پرونده‌ای با این جست‌وجو یا فیلتر پیدا نشد.">
        <template #head><tr><th>ردیف</th><th>محصول</th><th>شماره اموال</th><th>تاریخ خسارت</th>
          <th>منبع / مشتری</th><th>تعمیرکننده</th><th>مانده تعمیر</th><th>وضعیت</th><th>عملیات</th></tr></template>
        <tr v-for="(asset, index) in paginatedAssets" :key="asset.id" class="app-table-row">
          <td data-label="ردیف" class="text-center text-slate-500">{{ (rowStartIndex + index + 1).toLocaleString('fa-IR') }}</td>
          <td data-label="محصول" class="font-bold text-slate-900">{{ asset.product_name_snapshot }}</td>
          <td data-label="شماره اموال" class="asset-number-cell text-center font-semibold">{{ asset.asset_number || 'تکمیل نشده' }}</td>
          <td data-label="تاریخ خسارت" class="text-center">{{ faDate(asset.incident_at) }}</td>
          <td data-label="منبع / مشتری">{{ asset.list_number ? `لیست ${asset.list_number}` : 'مستقل' }}<span v-if="asset.customer_name" class="block text-xs text-slate-500">{{ asset.customer_name }}</span></td>
          <td data-label="تعمیرکننده" class="text-center">{{ asset.repairer_name || '—' }}</td>
          <td data-label="مانده تعمیر" class="text-center">{{ asset.repair_cost_toman ? `${fmt(asset.repair_due_toman)} تومان` : '—' }}</td>
          <td data-label="وضعیت" class="text-center"><span class="inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs font-bold text-slate-700">{{ statuses[asset.status] }}</span></td>
          <td data-label="عملیات"><div class="flex items-center justify-center gap-1">
            <AppIconButton label="مشاهده و مدیریت" size="sm" @click="selectedAsset = asset">
              <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><circle cx="5" cy="12" r="1.7" /><circle cx="12" cy="12" r="1.7" /><circle cx="19" cy="12" r="1.7" /></svg>
            </AppIconButton>
            <AppIconButton label="حذف پرونده" size="sm" variant="danger" @click="assetToDelete = asset">
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 7h16m-10 0V5h4v2m-8 0 1 13h10l1-13M10 11v5m4-5v5" /></svg>
            </AppIconButton>
          </div></td>
        </tr>
      </AppDataTable>
      <template #footer><AppPagination :total-rows="totalRows" :row-start-index="rowStartIndex"
        :page-size="pageSize" :page-size-options="pageSizeOptions" :current-page="currentPage"
        :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers"
        @update:page-size="pageSize = $event" @go-to-page="goToPage" /></template>
    </AppTablePanel>

    <AppModal :is-open="createOpen" title="ثبت پرونده اموال خسارتی" size="lg" :busy="busy" @close="createOpen = false">
      <form id="damaged-asset-create" class="grid gap-4 sm:grid-cols-2" @submit.prevent="createAsset">
        <label class="app-filter-field"><span class="app-filter-label">منبع پرونده</span>
          <select v-model="form.case_type" class="app-input h-12" required>
            <option value="">انتخاب کنید</option><option value="DAMAGE">خسارتی</option><option value="SERVICE">سرویس</option>
          </select></label>
        <label class="app-filter-field"><span class="app-filter-label">تاریخ خسارت یا سرویس</span>
          <JalaliDatePicker v-model="form.incident_at" input-class="app-input h-12" /></label>
        <label class="app-filter-field"><span class="app-filter-label">محصول</span>
          <SearchableLookupInput v-model="productQuery" :options="productOptions" :dropdown-z-index="190"
            placeholder="نام محصول را جست‌وجو کنید" @select="selectProduct" @clear="form.product_id = ''" /></label>
        <label class="app-filter-field"><span class="app-filter-label">شماره اموال</span>
          <input v-model.trim="form.asset_number" class="app-input h-12" maxlength="100" required /></label>
        <label class="app-filter-field"><span class="app-filter-label">مشتری (اختیاری)</span>
          <SearchableLookupInput v-model="customerQuery" :options="customerOptions" :dropdown-z-index="190"
            placeholder="نام مشتری را جست‌وجو کنید" @select="selectCustomer" @clear="clearCustomer" /></label>
        <label v-if="form.customer_id" class="app-filter-field"><span class="app-filter-label">فاکتور مرتبط (اختیاری)</span>
          <select v-model="form.related_invoice_id" class="app-input h-12">
            <option value="">بدون فاکتور قبلی؛ صدور فاکتور جدید</option><option v-for="invoice in customerInvoices" :key="invoice.id" :value="invoice.id">
              {{ invoice.invoice_number || `شماره ${invoice.id}` }} · {{ faDate(invoice.issued_at || invoice.date) }}
            </option>
          </select><small v-if="!customerInvoices.length" class="mt-1 block text-xs text-slate-500">برای این مشتری فاکتوری ثبت نشده است.</small></label>
        <label class="app-filter-field sm:col-span-2"><span class="app-filter-label">شرح ایراد یا خسارت</span>
          <textarea v-model.trim="form.issue_description" class="app-input min-h-24" maxlength="2000" required /></label>
        <p v-if="formError" class="text-sm text-rose-700 sm:col-span-2">{{ formError }}</p>
      </form>
      <template #footer><AppButton type="submit" form="damaged-asset-create" variant="primary" :loading="busy">ثبت پرونده</AppButton>
        <AppButton variant="secondary" :disabled="busy" @click="createOpen = false">انصراف</AppButton></template>
    </AppModal>

    <AppModal :is-open="Boolean(selectedAsset)" :title="selectedAsset?.product_name_snapshot || 'جزئیات پرونده'"
      size="lg" @close="selectedAsset = null">
      <div v-if="selectedAsset" class="space-y-4 text-sm">
        <div class="grid gap-3 rounded-xl bg-slate-50 p-4 sm:grid-cols-2">
          <p><span class="text-slate-500">شماره اموال:</span> {{ selectedAsset.asset_number || 'تکمیل نشده' }}</p>
          <p><span class="text-slate-500">وضعیت:</span> {{ statuses[selectedAsset.status] }}</p>
          <p><span class="text-slate-500">منبع:</span> {{ selectedAsset.case_type === 'SERVICE' ? 'سرویس' : 'خسارتی' }}{{ selectedAsset.list_number ? ` · لیست ${selectedAsset.list_number}` : '' }}</p>
          <p><span class="text-slate-500">تاریخ خسارت:</span> {{ faDate(selectedAsset.incident_at) }}</p>
          <p><span class="text-slate-500">مشتری:</span> {{ selectedAsset.customer_name || '—' }}</p>
          <p class="sm:col-span-2"><span class="text-slate-500">شرح ایراد:</span> {{ selectedAsset.issue_description }}</p>
        </div>
        <p v-if="!selectedAsset.asset_number" class="rounded-lg bg-amber-50 p-3 text-amber-800">برای ادامه پیگیری، ابتدا شماره اموال این قلم را تکمیل کنید.</p>
        <div v-if="selectedAsset.repairer_id" class="grid gap-3 rounded-xl border p-4 sm:grid-cols-2">
          <p>تعمیرکننده: {{ selectedAsset.repairer_name }}</p><p>ارسال: {{ faDate(selectedAsset.sent_at) }}</p>
          <p>برگشت: {{ faDate(selectedAsset.returned_at) || 'ثبت نشده' }}</p>
          <p>هزینه تعمیر: {{ fmt(selectedAsset.repair_cost_toman) }} تومان</p>
          <p>پرداخت‌شده: {{ fmt(selectedAsset.repair_paid_toman) }} تومان</p>
          <p>مانده: {{ fmt(selectedAsset.repair_due_toman) }} تومان
            <strong v-if="selectedAsset.repair_cost_toman">({{ selectedAsset.repair_due_toman === 0 ? 'تسویه کامل' : selectedAsset.repair_paid_toman ? 'تسویه جزئی' : 'پرداخت‌نشده' }})</strong></p>
        </div>
        <p v-if="selectedAsset.damage_amount_toman">خسارت مشتری: {{ fmt(selectedAsset.damage_amount_toman) }} تومان
          <span v-if="selectedAsset.invoice_number">· فاکتور {{ selectedAsset.invoice_number }}</span></p>
        <div class="flex flex-wrap gap-2">
          <AppButton v-if="selectedAsset.asset_number && selectedAsset.status === 'NEEDS_FOLLOW_UP'" variant="info" @click="openAction('send')">ارسال به تعمیر</AppButton>
          <AppButton v-if="selectedAsset.asset_number && selectedAsset.status === 'REPAIR'" variant="info" @click="openAction('return')">ثبت برگشت از تعمیر</AppButton>
          <AppButton v-if="selectedAsset.asset_number && canDecide(selectedAsset)" variant="success" @click="openAction('resolve')">مشکل برطرف شد</AppButton>
          <AppButton v-if="selectedAsset.asset_number && selectedAsset.customer_id && canDecide(selectedAsset)" variant="warning" @click="openAction('assess')">تعیین خسارت</AppButton>
          <AppButton v-if="selectedAsset.status === 'DAMAGE_ASSESSED'" variant="primary" :loading="busy" @click="invoiceAsset(selectedAsset)">ثبت در فاکتور</AppButton>
          <AppButton v-if="selectedAsset.invoice_id" variant="secondary" @click="downloadInvoice(selectedAsset)">دانلود فاکتور</AppButton>
          <AppButton v-if="selectedAsset.status === 'INVOICED'" variant="primary" :loading="busy" @click="sendInvoice(selectedAsset)">ثبت ارسال فاکتور</AppButton>
          <AppButton v-if="selectedAsset.status === 'INVOICED' && selectedAsset.delivery_list_id" variant="secondary" @click="router.push(`/lists/${selectedAsset.delivery_list_id}`)">مشاهده لیست</AppButton>
          <AppButton v-if="!selectedAsset.invoice_id" variant="secondary" @click="openAction('details')">ویرایش مشخصات</AppButton>
        </div>
      </div>
    </AppModal>

    <AppModal :is-open="Boolean(actionAsset)" :title="`${actionTitles[actionKind]} · ${actionAsset?.product_name_snapshot || ''}`"
      size="md" :busy="busy" @close="actionAsset = null">
      <form id="damaged-asset-action" class="space-y-4" @submit.prevent="saveAction">
        <template v-if="actionKind === 'send'"><label class="app-filter-field"><span class="app-filter-label">تعمیرکننده</span>
          <select v-model="actionForm.repairer_id" class="app-input h-12" required><option value="">انتخاب کنید</option>
            <option v-for="repairer in repairers" :key="repairer.id" :value="repairer.id">{{ repairer.name }}</option></select></label>
          <label class="app-filter-field"><span class="app-filter-label">تاریخ ارسال</span><JalaliDatePicker v-model="actionForm.sent_at" input-class="app-input h-12" /></label></template>
        <template v-if="actionKind === 'return'"><label class="app-filter-field"><span class="app-filter-label">تاریخ برگشت</span><JalaliDatePicker v-model="actionForm.returned_at" input-class="app-input h-12" /></label>
          <label class="app-filter-field"><span class="app-filter-label">هزینه تعمیر (تومان)</span><input v-model.number="actionForm.repair_cost_toman" type="number" min="0" class="app-input h-12" required />
            <small v-if="actionForm.repair_cost_toman !== '' && actionForm.repair_cost_toman !== null" class="mt-2 block font-bold text-emerald-700">{{ fmt(actionForm.repair_cost_toman) }} تومان</small></label></template>
        <label v-if="actionKind === 'assess'" class="app-filter-field"><span class="app-filter-label">مبلغ خسارت (تومان)</span>
          <input v-model.number="actionForm.damage_amount_toman" type="number" min="1" class="app-input h-12" required />
          <small v-if="Number(actionForm.damage_amount_toman) > 0" class="mt-2 block font-bold text-emerald-700">{{ fmt(actionForm.damage_amount_toman) }} تومان</small></label>
        <template v-if="actionKind === 'details'"><label class="app-filter-field"><span class="app-filter-label">شماره اموال</span>
          <input v-model.trim="actionForm.asset_number" class="app-input h-12" required /></label>
          <label class="app-filter-field"><span class="app-filter-label">شرح ایراد</span><textarea v-model.trim="actionForm.issue_description" class="app-input min-h-24" required /></label></template>
        <p v-if="formError" class="text-sm text-rose-700">{{ formError }}</p>
      </form>
      <template #footer><AppButton type="submit" form="damaged-asset-action" variant="primary" :loading="busy">ثبت</AppButton>
        <AppButton variant="secondary" :disabled="busy" @click="actionAsset = null">انصراف</AppButton></template>
    </AppModal>
    <ConfirmModal :is-open="Boolean(assetToDelete)" title="حذف پرونده"
      :message="`پرونده «${assetToDelete?.product_name_snapshot || ''}» با شماره اموال «${assetToDelete?.asset_number || 'تکمیل‌نشده'}» حذف شود؟`"
      :loading="busy" confirm-variant="danger" @confirm="deleteAsset" @cancel="assetToDelete = null" />
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppButton from '../ui/AppButton.vue';
import AppIconButton from '../ui/AppIconButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppFilterBar from '../ui/AppFilterBar.vue';
import AppModal from '../ui/AppModal.vue';
import AppTablePanel from '../ui/AppTablePanel.vue';
import AppPagination from '../AppPagination.vue';
import CustomSelect from '../CustomSelect.vue';
import ConfirmModal from '../ConfirmModal.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import SearchableLookupInput from '../SearchableLookupInput.vue';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { toGregorianDate, toPersianDate } from '../../utils/dateConverter';
import { getApiErrorMessage } from '../../utils/apiError';
import { normalizeNumericSearch } from '../../utils/numberSearch';
import { damagedAssetService as service } from '../../modules/damaged-assets/api/damagedAsset.service';
import { productService } from '../../modules/products/api/product.service';
import { invoiceService } from '../../modules/invoices/api/invoice.service';
import { deliveryListService } from '../../modules/delivery-lists/api/deliveryList.service';

const router = useRouter();
const toast = useToast();
const statuses = { NEEDS_FOLLOW_UP: 'نیاز به پیگیری', REPAIR: 'در تعمیر', RETURNED: 'برگشته از تعمیر', DAMAGE_ASSESSED: 'در انتظار ثبت فاکتور خسارت', INVOICED: 'تعیین خسارت (فاکتور صادر شد)', COMPLETED: 'تکمیل' };
const actionTitles = { send: 'ارسال به تعمیر', return: 'برگشت از تعمیر', resolve: 'رفع مشکل و تکمیل', assess: 'ثبت مبلغ خسارت', details: 'ویرایش پرونده' };
const assets = ref([]), repairers = ref([]), products = ref([]), customers = ref([]), customerInvoices = ref([]);
const loading = ref(false), busy = ref(false), formError = ref(''), createOpen = ref(false), filtersExpanded = ref(false);
const selectedAsset = ref(null), actionAsset = ref(null), actionKind = ref(''), tableRef = ref(null);
const assetToDelete = ref(null);
const search = ref(''), statusFilter = ref('all'), sourceFilter = ref('all'), repairerFilter = ref('all'), sortOrder = ref('newest');
const form = reactive({ case_type: '', incident_at: '', product_id: '', customer_id: '', related_invoice_id: '', asset_number: '', issue_description: '' });
const productQuery = ref(''), customerQuery = ref('');
const actionForm = reactive({});
const fmt = (value) => Number(value || 0).toLocaleString('fa-IR');
const faDate = (value) => value ? toPersianDate(String(value).slice(0, 10)) : '';
const isoDate = (value) => `${toGregorianDate(value)}T12:00:00+03:30`;
const statusOptions = [{ label: 'همه وضعیت‌ها', value: 'all' }, ...Object.entries(statuses).map(([value, label]) => ({ label, value }))];
const sourceOptions = [{ label: 'همه منابع', value: 'all' }, { label: 'خسارتی', value: 'DAMAGE' }, { label: 'سرویس', value: 'SERVICE' }];
const sortOptions = [{ label: 'جدیدترین', value: 'newest' }, { label: 'قدیمی‌ترین', value: 'oldest' }];
const productOptions = computed(() => products.value.map((product) => ({ label: product.name, value: product.id })));
const customerOptions = computed(() => customers.value.map((customer) => ({ label: customer.name, value: customer.id })));
const repairerOptions = computed(() => [{ label: 'همه تعمیرکننده‌ها', value: 'all' }, { label: 'بدون تعمیرکننده', value: 'none' },
  ...repairers.value.map((repairer) => ({ label: repairer.name, value: String(repairer.id) }))]);
const filteredAssets = computed(() => {
  const query = search.value.toLowerCase();
  const numeric = normalizeNumericSearch(search.value);
  return assets.value.filter((asset) => {
    const matchesSearch = !query || [asset.product_name_snapshot, asset.asset_number, asset.issue_description,
      asset.customer_name, asset.list_number, asset.repairer_name].some((value) => String(value || '').toLowerCase().includes(query))
      || (numeric && normalizeNumericSearch(asset.asset_number).includes(numeric));
    return matchesSearch && (statusFilter.value === 'all' || asset.status === statusFilter.value)
      && (sourceFilter.value === 'all' || asset.case_type === sourceFilter.value)
      && (repairerFilter.value === 'all' || (repairerFilter.value === 'none' ? !asset.repairer_id : String(asset.repairer_id) === repairerFilter.value));
  }).sort((first, second) => {
    const dateOrder = String(first.incident_at || '').localeCompare(String(second.incident_at || ''));
    return (sortOrder.value === 'oldest' ? dateOrder : -dateOrder) ||
      (sortOrder.value === 'oldest' ? first.id - second.id : second.id - first.id);
  });
});
const { currentPage, pageSize, pageSizeOptions, totalRows, totalPages, rowStartIndex, paginatedItems: paginatedAssets,
  visiblePageNumbers, goToPage } = usePaginatedList(filteredAssets, { initialPageSize: 15,
  pageSizeOptions: [10, 15, 20, 50, 100], resetSources: [search, statusFilter, sourceFilter, repairerFilter, sortOrder], scrollTarget: tableRef });
const canDecide = (asset) => ['NEEDS_FOLLOW_UP', 'RETURNED'].includes(asset.status);
function clearFilters() { search.value = ''; statusFilter.value = 'all'; sourceFilter.value = 'all'; repairerFilter.value = 'all'; sortOrder.value = 'newest'; }
async function refresh() {
  loading.value = true;
  try { const [assetResult, repairerResult] = await Promise.all([service.getAssets(), service.getRepairers()]);
    assets.value = assetResult.data.assets; repairers.value = repairerResult.data.repairers;
    if (selectedAsset.value) selectedAsset.value = assets.value.find((asset) => asset.id === selectedAsset.value.id) || null;
  } catch (error) { toast.error(getApiErrorMessage(error)); } finally { loading.value = false; }
}
async function perform(task, message) {
  busy.value = true; formError.value = '';
  try { await task(); await refresh(); toast.success(message); return true; }
  catch (error) { formError.value = getApiErrorMessage(error); toast.error(formError.value); return false; }
  finally { busy.value = false; }
}
function selectProduct(option) { form.product_id = option.value; productQuery.value = option.label; }
function selectCustomer(option) { form.customer_id = option.value; customerQuery.value = option.label; void loadCustomerInvoices(); }
function clearCustomer() { form.customer_id = ''; form.related_invoice_id = ''; customerInvoices.value = []; }
watch(productQuery, (value) => { if (products.value.find((product) => product.id === form.product_id)?.name !== value) form.product_id = ''; });
watch(customerQuery, (value) => { if (customers.value.find((customer) => customer.id === form.customer_id)?.name !== value) clearCustomer(); });
async function loadCustomerInvoices() {
  form.related_invoice_id = ''; customerInvoices.value = [];
  if (!form.customer_id) return;
  try { customerInvoices.value = (await service.getCustomerInvoices(form.customer_id)).data.invoices; }
  catch (error) { formError.value = getApiErrorMessage(error); }
}
async function createAsset() {
  if (!form.product_id) { formError.value = 'محصول را از نتایج جست‌وجو انتخاب کنید'; return; }
  if (!form.incident_at) { formError.value = 'تاریخ خسارت یا سرویس را انتخاب کنید'; return; }
  const payload = { ...form, incident_at: isoDate(form.incident_at), product_id: Number(form.product_id),
    customer_id: form.customer_id || null, related_invoice_id: form.related_invoice_id || null };
  if (await perform(() => service.createAsset(payload), 'پرونده ثبت شد')) {
    Object.assign(form, { case_type: '', incident_at: '', product_id: '', customer_id: '', related_invoice_id: '', asset_number: '', issue_description: '' });
    productQuery.value = ''; customerQuery.value = ''; customerInvoices.value = [];
    createOpen.value = false;
  }
}
function openAction(kind) {
  actionAsset.value = selectedAsset.value; selectedAsset.value = null; actionKind.value = kind; formError.value = '';
  Object.keys(actionForm).forEach((key) => delete actionForm[key]);
  Object.assign(actionForm, { asset_number: actionAsset.value.asset_number,
    issue_description: actionAsset.value.issue_description, repair_cost_toman: 0, repairer_id: '' });
}
async function saveAction() {
  if (['send', 'return'].includes(actionKind.value) && !actionForm[actionKind.value === 'send' ? 'sent_at' : 'returned_at']) {
    formError.value = 'تاریخ را انتخاب کنید'; return;
  }
  const payload = { ...actionForm, operation: actionKind.value };
  if (payload.sent_at) payload.sent_at = isoDate(payload.sent_at);
  if (payload.returned_at) payload.returned_at = isoDate(payload.returned_at);
  if (await perform(() => service.updateAsset(actionAsset.value.id, payload), 'وضعیت پرونده ثبت شد')) actionAsset.value = null;
}
async function invoiceAsset(asset) {
  if (!window.confirm(`مبلغ ${fmt(asset.damage_amount_toman)} تومان خسارت در فاکتور ثبت شود؟`)) return;
  await perform(() => service.issueInvoice(asset.id), 'هزینه خسارت در فاکتور ثبت شد');
}
async function sendInvoice(asset) {
  if (!window.confirm(`ارسال فاکتور ${asset.invoice_number || ''} به مشتری ثبت شود؟`)) return;
  await perform(() => service.sendInvoice(asset.id, { channel: 'MANUAL' }), 'ارسال فاکتور ثبت شد و پرونده تکمیل شد');
}
async function downloadInvoice(asset) {
  try { const payload = (await service.downloadInvoice(asset.id)).data; const binary = atob(payload.data_base64);
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
    const link = document.createElement('a'); link.href = url; link.download = payload.filename; link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { toast.error(getApiErrorMessage(error)); }
}
async function deleteAsset() {
  if (!assetToDelete.value) return;
  if (await perform(() => service.deleteAsset(assetToDelete.value.id), 'پرونده حذف شد')) assetToDelete.value = null;
}
let stopChanges;
onMounted(async () => {
  await refresh();
  stopChanges = deliveryListService.subscribeToChanges(() => { void refresh(); });
  const [catalog, clients] = await Promise.allSettled([productService.getCatalog(), invoiceService.getCustomers()]);
  if (catalog.status === 'fulfilled') products.value = catalog.value.data.products || [];
  if (clients.status === 'fulfilled') customers.value = clients.value.data || [];
});
onBeforeUnmount(() => stopChanges?.());
</script>

<style scoped>
.damage-assets-table :deep(.app-table-wrapper) { overflow-x: hidden; }
.damage-assets-table :deep(.app-table) { table-layout: fixed; width: 100%; }
.damage-assets-table :deep(th), .damage-assets-table :deep(td) {
  min-width: 0; padding: .55rem .35rem; overflow-wrap: anywhere; word-break: normal;
}
.damage-assets-table :deep(th:nth-child(1)) { width: 4%; }
.damage-assets-table :deep(th:nth-child(2)) { width: 15%; }
.damage-assets-table :deep(th:nth-child(3)) { width: 7%; }
.damage-assets-table :deep(th:nth-child(4)) { width: 10%; }
.damage-assets-table :deep(th:nth-child(5)) { width: 17%; }
.damage-assets-table :deep(th:nth-child(6)) { width: 13%; }
.damage-assets-table :deep(th:nth-child(7)) { width: 15%; }
.damage-assets-table :deep(th:nth-child(8)) { width: 10%; }
.damage-assets-table :deep(th:nth-child(9)) { width: 9%; }
.damage-assets-table :deep(.asset-number-cell) { font-size: .75rem; }
@media (max-width: 900px) {
  .damage-assets-table :deep(.app-table), .damage-assets-table :deep(tbody) { display: block; width: 100%; }
  .damage-assets-table :deep(thead) { display: none; }
  .damage-assets-table :deep(tr.app-table-row) {
    display: grid; grid-template-columns: repeat(2, minmax(0, 1fr));
    margin: .75rem; border: 1px solid #d8d5ca; border-radius: .65rem; overflow: hidden;
  }
  .damage-assets-table :deep(tr.app-table-row td) { height: auto; text-align: right; border-width: 0 0 1px 1px; }
  .damage-assets-table :deep(tr.app-table-row td::before) {
    content: attr(data-label); display: block; margin-bottom: .25rem;
    color: #64748b; font-size: .7rem; font-weight: 700;
  }
  .damage-assets-table :deep(tr.app-table-row td:last-child) { grid-column: 1 / -1; }
}
@media (max-width: 520px) {
  .damage-assets-table :deep(tr.app-table-row) { grid-template-columns: minmax(0, 1fr); }
  .damage-assets-table :deep(tr.app-table-row td:last-child) { grid-column: auto; }
}
</style>
