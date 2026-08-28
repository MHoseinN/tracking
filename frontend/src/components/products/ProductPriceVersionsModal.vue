<template>
  <AppModal :is-open="isOpen" title="نسخه‌های قیمت تجهیزات"
    description="هر نسخه، تصویر کامل قیمت محصولات را همراه با قیمت قبلی و قیمت جدید نگه می‌دارد."
    size="xl" :busy="loading" body-class="max-h-[72vh] overflow-y-auto" @close="$emit('close')">
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="text-sm text-slate-500">
          {{ versions.length.toLocaleString('fa-IR') }} نسخه قیمت ثبت شده است.
        </div>
        <AppButton variant="primary" @click="openCreate">ساخت نسخه جدید</AppButton>
      </div>

      <AppDataTable :column-count="7" :loading="loading" :empty="!versions.length" min-width="100%"
        loading-message="در حال دریافت نسخه‌های قیمت..." empty-message="هنوز نسخه قیمتی ثبت نشده است.">
        <template #head>
          <tr>
            <th class="text-center">نسخه</th>
            <th>عنوان نسخه</th>
            <th class="text-center">تاریخ ثبت</th>
            <th class="text-center">کل محصولات</th>
            <th class="text-center">قیمت تغییرکرده</th>
            <th class="text-center">ثبت‌کننده</th>
            <th class="text-center">عملیات</th>
          </tr>
        </template>
        <tr v-for="version in versions" :key="version.id" class="app-table-row">
          <td class="text-center font-black text-indigo-700">{{ formatNumber(version.version_number) }}</td>
          <td class="font-bold text-slate-800">{{ version.name }}</td>
          <td class="text-center text-sm">{{ formatDateTime(version.effective_from) }}</td>
          <td class="text-center">{{ formatNumber(version.product_count) }}</td>
          <td class="text-center">
            <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              {{ formatNumber(version.changed_product_count) }} محصول
            </span>
          </td>
          <td class="text-center text-sm">{{ version.created_by_name || '—' }}</td>
          <td>
            <div class="flex items-center justify-center gap-2">
              <AppButton size="sm" variant="secondary" @click="openDetails(version.id)">مشاهده</AppButton>
              <AppButton size="sm" variant="info" :loading="loadingPdfId === version.id"
                @click="downloadPdf(version)">PDF</AppButton>
            </div>
          </td>
        </tr>
      </AppDataTable>
    </div>

    <template #footer>
      <AppButton variant="secondary" @click="$emit('close')">بستن</AppButton>
    </template>
  </AppModal>

  <AppModal :is-open="showCreate" title="ساخت نسخه جدید قیمت"
    description="قیمت جدید محصولات را وارد کنید؛ محصولات بدون تغییر نیز داخل نسخه ذخیره می‌شوند."
    size="xl" :busy="saving" :z-index="170" body-class="max-h-[74vh] overflow-y-auto" @close="closeCreate">
    <form id="price-version-form" class="space-y-4" @submit.prevent="saveVersion">
      <div class="grid gap-4 md:grid-cols-2">
        <AppFormField for-id="price-version-name" label="عنوان نسخه" required>
          <template #default="{ controlId }">
            <input :id="controlId" v-model.trim="form.name" class="app-input h-11" maxlength="255" />
          </template>
        </AppFormField>
        <AppFormField for-id="price-version-notes" label="توضیحات">
          <template #default="{ controlId }">
            <input :id="controlId" v-model.trim="form.notes" class="app-input h-11" maxlength="2000"
              placeholder="مثلاً افزایش قیمت نیمه دوم سال" />
          </template>
        </AppFormField>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <input v-model.trim="createSearch" type="search" class="app-input h-10 max-w-md"
          placeholder="جست‌وجوی نام محصول یا دسته‌بندی" />
        <div class="flex items-center gap-2 text-sm">
          <span class="text-slate-500">تعداد تغییر:</span>
          <strong class="text-emerald-700">{{ formatNumber(changedCount) }} محصول</strong>
        </div>
      </div>

      <AppDataTable class="price-editor-table" :column-count="6" :empty="!filteredEditorItems.length" min-width="100%"
        empty-message="محصولی با این جست‌وجو پیدا نشد.">
        <template #head>
          <tr>
            <th class="text-center">ردیف</th>
            <th>نام محصول</th>
            <th>دسته‌بندی</th>
            <th class="text-center">قیمت قبلی</th>
            <th class="text-center">قیمت جدید</th>
            <th class="text-center">تغییر</th>
          </tr>
        </template>
        <tr v-for="(item, index) in filteredEditorItems" :key="item.product_id" class="app-table-row"
          :class="item.new_price_toman !== item.previous_price_toman ? 'bg-emerald-50/40' : ''">
          <td class="text-center">{{ formatNumber(index + 1) }}</td>
          <td class="font-bold">{{ item.product_name }}</td>
          <td>{{ item.category_name || 'بدون دسته‌بندی' }}</td>
          <td class="text-center font-semibold">{{ formatMoney(item.previous_price_toman) }}</td>
          <td>
            <input v-model.number="item.new_price_toman" type="number" min="0" step="1000" dir="ltr"
              class="app-input mx-auto h-9 max-w-[170px] text-left" />
          </td>
          <td class="text-center font-bold" :class="priceDelta(item) > 0 ? 'text-emerald-700' : priceDelta(item) < 0 ? 'text-rose-600' : 'text-slate-400'">
            {{ formatSignedMoney(priceDelta(item)) }}
          </td>
        </tr>
      </AppDataTable>
      <p v-if="formError" class="text-sm font-bold text-rose-600">{{ formError }}</p>
    </form>
    <template #footer>
      <AppButton type="submit" form="price-version-form" variant="primary" :loading="saving">ثبت نسخه و اعمال قیمت‌ها</AppButton>
      <AppButton variant="secondary" :disabled="saving" @click="closeCreate">انصراف</AppButton>
    </template>
  </AppModal>

  <AppModal :is-open="showDetails" :title="selectedVersion?.name || 'جزئیات نسخه قیمت'"
    :description="selectedVersion ? `نسخه ${formatNumber(selectedVersion.version_number)} - ${formatDateTime(selectedVersion.effective_from)}` : ''"
    size="xl" :busy="loadingDetails" :z-index="170" body-class="max-h-[74vh] overflow-y-auto" @close="closeDetails">
    <div v-if="selectedVersion" class="space-y-4">
      <div class="grid gap-3 sm:grid-cols-3">
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <div class="text-xs text-slate-500">کل محصولات</div>
          <strong class="mt-1 block text-lg">{{ formatNumber(selectedVersion.product_count) }}</strong>
        </div>
        <div class="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-center">
          <div class="text-xs text-emerald-700">محصولات تغییرکرده</div>
          <strong class="mt-1 block text-lg text-emerald-800">{{ formatNumber(selectedVersion.changed_product_count) }}</strong>
        </div>
        <div class="rounded-lg border border-slate-200 bg-slate-50 p-3 text-center">
          <div class="text-xs text-slate-500">ثبت‌کننده</div>
          <strong class="mt-1 block text-sm">{{ selectedVersion.created_by_name || '—' }}</strong>
        </div>
      </div>
      <p v-if="selectedVersion.notes" class="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
        {{ selectedVersion.notes }}
      </p>
      <AppDataTable class="price-details-table" :column-count="6" :empty="!selectedVersion.items?.length" min-width="100%">
        <template #head>
          <tr>
            <th class="text-center">ردیف</th>
            <th>نام محصول</th>
            <th>دسته‌بندی</th>
            <th class="text-center">قیمت قبلی</th>
            <th class="text-center">قیمت جدید</th>
            <th class="text-center">تغییر</th>
          </tr>
        </template>
        <tr v-for="(item, index) in selectedVersion.items" :key="item.id" class="app-table-row"
          :class="item.price_changed ? 'bg-emerald-50/40' : ''">
          <td class="text-center">{{ formatNumber(index + 1) }}</td>
          <td class="font-bold">{{ item.product_name_snapshot }}</td>
          <td>{{ item.category_name_snapshot || 'بدون دسته‌بندی' }}</td>
          <td class="text-center">{{ formatMoney(item.previous_price_toman) }}</td>
          <td class="text-center font-black">{{ formatMoney(item.new_price_toman) }}</td>
          <td class="text-center font-bold" :class="item.price_changed ? 'text-emerald-700' : 'text-slate-400'">
            {{ formatSignedMoney(Number(item.new_price_toman) - Number(item.previous_price_toman)) }}
          </td>
        </tr>
      </AppDataTable>
    </div>
    <template #footer>
      <AppButton v-if="selectedVersion" variant="info" :loading="loadingPdfId === selectedVersion.id"
        @click="downloadPdf(selectedVersion)">دانلود PDF</AppButton>
      <AppButton variant="secondary" @click="closeDetails">بستن</AppButton>
    </template>
  </AppModal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import { useToast } from 'vue-toastification';
import AppButton from '../ui/AppButton.vue';
import AppDataTable from '../ui/AppDataTable.vue';
import AppFormField from '../ui/AppFormField.vue';
import AppModal from '../ui/AppModal.vue';
import { productService } from '../../modules/products/api/product.service';
import { getApiErrorMessage } from '../../utils/apiError';
import { getCurrentPersianDate, toPersianDate } from '../../utils/dateConverter';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  products: { type: Array, default: () => [] }
});
const emit = defineEmits(['close', 'catalog-changed']);
const toast = useToast();
const versions = ref([]);
const loading = ref(false);
const saving = ref(false);
const loadingDetails = ref(false);
const loadingPdfId = ref(null);
const showCreate = ref(false);
const showDetails = ref(false);
const selectedVersion = ref(null);
const createSearch = ref('');
const formError = ref('');
const form = reactive({ name: '', notes: '', items: [] });

const filteredEditorItems = computed(() => {
  const query = createSearch.value.toLowerCase();
  if (!query) return form.items;
  return form.items.filter((item) => item.product_name.toLowerCase().includes(query)
    || String(item.category_name || '').toLowerCase().includes(query));
});
const changedCount = computed(() => form.items.filter((item) => Number(item.new_price_toman) !== Number(item.previous_price_toman)).length);

async function loadVersions() {
  loading.value = true;
  try {
    const response = await productService.getPriceVersions();
    versions.value = response.data.versions || [];
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'خطا در دریافت نسخه‌های قیمت'));
  } finally {
    loading.value = false;
  }
}

function openCreate() {
  const nextVersion = Math.max(0, ...versions.value.map((item) => Number(item.version_number) || 0)) + 1;
  form.name = `نسخه ${nextVersion} قیمت تجهیزات ${getCurrentPersianDate().year}`;
  form.notes = '';
  form.items = props.products.map((product) => ({
    product_id: Number(product.id),
    product_name: product.name,
    category_name: product.category_name,
    previous_price_toman: Number(product.daily_price_toman || 0),
    new_price_toman: Number(product.daily_price_toman || 0)
  }));
  createSearch.value = '';
  formError.value = '';
  showCreate.value = true;
}

function closeCreate() {
  if (!saving.value) showCreate.value = false;
}

async function saveVersion() {
  formError.value = '';
  if (!form.name.trim()) { formError.value = 'عنوان نسخه را وارد کنید.'; return; }
  if (!form.items.length) { formError.value = 'برای ساخت نسخه حداقل یک محصول لازم است.'; return; }
  const invalidItem = form.items.find((item) => !Number.isInteger(Number(item.new_price_toman)) || Number(item.new_price_toman) < 0);
  if (invalidItem) { formError.value = `قیمت جدید محصول «${invalidItem.product_name}» معتبر نیست.`; return; }
  saving.value = true;
  try {
    const response = await productService.createPriceVersion({
      name: form.name.trim(), notes: form.notes.trim() || null,
      items: form.items.map((item) => ({ product_id: item.product_id, new_price_toman: Number(item.new_price_toman) }))
    });
    showCreate.value = false;
    toast.success('نسخه قیمت ثبت و قیمت محصولات به‌روزرسانی شد');
    emit('catalog-changed');
    await loadVersions();
    selectedVersion.value = response.data;
    showDetails.value = true;
  } catch (error) {
    formError.value = getApiErrorMessage(error, 'ثبت نسخه قیمت با خطا مواجه شد');
  } finally {
    saving.value = false;
  }
}

async function openDetails(id) {
  showDetails.value = true;
  loadingDetails.value = true;
  selectedVersion.value = null;
  try {
    const response = await productService.getPriceVersion(id);
    selectedVersion.value = response.data;
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'خطا در دریافت جزئیات نسخه قیمت'));
    showDetails.value = false;
  } finally {
    loadingDetails.value = false;
  }
}

function closeDetails() {
  if (!loadingDetails.value) { showDetails.value = false; selectedVersion.value = null; }
}

async function downloadPdf(version) {
  loadingPdfId.value = version.id;
  try {
    const result = await productService.downloadPriceVersionPdf(version.id);
    const url = URL.createObjectURL(result.data);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = result.filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) {
    toast.error(getApiErrorMessage(error, 'دانلود PDF نسخه قیمت با خطا مواجه شد'));
  } finally {
    loadingPdfId.value = null;
  }
}

function priceDelta(item) { return Number(item.new_price_toman || 0) - Number(item.previous_price_toman || 0); }
function formatNumber(value) { return Number(value || 0).toLocaleString('fa-IR'); }
function formatMoney(value) { return `${Number(value || 0).toLocaleString('fa-IR')} تومان`; }
function formatSignedMoney(value) {
  const number = Number(value || 0);
  if (!number) return 'بدون تغییر';
  return `${number > 0 ? '+' : '−'}${Math.abs(number).toLocaleString('fa-IR')} تومان`;
}
function formatDateTime(value) {
  if (!value) return '—';
  const text = String(value);
  const date = toPersianDate(text.slice(0, 10));
  const time = text.includes('T') ? text.slice(11, 16) : text.includes(' ') ? text.slice(11, 16) : '';
  return time ? `${date} - ${time}` : date;
}

watch(() => props.isOpen, (open) => { if (open) loadVersions(); });
</script>

<style scoped>
.price-editor-table :deep(th),
.price-editor-table :deep(td),
.price-details-table :deep(th),
.price-details-table :deep(td) {
  padding: .45rem .5rem;
  vertical-align: middle;
}
</style>
