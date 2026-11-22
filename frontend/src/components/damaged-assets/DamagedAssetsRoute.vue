<template>
  <div ref="tableRef" class="space-y-5">
    <Teleport to="#app-shell-actions">
      <AppButton variant="primary" block @click="createOpen = true">ثبت پرونده</AppButton>
      <AppButton variant="secondary" block @click="router.push('/damaged-assets/repairers')">تعمیرکننده‌ها و پرداخت‌ها</AppButton>
    </Teleport>

    <AppTablePanel title="اموال خسارتی" :count="loading ? null : filteredAssets.length"
      description="وضعیت خسارت و تعمیر هر واحد کالا را با شماره اموال آن پیگیری کنید.">
      <template #filters>
        <AppFilterBar :expanded="filtersExpanded" collapsible columns-class="md:grid-cols-2 xl:grid-cols-4"
          advanced-columns-class="md:grid-cols-2 xl:grid-cols-4" @update:expanded="filtersExpanded = $event">
          <label class="app-filter-field"><span class="app-filter-label">جست‌وجو</span>
            <input v-model.trim="search" type="search" class="app-filter-control"
              placeholder="نام محصول، شماره اموال یا شرح ایراد" /></label>
          <label class="app-filter-field"><span class="app-filter-label">وضعیت</span>
            <CustomSelect v-model="statusFilter" :options="statusOptions" trigger-class="app-filter-control" /></label>
          <label class="app-filter-field"><span class="app-filter-label">منبع پرونده</span>
            <CustomSelect v-model="sourceFilter" :options="sourceOptions" trigger-class="app-filter-control" /></label>
          <label class="app-filter-field"><span class="app-filter-label">تعمیرکننده</span>
            <CustomSelect v-model="repairerFilter" :options="repairerOptions" trigger-class="app-filter-control" /></label>
          <template #actions><AppButton variant="secondary" @click="clearFilters">پاک‌کردن فیلترها</AppButton></template>
        </AppFilterBar>
      </template>
      <AppDataTable :column-count="9" :loading="loading" :empty="!filteredAssets.length"
        min-width="1100px" sticky-header loading-message="در حال دریافت پرونده‌ها..."
        empty-message="پرونده‌ای با این جست‌وجو یا فیلتر پیدا نشد.">
        <template #head><tr><th>ردیف</th><th>محصول</th><th>شماره اموال</th><th>شرح ایراد</th>
          <th>منبع / مشتری</th><th>تعمیرکننده</th><th>مانده تعمیر</th><th>وضعیت</th><th>عملیات</th></tr></template>
        <tr v-for="(asset, index) in paginatedAssets" :key="asset.id" class="app-table-row">
          <td class="text-center text-slate-500">{{ (rowStartIndex + index + 1).toLocaleString('fa-IR') }}</td>
          <td class="font-bold text-slate-900">{{ asset.product_name_snapshot }}</td>
          <td class="text-center font-semibold">{{ asset.asset_number }}</td>
          <td class="max-w-56 truncate" :title="asset.issue_description">{{ asset.issue_description }}</td>
          <td>{{ asset.list_number ? `لیست ${asset.list_number}` : 'مستقل' }}<span v-if="asset.customer_name" class="block text-xs text-slate-500">{{ asset.customer_name }}</span></td>
          <td class="text-center">{{ asset.repairer_name || '—' }}</td>
          <td class="text-center">{{ asset.repair_cost_toman ? `${fmt(asset.repair_due_toman)} تومان` : '—' }}</td>
          <td class="text-center"><span class="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{{ statuses[asset.status] }}</span></td>
          <td class="text-center"><AppButton variant="secondary" size="sm" @click="selectedAsset = asset">مشاهده و مدیریت</AppButton></td>
        </tr>
      </AppDataTable>
      <template #footer><AppPagination :total-rows="totalRows" :row-start-index="rowStartIndex"
        :page-size="pageSize" :page-size-options="pageSizeOptions" :current-page="currentPage"
        :total-pages="totalPages" :visible-page-numbers="visiblePageNumbers"
        @update:page-size="pageSize = $event" @go-to-page="goToPage" /></template>
    </AppTablePanel>

    <AppModal :is-open="createOpen" title="ثبت پرونده اموال خسارتی" size="lg" :busy="busy" @close="createOpen = false">
      <form id="damaged-asset-create" class="grid gap-4 sm:grid-cols-2" @submit.prevent="createAsset">
        <label class="app-filter-field sm:col-span-2"><span class="app-filter-label">منبع پرونده</span>
          <select v-model="form.return_event_item_id" class="app-input h-12" @change="selectCandidate">
            <option value="">ثبت مستقل / سرویس دوره‌ای</option>
            <option v-for="candidate in candidates" :key="candidate.return_event_item_id" :value="candidate.return_event_item_id">
              لیست {{ candidate.list_number }} · {{ candidate.product_name_snapshot }} · {{ candidate.unregistered_quantity }} واحد ثبت‌نشده
            </option>
          </select></label>
        <label class="app-filter-field"><span class="app-filter-label">محصول</span>
          <select v-model="form.product_id" class="app-input h-12" :disabled="!!form.return_event_item_id" required>
            <option value="">انتخاب محصول</option><option v-for="product in products" :key="product.id" :value="product.id">{{ product.name }}</option>
          </select></label>
        <label class="app-filter-field"><span class="app-filter-label">شماره اموال</span>
          <input v-model.trim="form.asset_number" class="app-input h-12" maxlength="100" required /></label>
        <label v-if="!form.return_event_item_id" class="app-filter-field"><span class="app-filter-label">مشتری (اختیاری)</span>
          <select v-model="form.customer_id" class="app-input h-12" @change="loadCustomerInvoices">
            <option value="">بدون مشتری</option><option v-for="customer in customers" :key="customer.id" :value="customer.id">{{ customer.name }}</option>
          </select></label>
        <label v-if="!form.return_event_item_id && form.customer_id" class="app-filter-field"><span class="app-filter-label">فاکتور مرتبط</span>
          <select v-model="form.related_invoice_id" class="app-input h-12" required>
            <option value="">انتخاب فاکتور</option><option v-for="invoice in customerInvoices" :key="invoice.id" :value="invoice.id">
              {{ invoice.invoice_number || `شماره ${invoice.id}` }} · {{ faDate(invoice.issued_at || invoice.date) }}
            </option>
          </select></label>
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
          <p><span class="text-slate-500">شماره اموال:</span> {{ selectedAsset.asset_number }}</p>
          <p><span class="text-slate-500">وضعیت:</span> {{ statuses[selectedAsset.status] }}</p>
          <p><span class="text-slate-500">منبع:</span> {{ selectedAsset.list_number ? `لیست ${selectedAsset.list_number}` : 'مستقل' }}</p>
          <p><span class="text-slate-500">مشتری:</span> {{ selectedAsset.customer_name || '—' }}</p>
          <p class="sm:col-span-2"><span class="text-slate-500">شرح ایراد:</span> {{ selectedAsset.issue_description }}</p>
        </div>
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
          <AppButton v-if="selectedAsset.status === 'NEEDS_FOLLOW_UP'" variant="info" @click="openAction('send')">ارسال به تعمیر</AppButton>
          <AppButton v-if="selectedAsset.status === 'REPAIR'" variant="info" @click="openAction('return')">ثبت برگشت از تعمیر</AppButton>
          <AppButton v-if="canDecide(selectedAsset)" variant="success" @click="openAction('resolve')">مشکل برطرف شد</AppButton>
          <AppButton v-if="selectedAsset.customer_id && canDecide(selectedAsset)" variant="warning" @click="openAction('assess')">تعیین خسارت</AppButton>
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
          <label class="app-filter-field"><span class="app-filter-label">هزینه تعمیر (تومان)</span><input v-model.number="actionForm.repair_cost_toman" type="number" min="0" class="app-input h-12" required /></label></template>
        <label v-if="actionKind === 'assess'" class="app-filter-field"><span class="app-filter-label">مبلغ خسارت (تومان)</span>
          <input v-model.number="actionForm.damage_amount_toman" type="number" min="1" class="app-input h-12" required /></label>
        <template v-if="actionKind === 'details'"><label class="app-filter-field"><span class="app-filter-label">شماره اموال</span>
          <input v-model.trim="actionForm.asset_number" class="app-input h-12" required /></label>
          <label class="app-filter-field"><span class="app-filter-label">شرح ایراد</span><textarea v-model.trim="actionForm.issue_description" class="app-input min-h-24" required /></label></template>
        <p v-if="formError" class="text-sm text-rose-700">{{ formError }}</p>
      </form>
      <template #footer><AppButton type="submit" form="damaged-asset-action" variant="primary" :loading="busy">ثبت</AppButton>
        <AppButton variant="secondary" :disabled="busy" @click="actionAsset = null">انصراف</AppButton></template>
    </AppModal>
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
import CustomSelect from '../CustomSelect.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import { usePaginatedList } from '../../composables/usePaginatedList';
import { toGregorianDate, toPersianDate } from '../../utils/dateConverter';
import { getApiErrorMessage } from '../../utils/apiError';
import { normalizeNumericSearch } from '../../utils/numberSearch';
import { damagedAssetService as service } from '../../modules/damaged-assets/api/damagedAsset.service';
import { productService } from '../../modules/products/api/product.service';
import { invoiceService } from '../../modules/invoices/api/invoice.service';

const router = useRouter();
const toast = useToast();
const statuses = { NEEDS_FOLLOW_UP: 'نیاز به پیگیری', REPAIR: 'در تعمیر', RETURNED: 'برگشته از تعمیر', DAMAGE_ASSESSED: 'در انتظار ثبت فاکتور خسارت', INVOICED: 'تعیین خسارت (فاکتور صادر شد)', COMPLETED: 'تکمیل' };
const actionTitles = { send: 'ارسال به تعمیر', return: 'برگشت از تعمیر', resolve: 'رفع مشکل و تکمیل', assess: 'ثبت مبلغ خسارت', details: 'ویرایش پرونده' };
const assets = ref([]), candidates = ref([]), repairers = ref([]), products = ref([]), customers = ref([]), customerInvoices = ref([]);
const loading = ref(false), busy = ref(false), formError = ref(''), createOpen = ref(false), filtersExpanded = ref(false);
const selectedAsset = ref(null), actionAsset = ref(null), actionKind = ref(''), tableRef = ref(null);
const search = ref(''), statusFilter = ref('all'), sourceFilter = ref('all'), repairerFilter = ref('all');
const form = reactive({ return_event_item_id: '', product_id: '', customer_id: '', related_invoice_id: '', asset_number: '', issue_description: '' });
const actionForm = reactive({});
const fmt = (value) => Number(value || 0).toLocaleString('fa-IR');
const faDate = (value) => value ? toPersianDate(String(value).slice(0, 10)) : '';
const isoDate = (value) => `${toGregorianDate(value)}T12:00:00+03:30`;
const statusOptions = [{ label: 'همه وضعیت‌ها', value: 'all' }, ...Object.entries(statuses).map(([value, label]) => ({ label, value }))];
const sourceOptions = [{ label: 'همه منابع', value: 'all' }, { label: 'از لیست‌ها', value: 'list' }, { label: 'ثبت مستقل', value: 'independent' }];
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
      && (sourceFilter.value === 'all' || (sourceFilter.value === 'list' ? !!asset.delivery_list_id : !asset.delivery_list_id))
      && (repairerFilter.value === 'all' || (repairerFilter.value === 'none' ? !asset.repairer_id : String(asset.repairer_id) === repairerFilter.value));
  });
});
const { currentPage, pageSize, pageSizeOptions, totalRows, totalPages, rowStartIndex, paginatedItems: paginatedAssets,
  visiblePageNumbers, goToPage } = usePaginatedList(filteredAssets, { initialPageSize: 15,
  pageSizeOptions: [10, 15, 20, 50, 100], resetSources: [search, statusFilter, sourceFilter, repairerFilter], scrollTarget: tableRef });
const canDecide = (asset) => ['NEEDS_FOLLOW_UP', 'RETURNED'].includes(asset.status);
function clearFilters() { search.value = ''; statusFilter.value = 'all'; sourceFilter.value = 'all'; repairerFilter.value = 'all'; }
async function refresh() {
  loading.value = true;
  try { const [assetResult, candidateResult, repairerResult] = await Promise.all([service.getAssets(), service.getCandidates(), service.getRepairers()]);
    assets.value = assetResult.data.assets; candidates.value = candidateResult.data.candidates; repairers.value = repairerResult.data.repairers;
    if (selectedAsset.value) selectedAsset.value = assets.value.find((asset) => asset.id === selectedAsset.value.id) || null;
  } catch (error) { toast.error(getApiErrorMessage(error)); } finally { loading.value = false; }
}
async function perform(task, message) {
  busy.value = true; formError.value = '';
  try { await task(); await refresh(); toast.success(message); return true; }
  catch (error) { formError.value = getApiErrorMessage(error); toast.error(formError.value); return false; }
  finally { busy.value = false; }
}
function selectCandidate() {
  const candidate = candidates.value.find((item) => item.return_event_item_id === Number(form.return_event_item_id));
  form.product_id = candidate?.product_id || ''; form.customer_id = candidate?.customer_id || '';
  form.related_invoice_id = ''; form.issue_description = candidate?.damage_notes || '';
}
async function loadCustomerInvoices() {
  form.related_invoice_id = ''; customerInvoices.value = [];
  if (!form.customer_id) return;
  try { customerInvoices.value = (await invoiceService.getCustomerInvoices(form.customer_id)).data.invoices
    .filter((invoice) => invoice.status === 'ISSUED' || !invoice.status); }
  catch (error) { formError.value = getApiErrorMessage(error); }
}
async function createAsset() {
  const payload = { ...form, product_id: Number(form.product_id), return_event_item_id: form.return_event_item_id || null,
    customer_id: form.customer_id || null, related_invoice_id: form.related_invoice_id || null };
  if (await perform(() => service.createAsset(payload), 'پرونده ثبت شد')) {
    Object.assign(form, { return_event_item_id: '', product_id: '', customer_id: '', related_invoice_id: '', asset_number: '', issue_description: '' });
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
onMounted(async () => {
  await refresh();
  const [catalog, clients] = await Promise.allSettled([productService.getCatalog(), invoiceService.getCustomers()]);
  if (catalog.status === 'fulfilled') products.value = catalog.value.data.products || [];
  if (clients.status === 'fulfilled') customers.value = clients.value.data || [];
});
</script>
