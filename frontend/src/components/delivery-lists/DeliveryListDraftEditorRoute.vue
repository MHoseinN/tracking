<template>
  <div>
    <Teleport to="#app-shell-actions">
      <button type="button" class="app-button-primary w-full bg-emerald-600 hover:bg-emerald-700"
        :disabled="finalizing" @click="openFinalizeConfirm">
        {{ finalizing ? 'در حال ثبت تحویل...' : 'ثبت نهایی تحویل' }}
      </button>
      <button type="button" class="app-button-primary w-full" :disabled="creating" @click="createAnotherDraft">
        {{ creating ? 'در حال ایجاد...' : 'ایجاد لیست دیگر' }}
      </button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/lists')">فهرست پیش‌نویس‌ها</button>
    </Teleport>

    <AppContentState v-if="loading" loading message="در حال آماده‌سازی پیش‌نویس..." />

    <div v-else class="space-y-5">
      <section class="app-panel p-5">
        <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="flex items-center gap-2">
              <span class="app-badge bg-amber-100 text-amber-700">پیش‌نویس</span>
              <span class="text-xs text-slate-400">شناسه {{ formatNumber(draftId) }}</span>
            </div>
            <h2 class="mt-2 text-xl font-black text-slate-900">ساخت لیست تحویل</h2>
          </div>
          <div class="rounded-lg px-4 py-2 text-sm font-bold" :class="saveStatusClass">
            {{ saveStatusText }}
          </div>
        </div>
      </section>

      <section class="app-panel p-5">
        <h3 class="mb-5 text-base font-black text-slate-800">اطلاعات مشتری و زمان‌ها</h3>
        <div class="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <label class="space-y-2 md:col-span-2">
            <span class="text-sm font-semibold text-slate-700">نام مشتری</span>
            <input v-model.trim="form.customerName" list="delivery-customers" type="text" maxlength="255"
              placeholder="نام مشتری را وارد یا انتخاب کنید" @input="syncCustomerId"
              class="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100" />
            <datalist id="delivery-customers">
              <option v-for="customer in invoiceStore.customers" :key="customer.id" :value="customer.name" />
            </datalist>
            <button type="button" class="mt-2 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              @click="showCustomerModal = true">+ ایجاد مشتری جدید</button>
          </label>

          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">تاریخ تحویل</span>
            <JalaliDatePicker v-model="form.deliveryDate" input-class="h-12" />
          </label>
          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">ساعت تحویل</span>
            <input v-model="form.deliveryTime" type="time"
              class="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-400" />
          </label>
          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">تاریخ تقریبی برگشت</span>
            <JalaliDatePicker v-model="form.expectedReturnDate" input-class="h-12" />
          </label>
          <label class="space-y-2">
            <span class="text-sm font-semibold text-slate-700">ساعت تقریبی برگشت</span>
            <input v-model="form.expectedReturnTime" type="time"
              class="h-12 w-full rounded-lg border border-slate-200 px-4 text-sm outline-none focus:border-blue-400" />
          </label>
          <label class="flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 md:col-span-2">
            <input v-model="form.nightBefore" type="checkbox" class="h-5 w-5 rounded border-slate-300 text-indigo-600" />
            <span>
              <span class="block text-sm font-bold text-slate-700">شب قبل</span>
              <span class="mt-1 block text-xs text-slate-500">روز تحویل در محاسبه اجاره منظور نشود.</span>
            </span>
          </label>
        </div>
      </section>

      <section class="app-panel overflow-hidden">
        <div class="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 class="text-base font-black text-slate-800">اقلام لیست</h3>
            <p class="mt-1 text-xs text-slate-500">تعداد موجودی مانع افزودن محصول نیست.</p>
          </div>
          <div class="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
            <CustomSelect v-model="selectedProductId" :options="availableProductOptions" placeholder="انتخاب محصول"
              wrapper-class="w-full sm:w-80" trigger-class="h-12 rounded-lg border border-slate-200 bg-white px-4 text-sm" />
            <button type="button" class="app-button-primary h-12 px-6" :disabled="!selectedProductId" @click="addProduct">
              افزودن قلم
            </button>
          </div>
        </div>

        <div v-if="!form.items.length" class="px-5 py-14 text-center text-sm text-slate-400">
          هنوز محصولی به این پیش‌نویس اضافه نشده است.
        </div>
        <div v-else class="overflow-x-auto">
          <table class="w-full min-w-[900px]">
            <thead class="border-b border-slate-100 bg-slate-50">
              <tr>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">نام محصول</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">قیمت روزانه</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">تعداد</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">وضعیت</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">توضیحات</th>
                <th class="px-4 py-3 text-right text-xs font-bold text-slate-500">عملیات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in form.items" :key="item.localKey" class="border-b border-slate-100 last:border-0">
                <td class="px-4 py-4 text-sm font-bold text-slate-800">{{ item.product_name_snapshot }}</td>
                <td class="px-4 py-4">
                  <input v-model.number="item.daily_price_toman" type="number" min="0" step="1000"
                    class="h-10 w-44 rounded-lg border border-slate-200 px-3 text-sm" />
                </td>
                <td class="px-4 py-4">
                  <input v-model.number="item.delivered_quantity" type="number" min="1" step="1"
                    class="h-10 w-24 rounded-lg border border-slate-200 px-3 text-sm" />
                </td>
                <td class="px-4 py-4"><span class="app-badge bg-amber-100 text-amber-700">پیش‌نویس</span></td>
                <td class="px-4 py-4">
                  <input v-model.trim="item.notes" type="text" maxlength="1000" placeholder="اختیاری"
                    class="h-10 w-full min-w-48 rounded-lg border border-slate-200 px-3 text-sm" />
                </td>
                <td class="px-4 py-4">
                  <button type="button" class="app-button-secondary border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700"
                    @click="removeProduct(item.localKey)">حذف</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="flex flex-col gap-4 border-t border-slate-100 bg-slate-50 p-5 md:flex-row md:items-end md:justify-between">
          <label class="w-full space-y-2 md:max-w-2xl">
            <span class="text-sm font-semibold text-slate-700">توضیحات کلی لیست</span>
            <textarea v-model.trim="form.notes" rows="3" maxlength="5000"
              class="w-full rounded-lg border border-slate-200 p-3 text-sm outline-none focus:border-blue-400"></textarea>
          </label>
          <div class="rounded-lg border border-slate-200 bg-white px-5 py-4 text-left">
            <p class="text-xs text-slate-500">جمع روزانه اقلام</p>
            <p class="mt-2 text-lg font-black text-indigo-700">{{ formatCurrency(dailyTotal) }}</p>
          </div>
        </div>
      </section>

      <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {{ saveError }}
      </p>
    </div>

    <ConfirmModal :is-open="showFinalizeConfirm" title="ثبت نهایی تحویل"
      :message="finalizeConfirmMessage" :loading="finalizing"
      confirm-text="بله، تحویل ثبت شود" loading-text="در حال ثبت تحویل..."
      @confirm="confirmFinalize" @cancel="showFinalizeConfirm = false" />

    <CustomerFormModal :is-open="showCustomerModal" :existing-customers="invoiceStore.customers"
      @close="showCustomerModal = false" @saved="handleCustomerSaved" />
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import ConfirmModal from '../ConfirmModal.vue';
import CustomSelect from '../CustomSelect.vue';
import CustomerFormModal from '../CustomerFormModal.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import { useDeliveryListStore } from '../../stores/deliveryListStore';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { useProductCatalogStore } from '../../stores/productCatalogStore';
import { getCurrentPersianDate, toGregorianDate, toPersianDate } from '../../utils/dateConverter';

const route = useRoute();
const router = useRouter();
const toast = useToast();
const draftStore = useDeliveryListStore();
const invoiceStore = useInvoiceStore();
const productStore = useProductCatalogStore();
const draftId = computed(() => Number(route.params.id));
const loading = ref(true);
const creating = ref(false);
const finalizing = ref(false);
const showFinalizeConfirm = ref(false);
const showCustomerModal = ref(false);
const selectedProductId = ref('');
const saveStatus = ref('saved');
const saveError = ref('');
const lastSavedAt = ref('');
const currentVersion = ref(1);
const revision = ref(0);
const persistedRevision = ref(0);
const initialized = ref(false);
const hydrating = ref(false);
let autosaveTimer = null;
let savePromise = null;
let localItemCounter = 0;

const form = reactive({
  customerId: null,
  customerName: '',
  deliveryDate: '',
  deliveryTime: '',
  expectedReturnDate: '',
  expectedReturnTime: '11:00',
  nightBefore: false,
  notes: '',
  items: []
});

const availableProductOptions = computed(() => {
  const selectedIds = new Set(form.items.map((item) => Number(item.product_id)));
  return productStore.products
    .filter((product) => !selectedIds.has(Number(product.id)))
    .map((product) => ({
      value: product.id,
      label: `${product.name} — ${formatCurrency(product.daily_price_toman)}`
    }));
});

const dailyTotal = computed(() => form.items.reduce((sum, item) => (
  sum + (Number(item.daily_price_toman) || 0) * (Number(item.delivered_quantity) || 0)
), 0));

const finalizeConfirmMessage = computed(() => (
  `تحویل ${formatNumber(form.items.length)} قلم برای «${form.customerName || 'مشتری نامشخص'}» ثبت شود؟ `
  + 'پس از ثبت، پیش‌نویس به لیست تحویل‌شده تبدیل و پیش‌فاکتور خودکار ایجاد می‌شود.'
));

const saveStatusClass = computed(() => ({
  saving: 'bg-blue-50 text-blue-700',
  dirty: 'bg-amber-50 text-amber-700',
  saved: 'bg-emerald-50 text-emerald-700',
  error: 'bg-rose-50 text-rose-700'
}[saveStatus.value]));

const saveStatusText = computed(() => {
  if (saveStatus.value === 'saving') return 'در حال ذخیره خودکار...';
  if (saveStatus.value === 'dirty') return 'تغییرات در انتظار ذخیره';
  if (saveStatus.value === 'error') return 'ذخیره خودکار ناموفق';
  return lastSavedAt.value ? `ذخیره شد - ${formatSavedTime(lastSavedAt.value)}` : 'همه تغییرات ذخیره شده';
});

watch(form, scheduleAutosave, { deep: true });

onMounted(async () => {
  loading.value = true;
  try {
    const [draft] = await Promise.all([
      draftStore.fetchDraft(draftId.value),
      invoiceStore.customers.length ? Promise.resolve() : invoiceStore.fetchCustomers(),
      productStore.products.length ? Promise.resolve() : productStore.fetchCatalog()
    ]);
    await hydrateDraft(draft);
  } catch (_error) {
    toast.error(draftStore.error || 'آماده‌سازی پیش‌نویس انجام نشد');
    router.replace('/lists');
  } finally {
    loading.value = false;
  }
});

onBeforeRouteLeave(async () => {
  const saved = await persistDraft();
  return saved || false;
});

onBeforeUnmount(() => clearTimeout(autosaveTimer));

async function hydrateDraft(draft) {
  hydrating.value = true;
  const now = new Date();
  const today = getCurrentPersianDate();
  const defaultDate = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;
  const requestedCustomerId = Number(route.query.customer_id);
  const requestedCustomer = !draft.customer_id && requestedCustomerId
    ? invoiceStore.customers.find((item) => Number(item.id) === requestedCustomerId)
    : null;
  form.customerId = draft.customer_id || requestedCustomer?.id || null;
  form.customerName = draft.customer_name || draft.customer_name_snapshot || requestedCustomer?.name || '';
  form.deliveryDate = draft.delivered_at ? toPersianDate(String(draft.delivered_at).slice(0, 10)) : defaultDate;
  form.deliveryTime = draft.delivered_at ? String(draft.delivered_at).slice(11, 16) : `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  form.expectedReturnDate = draft.expected_return_at ? toPersianDate(String(draft.expected_return_at).slice(0, 10)) : '';
  form.expectedReturnTime = draft.expected_return_at ? String(draft.expected_return_at).slice(11, 16) : '11:00';
  form.nightBefore = Boolean(draft.night_before);
  form.notes = draft.notes || '';
  form.items = (draft.items || []).map((item) => ({ ...item, localKey: nextLocalKey() }));
  currentVersion.value = Number(draft.version) || 1;
  lastSavedAt.value = draft.last_autosaved_at || '';
  revision.value = 0;
  persistedRevision.value = 0;
  await nextTick();
  hydrating.value = false;
  initialized.value = true;
  if (!draft.delivered_at) scheduleAutosave();
}

function scheduleAutosave() {
  if (!initialized.value || hydrating.value) return;
  revision.value += 1;
  saveStatus.value = 'dirty';
  saveError.value = '';
  clearTimeout(autosaveTimer);
  autosaveTimer = setTimeout(() => persistDraft(), 800);
}

async function persistDraft() {
  clearTimeout(autosaveTimer);
  if (!initialized.value || revision.value === persistedRevision.value) return true;
  if (savePromise) {
    const previousSaved = await savePromise;
    if (!previousSaved) return false;
    if (revision.value === persistedRevision.value) return true;
  }

  const savingRevision = revision.value;
  saveStatus.value = 'saving';
  syncCustomerId();
  const payload = buildPayload();
  savePromise = draftStore.saveDraft(draftId.value, payload).then((result) => {
    if (!result.success) {
      saveStatus.value = 'error';
      saveError.value = result.message;
      return false;
    }
    currentVersion.value = Number(result.data.version);
    persistedRevision.value = savingRevision;
    lastSavedAt.value = result.data.last_autosaved_at || new Date().toISOString();
    saveStatus.value = revision.value === savingRevision ? 'saved' : 'dirty';
    saveError.value = '';
    return true;
  });
  const saved = await savePromise;
  savePromise = null;
  if (saved && revision.value > persistedRevision.value) {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => persistDraft(), 300);
  }
  return saved;
}

function buildPayload() {
  return {
    version: currentVersion.value,
    customer_id: form.customerId || null,
    customer_name_snapshot: form.customerName || null,
    delivered_at: combineDateTime(form.deliveryDate, form.deliveryTime),
    expected_return_at: combineDateTime(form.expectedReturnDate, form.expectedReturnTime),
    night_before: form.nightBefore,
    notes: form.notes || null,
    items: form.items.map((item) => ({
      product_id: Number(item.product_id),
      daily_price_toman: Math.max(0, Math.round(Number(item.daily_price_toman) || 0)),
      delivered_quantity: Math.max(1, Math.round(Number(item.delivered_quantity) || 1)),
      notes: item.notes || null
    }))
  };
}

function syncCustomerId() {
  const normalized = form.customerName.trim().toLowerCase();
  const customer = invoiceStore.customers.find((item) => String(item.name || '').trim().toLowerCase() === normalized);
  form.customerId = customer?.id || null;
}

function addProduct() {
  const product = productStore.products.find((item) => Number(item.id) === Number(selectedProductId.value));
  if (!product) return;
  form.items.push({
    localKey: nextLocalKey(),
    product_id: product.id,
    product_name_snapshot: product.name,
    daily_price_toman: Number(product.daily_price_toman) || 0,
    delivered_quantity: 1,
    notes: ''
  });
  selectedProductId.value = '';
}

function removeProduct(localKey) {
  form.items = form.items.filter((item) => item.localKey !== localKey);
}

async function createAnotherDraft() {
  if (creating.value) return;
  if (!(await persistDraft())) return toast.error('ابتدا خطای ذخیره پیش‌نویس فعلی را برطرف کنید');
  creating.value = true;
  const result = await draftStore.createDraft();
  creating.value = false;
  if (!result.success) return toast.error(result.message);
  router.push(`/lists/${result.data.id}/edit`);
}

async function openFinalizeConfirm() {
  syncCustomerId();
  const validationMessage = validateForFinalization();
  if (validationMessage) return toast.error(validationMessage);
  if (!(await persistDraft())) return toast.error('ذخیره تغییرات پیش از ثبت تحویل انجام نشد');
  showFinalizeConfirm.value = true;
}

async function confirmFinalize() {
  if (finalizing.value) return;
  finalizing.value = true;
  const result = await draftStore.finalizeDraft(draftId.value, currentVersion.value);
  finalizing.value = false;
  if (!result.success) return toast.error(result.message);
  showFinalizeConfirm.value = false;
  initialized.value = false;
  toast.success(`تحویل با شماره ${result.data.list_number} ثبت و پیش‌فاکتور ایجاد شد`);
  router.replace(`/lists/${result.data.id}`);
}

function validateForFinalization() {
  if (!form.customerId) return 'مشتری را از فهرست انتخاب کنید یا ابتدا مشتری جدید بسازید';
  if (!form.deliveryDate || !form.deliveryTime) return 'تاریخ و ساعت تحویل الزامی است';
  if (!form.expectedReturnDate || !form.expectedReturnTime) return 'تاریخ و ساعت تقریبی برگشت الزامی است';
  if (!form.items.length) return 'حداقل یک محصول به لیست اضافه کنید';
  const deliveredAt = Date.parse(combineDateTime(form.deliveryDate, form.deliveryTime));
  const expectedReturnAt = Date.parse(combineDateTime(form.expectedReturnDate, form.expectedReturnTime));
  if (expectedReturnAt < deliveredAt) return 'زمان تقریبی برگشت نمی‌تواند قبل از زمان تحویل باشد';
  return '';
}

function handleCustomerSaved(customer) {
  showCustomerModal.value = false;
  if (!customer) return;
  form.customerId = customer.id;
  form.customerName = customer.name;
}

function combineDateTime(persianDate, time) {
  if (!persianDate) return null;
  const gregorianDate = toGregorianDate(persianDate);
  const normalizedTime = /^\d{2}:\d{2}$/.test(time || '') ? time : '00:00';
  return `${gregorianDate}T${normalizedTime}:00+03:30`;
}

function nextLocalKey() {
  localItemCounter += 1;
  return `draft-item-${localItemCounter}`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('fa-IR');
}

function formatCurrency(value) {
  return `${formatNumber(value)} تومان`;
}

function formatSavedTime(value) {
  const text = String(value || '');
  return text.length >= 16 ? text.slice(11, 16) : 'اکنون';
}
</script>
