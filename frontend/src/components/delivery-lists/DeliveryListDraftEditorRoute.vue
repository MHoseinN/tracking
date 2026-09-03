<template>
  <div>
    <Teleport v-if="!embedded" to="#app-shell-actions">
      <button type="button" class="app-button-primary w-full bg-emerald-600 hover:bg-emerald-700"
        :disabled="finalizing" @click="openFinalizeConfirm">
        {{ finalizing ? (isDraft ? 'در حال ثبت تحویل...' : 'در حال ذخیره...') : (isDraft ? 'ثبت نهایی تحویل' : 'ذخیره تغییرات لیست') }}
      </button>
      <button type="button" class="app-button-primary w-full" :disabled="creating" @click="createAnotherDraft">
        {{ creating ? 'در حال ایجاد...' : 'ایجاد لیست دیگر' }}
      </button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/lists')">بازگشت به لیست‌ها</button>
    </Teleport>

    <AppContentState v-if="loading" loading message="در حال آماده‌سازی پیش‌نویس..." />

    <div v-else>
      <section class="draft-workspace app-panel overflow-visible">
        <header class="draft-workspace__header">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-lg font-black text-slate-900">{{ isDraft ? 'ایجاد لیست تحویل' : 'ویرایش لیست تحویل' }}</h2>
            <span class="app-badge" :class="editorStatusMeta.className">{{ editorStatusMeta.label }}</span>
            <span class="draft-id-badge">
              {{ isDraft ? `شناسه ${formatNumber(draftId)}` : `شماره لیست ${loadedListNumber || formatNumber(draftId)}` }}
            </span>
          </div>
          <div class="rounded-lg px-3 py-2 text-xs font-bold" :class="saveStatusClass">{{ saveStatusText }}</div>
        </header>

        <div class="draft-information-grid">
          <label class="draft-field draft-field--customer draft-field--row-one-customer">
            <span class="draft-field__label">مشتری</span>
            <div class="draft-customer-control">
              <input v-model.trim="form.customerName" type="text" maxlength="255"
                placeholder="نام مشتری را وارد یا انتخاب کنید" autocomplete="off"
                @focus="customerSearchOpen = true" @input="handleCustomerSearchInput"
                @blur="closeCustomerSearch" @keydown.escape="customerSearchOpen = false" />
              <button type="button" title="ایجاد مشتری جدید" aria-label="ایجاد مشتری جدید"
                @click="showCustomerModal = true">+</button>
            </div>
            <div v-if="customerSearchOpen" class="draft-customer-results">
              <button v-for="customerOption in filteredCustomers" :key="customerOption.id" type="button"
                @mousedown.prevent="selectCustomer(customerOption)">
                <strong>{{ customerOption.name }}</strong>
                <span>{{ customerOption.phone || 'بدون شماره تماس' }}</span>
              </button>
              <div v-if="!filteredCustomers.length" class="draft-customer-results__empty">
                مشتری‌ای با این عبارت پیدا نشد.
              </div>
            </div>
          </label>

          <label class="draft-field draft-field--row-one-date">
            <span class="draft-field__label">تاریخ تحویل</span>
            <JalaliDatePicker v-model="form.deliveryDate" input-class="draft-field__control" />
          </label>
          <label class="draft-field draft-field--row-one-time">
            <span class="draft-field__label">ساعت تحویل</span>
            <TimePicker24 v-model="form.deliveryTime" input-class="draft-field__control" />
          </label>
          <label class="draft-night-before draft-night-before--compact" :class="{ 'draft-night-before--active': form.nightBefore }">
            <input v-model="form.nightBefore" type="checkbox" />
            <span class="draft-night-before__switch" aria-hidden="true"><span></span></span>
            <span><strong>شب قبل</strong><small>روز تحویل در محاسبه اجاره منظور نشود</small></span>
          </label>
          <label class="draft-field draft-field--row-two-date">
            <span class="draft-field__label">تاریخ تقریبی برگشت</span>
            <JalaliDatePicker v-model="form.expectedReturnDate" input-class="draft-field__control" />
          </label>
          <label class="draft-field draft-field--row-two-time">
            <span class="draft-field__label">ساعت تقریبی برگشت</span>
            <TimePicker24 v-model="form.expectedReturnTime" input-class="draft-field__control" />
          </label>
          <label class="draft-field draft-field--notes draft-field--row-two-notes">
            <span class="draft-field__label">توضیحات کلی لیست</span>
            <input v-model.trim="form.notes" class="draft-field__control" type="text" maxlength="5000"
              placeholder="یادداشت اختیاری برای این لیست" />
          </label>
        </div>

        <div ref="itemsSection" class="draft-items-toolbar">
          <div>
            <h3 class="text-base font-black text-slate-800">اقلام لیست</h3>
            <p class="mt-1 text-xs text-slate-500">تحویل، دریافت و مانده هر محصول در یک ردیف مدیریت می‌شود.</p>
          </div>
          <div v-if="isDraft" class="draft-row-actions">
            <div ref="addRowsMenuRef" class="draft-add-rows-control" @keydown.escape.stop="addRowsMenuOpen = false">
              <button type="button" class="draft-add-rows-control__main" @click="addRowsAndFocus(1)">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 5v14M5 12h14" /></svg>
                <span>افزودن ردیف</span>
              </button>
              <button type="button" class="draft-add-rows-control__toggle" aria-label="انتخاب تعداد ردیف"
                :aria-expanded="addRowsMenuOpen" aria-haspopup="menu" @click="addRowsMenuOpen = !addRowsMenuOpen">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="m7 10 5 5 5-5" /></svg>
              </button>
              <div v-if="addRowsMenuOpen" class="draft-add-rows-menu" role="menu">
                <button v-for="count in [5, 10, 20]" :key="count" type="button" role="menuitem"
                  @click="addRowsAndFocus(count)">
                  افزودن {{ formatNumber(count) }} ردیف
                </button>
              </div>
            </div>
            <span class="draft-items-count">{{ formatNumber(activeItems.length) }} قلم انتخاب‌شده</span>
          </div>
          <div v-else class="draft-row-actions draft-return-actions">
            <span class="draft-items-count">{{ pendingReturnCount ? `${formatNumber(pendingReturnCount)} قلم در انتظار ثبت` : `${formatNumber(activeItems.length)} قلم` }}</span>
            <button type="button" class="draft-register-return" :disabled="returning || !pendingReturnCount" @click="openReturnConfirm">
              ثبت دریافت‌ها
            </button>
          </div>
        </div>

        <div class="draft-table-wrap">
          <table class="draft-items-table unified-list-table">
            <thead>
              <tr>
                <th>ردیف</th>
                <th>محصول</th>
                <th>تعداد تحویل</th>
                <th>دریافت (برگشت)</th>
                <th>مانده</th>
                <th>توضیحات</th>
                <th>برگشت کامل</th>
                <th>عملیات</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in displayItems" :key="item.localKey" class="draft-item-row"
                :class="{ 'draft-item-row--empty': !item.product_id, 'unified-return-row--selected': !isDraft && returnEntryFor(item).returnQuantity > 0 }">
                <td class="draft-row-number">{{ formatNumber(index + 1) }}</td>
                <td class="draft-product-search-cell">
                  <div class="draft-product-search">
                    <svg class="draft-product-search__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
                    <input v-model.trim="rowSearchState[item.localKey].query" type="search" :data-product-search="index"
                      role="combobox" aria-autocomplete="list" :aria-expanded="rowSearchState[item.localKey].open"
                      :aria-controls="`product-results-${item.localKey}`" :aria-activedescendant="activeProductOptionId(item)"
                      placeholder="جست‌وجوی نام محصول..." @focus="openRowSearch(item)" @input="handleRowSearchInput(item)"
                      @blur="closeRowSearch(item)" @keydown.escape="rowSearchState[item.localKey].open = false"
                      @keydown.down.prevent="moveRowSearchSelection(item, 1)"
                      @keydown.up.prevent="moveRowSearchSelection(item, -1)"
                      @keydown.enter.prevent="selectHighlightedRowResult(item)" />
                    <div v-if="rowSearchState[item.localKey].open" :id="`product-results-${item.localKey}`"
                      class="draft-product-results" role="listbox">
                      <button v-for="(product, resultIndex) in searchableProductsForRow(item)" :id="productOptionId(item, product)"
                        :key="product.id" type="button" class="draft-product-result"
                        :class="{ 'draft-product-result--active': rowSearchState[item.localKey].activeIndex === resultIndex }"
                        role="option" :aria-selected="rowSearchState[item.localKey].activeIndex === resultIndex"
                        @mouseenter="setRowSearchSelection(item, resultIndex)" @mousedown.prevent="selectProductForRow(item, product)">
                        <span class="draft-product-result__name">{{ product.name }}</span>
                        <strong>{{ formatCurrency(product.daily_price_toman) }}</strong>
                      </button>
                      <div v-if="!searchableProductsForRow(item).length" class="draft-product-results__empty">محصولی با این عبارت پیدا نشد.</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="draft-stepper draft-stepper--compact">
                    <button type="button" :disabled="!item.product_id" @click="decrementQuantity(item)">−</button>
                    <input v-model.number="item.delivered_quantity" type="number" :min="aggregateReturned(item) || 1" step="1" :disabled="!item.product_id" />
                    <button type="button" :disabled="!item.product_id" @click="incrementQuantity(item)">+</button>
                  </div>
                </td>
                <td>
                  <span v-if="isDraft || !item.product_id" class="return-stat">۰</span>
                  <div v-else class="draft-stepper draft-stepper--compact">
                    <button type="button" :disabled="displayReturnedQuantity(item) <= aggregateReturned(item)" @click="changeCumulativeReturned(item, -1)">−</button>
                    <input :value="displayReturnedQuantity(item)" type="number" :min="aggregateReturned(item)" :max="item.delivered_quantity"
                      @input="setCumulativeReturned(item, $event.target.value)" />
                    <button type="button" :disabled="displayReturnedQuantity(item) >= item.delivered_quantity" @click="changeCumulativeReturned(item, 1)">+</button>
                  </div>
                </td>
                <td><strong class="return-stat" :class="remainingAfterReturn(item) ? 'return-stat--remaining' : 'return-stat--complete'">{{ formatNumber(isDraft ? item.delivered_quantity : remainingAfterReturn(item)) }}</strong></td>
                <td><input v-model.trim="item.notes" class="draft-table-input" type="text" maxlength="1000" placeholder="اختیاری" :disabled="!item.product_id" /></td>
                <td>
                  <label class="return-check" :class="{ 'return-check--active': !isDraft && isFullReturnSelected(item), 'return-check--done': !isDraft && currentRemaining(item) === 0 }">
                    <input type="checkbox" :checked="!isDraft && (isFullReturnSelected(item) || currentRemaining(item) === 0)"
                      :disabled="isDraft || currentRemaining(item) === 0" @change="toggleFullReturn(item, $event.target.checked)" />
                    <span aria-hidden="true">✓</span>
                  </label>
                </td>
                <td>
                  <button v-if="isDraft" type="button" class="draft-delete-button" title="حذف قلم" aria-label="حذف قلم"
                    :disabled="!item.product_id && form.items.length <= 5" @click="removeProduct(item.localKey)">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="m19 6-1 14H6L5 6"/><path d="M10 11v5M14 11v5"/></svg>
                  </button>
                  <button v-else type="button" class="damage-action-button"
                    :class="{ 'damage-action-button--active': displayedDamageQuantity(item) > 0 }"
                    :disabled="currentRemaining(item) === 0" @click="openDamageDialog(item)">
                    {{ displayedDamageQuantity(item) ? `خسارت ${formatNumber(displayedDamageQuantity(item))}` : 'ثبت خسارت' }}
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="draft-summary-bar">
          <div class="draft-summary-item"><span>تعداد اقلام</span><strong>{{ formatNumber(activeItems.length) }}</strong></div>
          <div class="draft-summary-item"><span>مجموع تحویلی</span><strong>{{ formatNumber(totalQuantity) }}</strong></div>
          <div v-if="!isDraft" class="draft-summary-item"><span>مجموع برگشته</span><strong class="text-emerald-700">{{ formatNumber(totalReturnedQuantity) }}</strong></div>
          <div v-if="!isDraft" class="draft-summary-item draft-summary-item--total"><span>مجموع مانده</span><strong>{{ formatNumber(totalRemainingQuantity) }}</strong></div>
          <div class="draft-summary-rule" :class="{ 'draft-summary-rule--active': form.nightBefore }">
            {{ form.nightBefore ? 'محاسبه با قاعده شب قبل' : 'محاسبه عادی اجاره' }}
          </div>
        </footer>
      </section>

      <p v-if="saveError" class="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
        {{ saveError }}
      </p>
    </div>

    <ConfirmModal :is-open="isDraft && showFinalizeConfirm" title="ثبت نهایی تحویل"
      :message="finalizeConfirmMessage" :loading="finalizing"
      confirm-text="بله، تحویل ثبت شود" loading-text="در حال ثبت تحویل..."
      @confirm="confirmFinalize" @cancel="showFinalizeConfirm = false" />

    <CustomerFormModal :is-open="showCustomerModal" :existing-customers="invoiceStore.customers"
      @close="showCustomerModal = false" @saved="handleCustomerSaved" />

    <AppModal :is-open="showReturnConfirm" title="ثبت دریافت اقلام" size="sm" :busy="returning" @close="showReturnConfirm = false">
      <div class="return-confirm-form">
        <p>مقادیر ستون «دریافت» برای {{ formatNumber(pendingReturnCount) }} قلم ثبت می‌شود.</p>
        <div class="return-confirm-fields">
          <label class="draft-field">
            <span class="draft-field__label">تاریخ برگشت</span>
            <JalaliDatePicker v-model="returnDate" input-class="draft-field__control" />
          </label>
          <label class="draft-field">
            <span class="draft-field__label">ساعت برگشت</span>
            <TimePicker24 v-model="returnTime" input-class="draft-field__control" />
          </label>
        </div>
      </div>
      <template #footer>
        <button type="button" class="app-button-secondary" :disabled="returning" @click="showReturnConfirm = false">انصراف</button>
        <button type="button" class="app-button-primary" :disabled="returning" @click="submitInlineReturn">{{ returning ? 'در حال ثبت...' : 'تأیید دریافت' }}</button>
      </template>
    </AppModal>

    <AppModal :is-open="Boolean(damageTarget)" title="ثبت خسارت" :description="damageTarget?.product_name_snapshot || ''"
      size="sm" @close="closeDamageDialog">
      <div class="damage-dialog-form">
        <label>
          <span>تعداد خسارت</span>
          <input v-model.number="damageQuantity" type="number" min="1" :max="damageTarget ? currentRemaining(damageTarget) : 1" />
        </label>
        <label>
          <span>توضیح خسارت</span>
          <textarea v-model.trim="damageDescription" rows="3" maxlength="2000" placeholder="نوع و شرح خسارت را بنویسید"></textarea>
        </label>
      </div>
      <template #footer>
        <button type="button" class="app-button-secondary" @click="closeDamageDialog">انصراف</button>
        <button type="button" class="app-button-primary" @click="saveDamageDialog">ثبت خسارت</button>
      </template>
    </AppModal>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue';
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import ConfirmModal from '../ConfirmModal.vue';
import CustomerFormModal from '../CustomerFormModal.vue';
import AppModal from '../ui/AppModal.vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import TimePicker24 from '../TimePicker24.vue';
import { useDeliveryListStore } from '../../stores/deliveryListStore';
import { useInvoiceStore } from '../../stores/invoiceStore';
import { useProductCatalogStore } from '../../stores/productCatalogStore';
import { getCurrentPersianDate, toGregorianDate, toPersianDate } from '../../utils/dateConverter';

const props = defineProps({
  embedded: { type: Boolean, default: false },
  initialList: { type: Object, default: null }
});
const emit = defineEmits(['saved', 'finalized']);
defineExpose({ openFinalizeConfirm, openReturnEntry });
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
const customerSearchOpen = ref(false);
const addRowsMenuOpen = ref(false);
const addRowsMenuRef = ref(null);
const rowSearchState = reactive({});
const returnEntryState = reactive({});
const itemsSection = ref(null);
const returnDate = ref('');
const returnTime = ref('');
const returning = ref(false);
const showReturnConfirm = ref(false);
const damageTarget = ref(null);
const damageQuantity = ref(1);
const damageDescription = ref('');
const saveStatus = ref('saved');
const saveError = ref('');
const lastSavedAt = ref('');
const currentVersion = ref(1);
const loadedStatus = ref('DRAFT');
const loadedListNumber = ref('');
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

const activeItems = computed(() => form.items.filter((item) => Number(item.product_id) > 0));
const displayItems = computed(() => (isDraft.value ? form.items : activeItems.value));
const isDraft = computed(() => loadedStatus.value === 'DRAFT');
const editorStatusMeta = computed(() => ({
  DRAFT: { label: 'پیش‌نویس', className: 'bg-amber-100 text-amber-700' },
  DELIVERED: { label: 'تحویل‌شده', className: 'bg-blue-100 text-blue-700' },
  REMAINING: { label: 'مانده', className: 'bg-orange-100 text-orange-700' },
  NEEDS_FOLLOW_UP: { label: 'نیاز به پیگیری', className: 'bg-rose-100 text-rose-700' },
  COMPLETED: { label: 'تکمیل', className: 'bg-emerald-100 text-emerald-700' }
}[loadedStatus.value] || { label: loadedStatus.value, className: 'bg-slate-100 text-slate-700' }));

const filteredCustomers = computed(() => {
  const query = form.customerName.trim().toLowerCase();
  return invoiceStore.customers
    .filter((customerOption) => !query
      || String(customerOption.name || '').toLowerCase().includes(query)
      || String(customerOption.phone || '').includes(query))
    .slice(0, 8);
});

const totalQuantity = computed(() => activeItems.value.reduce((sum, item) => (
  sum + Math.max(1, Math.round(Number(item.delivered_quantity) || 1))
), 0));
const totalReturnedQuantity = computed(() => activeItems.value.reduce((sum, item) => sum + displayReturnedQuantity(item), 0));
const totalRemainingQuantity = computed(() => activeItems.value.reduce((sum, item) => sum + remainingAfterReturn(item), 0));
const pendingReturnCount = computed(() => activeItems.value.filter((item) => returnEntryFor(item).returnQuantity > 0).length);

const finalizeConfirmMessage = computed(() => (
  `تحویل ${formatNumber(activeItems.value.length)} قلم برای «${form.customerName || 'مشتری نامشخص'}» ثبت شود؟ `
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
  window.addEventListener('keydown', focusProductSearchShortcut);
  document.addEventListener('pointerdown', closeAddRowsMenuOnOutside);
  loading.value = true;
  try {
    const [draft] = await Promise.all([
      props.initialList ? Promise.resolve(props.initialList) : draftStore.fetchDraft(draftId.value),
      invoiceStore.customers.length ? Promise.resolve() : invoiceStore.fetchCustomers(),
      productStore.products.length ? Promise.resolve() : productStore.fetchCatalog()
    ]);
    await hydrateDraft(draft);
  } catch (_error) {
    toast.error(draftStore.error || 'آماده‌سازی پیش‌نویس انجام نشد');
    if (!props.embedded) router.replace('/lists');
  } finally {
    loading.value = false;
  }
});

onBeforeRouteLeave(async () => {
  const saved = await persistDraft();
  return saved || false;
});

onBeforeUnmount(() => {
  clearTimeout(autosaveTimer);
  window.removeEventListener('keydown', focusProductSearchShortcut);
  document.removeEventListener('pointerdown', closeAddRowsMenuOnOutside);
});

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
  loadedStatus.value = draft.status || 'DRAFT';
  Object.keys(returnEntryState).forEach((key) => delete returnEntryState[key]);
  form.items = (draft.items || []).map((item) => createItemRow(item));
  form.items.forEach((item) => initializeReturnEntry(item));
  if (loadedStatus.value === 'DRAFT' && form.items.length < 5) addRows(5 - form.items.length);
  loadedListNumber.value = draft.list_number || '';
  currentVersion.value = Number(draft.version) || 1;
  lastSavedAt.value = draft.last_autosaved_at || '';
  revision.value = 0;
  persistedRevision.value = 0;
  returnDate.value = defaultDate;
  returnTime.value = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
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
  savePromise = draftStore.saveDraft(draftId.value, payload).then(async (result) => {
    if (!result.success) {
      saveStatus.value = 'error';
      saveError.value = result.message;
      return false;
    }
    // Keep local rows linked to the records created by the first autosave.
    // Without this, the next autosave sends the same products with id=null and
    // the backend correctly rejects the duplicate active products.
    hydrating.value = true;
    syncPersistedItemIds(result.data.items || []);
    await nextTick();
    hydrating.value = false;
    currentVersion.value = Number(result.data.version);
    loadedStatus.value = result.data.status || loadedStatus.value;
    loadedListNumber.value = result.data.list_number || loadedListNumber.value;
    persistedRevision.value = savingRevision;
    lastSavedAt.value = result.data.last_autosaved_at || new Date().toISOString();
    saveStatus.value = revision.value === savingRevision ? 'saved' : 'dirty';
    saveError.value = '';
    emit('saved', result.data);
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

function syncPersistedItemIds(savedItems) {
  const idByProductId = new Map(savedItems.map((item) => [
    Number(item.product_id),
    Number(item.id)
  ]));
  form.items.forEach((item) => {
    const persistedId = idByProductId.get(Number(item.product_id));
    if (persistedId) item.id = persistedId;
  });
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
    items: activeItems.value.map((item) => ({
      id: item.id || null,
      product_id: Number(item.product_id),
      daily_price_toman: Math.max(0, Math.round(Number(item.daily_price_toman) || 0)),
      delivered_quantity: Math.max(1, Math.round(Number(item.delivered_quantity) || 1)),
      remaining_expected_return_at: !isDraft.value && aggregateReturned(item) > 0 && currentRemaining(item) > 0
        ? combineDateTime(form.expectedReturnDate, form.expectedReturnTime || '11:00')
        : null,
      notes: item.notes || null
    }))
  };
}

function syncCustomerId() {
  const normalized = form.customerName.trim().toLowerCase();
  const customer = invoiceStore.customers.find((item) => String(item.name || '').trim().toLowerCase() === normalized);
  form.customerId = customer?.id || null;
}

function handleCustomerSearchInput() {
  syncCustomerId();
  customerSearchOpen.value = true;
}

function selectCustomer(customerOption) {
  form.customerId = customerOption.id;
  form.customerName = customerOption.name;
  customerSearchOpen.value = false;
}

function closeCustomerSearch() {
  window.setTimeout(() => { customerSearchOpen.value = false; }, 120);
}

function createItemRow(item = {}) {
  const localKey = nextLocalKey();
  rowSearchState[localKey] = {
    query: item.product_name_snapshot || '',
    open: false,
    activeIndex: -1
  };
  return {
    localKey,
    id: item.id || null,
    product_id: item.product_id || null,
    product_name_snapshot: item.product_name_snapshot || '',
    daily_price_toman: Number(item.daily_price_toman) || 0,
    delivered_quantity: Math.max(1, Math.round(Number(item.delivered_quantity) || 1)),
    healthy_returned_quantity: Math.max(0, Math.round(Number(item.healthy_returned_quantity) || 0)),
    damaged_quantity: Math.max(0, Math.round(Number(item.damaged_quantity) || 0)),
    notes: item.notes || ''
  };
}

function addRows(count) {
  const rows = Array.from({ length: Number(count) || 0 }, () => createItemRow());
  form.items.push(...rows);
}

function addRowsAndFocus(count) {
  const firstNewRowIndex = form.items.length;
  addRows(count);
  addRowsMenuOpen.value = false;
  nextTick(() => {
    document.querySelector(`[data-product-search="${firstNewRowIndex}"]`)?.focus();
  });
}

function closeAddRowsMenuOnOutside(event) {
  if (!addRowsMenuOpen.value || addRowsMenuRef.value?.contains(event.target)) return;
  addRowsMenuOpen.value = false;
}

function searchableProductsForRow(item) {
  const selectedIds = new Set(activeItems.value
    .filter((selectedItem) => selectedItem.localKey !== item.localKey)
    .map((selectedItem) => Number(selectedItem.product_id)));
  const query = String(rowSearchState[item.localKey]?.query || '').trim().toLowerCase();
  return productStore.products
    .filter((product) => !selectedIds.has(Number(product.id)))
    .filter((product) => !query || String(product.name || '').toLowerCase().includes(query))
    .slice(0, 8);
}

function openRowSearch(item) {
  const state = rowSearchState[item.localKey];
  state.open = true;
  const resultCount = searchableProductsForRow(item).length;
  if (!resultCount) state.activeIndex = -1;
  else if (state.activeIndex >= resultCount) state.activeIndex = -1;
}

function handleRowSearchInput(item) {
  rowSearchState[item.localKey].activeIndex = -1;
  openRowSearch(item);
}

function selectProductForRow(item, product) {
  if (!product) return;
  item.product_id = product.id;
  item.product_name_snapshot = product.name;
  item.daily_price_toman = Number(product.daily_price_toman) || 0;
  item.delivered_quantity = Math.max(1, Number(item.delivered_quantity) || 1);
  rowSearchState[item.localKey].query = product.name;
  rowSearchState[item.localKey].open = false;
  rowSearchState[item.localKey].activeIndex = -1;
}

function productOptionId(item, product) {
  return `product-option-${item.localKey}-${product.id}`;
}

function activeProductOptionId(item) {
  const state = rowSearchState[item.localKey];
  if (!state?.open || state.activeIndex < 0) return undefined;
  const product = searchableProductsForRow(item)[state.activeIndex];
  return product ? productOptionId(item, product) : undefined;
}

function setRowSearchSelection(item, index) {
  rowSearchState[item.localKey].activeIndex = index;
}

function moveRowSearchSelection(item, direction) {
  const results = searchableProductsForRow(item);
  const state = rowSearchState[item.localKey];
  state.open = true;
  if (!results.length) {
    state.activeIndex = -1;
    return;
  }
  const current = Number(state.activeIndex);
  if (!Number.isInteger(current) || current < 0 || current >= results.length) {
    state.activeIndex = direction > 0 ? 0 : results.length - 1;
  } else {
    state.activeIndex = (current + direction + results.length) % results.length;
  }
  nextTick(() => {
    document.getElementById(activeProductOptionId(item))?.scrollIntoView({ block: 'nearest' });
  });
}

function selectHighlightedRowResult(item) {
  const results = searchableProductsForRow(item);
  const state = rowSearchState[item.localKey];
  const selected = results[state.activeIndex] || results[0];
  if (selected) selectProductForRow(item, selected);
}

function closeRowSearch(item) {
  window.setTimeout(() => {
    rowSearchState[item.localKey].open = false;
    rowSearchState[item.localKey].query = item.product_name_snapshot || '';
  }, 120);
}

function focusProductSearchShortcut(event) {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
  const target = event.target;
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target?.isContentEditable) return;
  event.preventDefault();
  document.querySelector('[data-product-search="0"]')?.focus();
}

function incrementQuantity(item) {
  item.delivered_quantity = Math.max(1, Math.round(Number(item.delivered_quantity) || 1)) + 1;
}

function decrementQuantity(item) {
  item.delivered_quantity = Math.max(aggregateReturned(item) || 1, Math.round(Number(item.delivered_quantity) || 1) - 1);
}

function initializeReturnEntry(item) {
  if (!returnEntryState[item.localKey]) {
    returnEntryState[item.localKey] = {
      returnQuantity: 0,
      damagedQuantity: 0,
      damageNotes: ''
    };
  }
  return returnEntryState[item.localKey];
}

function returnEntryFor(item) {
  return initializeReturnEntry(item);
}

function aggregateReturned(item) {
  return Math.max(0,
    Math.round(Number(item.healthy_returned_quantity) || 0)
    + Math.round(Number(item.damaged_quantity) || 0));
}

function currentRemaining(item) {
  return Math.max(0, Math.round(Number(item.delivered_quantity) || 0) - aggregateReturned(item));
}

function remainingAfterReturn(item) {
  return Math.max(0, currentRemaining(item) - returnEntryFor(item).returnQuantity);
}

function displayReturnedQuantity(item) {
  return aggregateReturned(item) + returnEntryFor(item).returnQuantity;
}

function displayedDamageQuantity(item) {
  return Math.max(0, Math.round(Number(item.damaged_quantity) || 0)) + returnEntryFor(item).damagedQuantity;
}

function isFullReturnSelected(item) {
  const remaining = currentRemaining(item);
  return remaining > 0 && returnEntryFor(item).returnQuantity === remaining;
}

function toggleFullReturn(item, checked) {
  setReturnQuantity(item, checked ? currentRemaining(item) : 0);
}

function setReturnQuantity(item, value) {
  const state = returnEntryFor(item);
  state.returnQuantity = Math.min(currentRemaining(item), Math.max(0, Math.round(Number(value) || 0)));
  state.damagedQuantity = Math.min(state.damagedQuantity, state.returnQuantity);
}

function setCumulativeReturned(item, value) {
  const normalized = Math.min(
    Math.max(aggregateReturned(item), Math.round(Number(value) || 0)),
    Math.max(aggregateReturned(item), Math.round(Number(item.delivered_quantity) || 0))
  );
  setReturnQuantity(item, normalized - aggregateReturned(item));
}

function changeCumulativeReturned(item, amount) {
  setCumulativeReturned(item, displayReturnedQuantity(item) + amount);
}

async function openReturnEntry() {
  await nextTick();
  itemsSection.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function openReturnConfirm() {
  if (!pendingReturnCount.value) return toast.info('ابتدا تعداد دریافت را در جدول وارد کنید');
  showReturnConfirm.value = true;
}

function openDamageDialog(item) {
  if (currentRemaining(item) <= 0) return;
  const state = returnEntryFor(item);
  damageTarget.value = item;
  damageQuantity.value = state.damagedQuantity || 1;
  damageDescription.value = state.damageNotes || '';
}

function closeDamageDialog() {
  damageTarget.value = null;
  damageQuantity.value = 1;
  damageDescription.value = '';
}

function saveDamageDialog() {
  const item = damageTarget.value;
  if (!item) return;
  const quantity = Math.min(currentRemaining(item), Math.max(1, Math.round(Number(damageQuantity.value) || 0)));
  if (!damageDescription.value.trim()) return toast.error('توضیح خسارت را وارد کنید');
  const state = returnEntryFor(item);
  state.returnQuantity = Math.max(state.returnQuantity, quantity);
  state.damagedQuantity = quantity;
  state.damageNotes = damageDescription.value.trim();
  closeDamageDialog();
}

async function submitInlineReturn() {
  if (returning.value) return;
  if (!returnDate.value || !returnTime.value) return toast.error('تاریخ و ساعت برگشت را وارد کنید');
  const returnedAt = combineDateTime(returnDate.value, returnTime.value);
  if (!returnedAt || Date.parse(returnedAt) < Date.parse(combineDateTime(form.deliveryDate, form.deliveryTime))) {
    return toast.error('زمان برگشت نمی‌تواند قبل از زمان تحویل باشد');
  }
  const selectedItems = activeItems.value.filter((item) => returnEntryFor(item).returnQuantity > 0);
  if (!selectedItems.length) return toast.error('حداقل یک قلم را برای برگشت انتخاب کنید');
  const hasRemaining = selectedItems.some((item) => remainingAfterReturn(item) > 0);
  const expectedReturnAt = combineDateTime(form.expectedReturnDate, form.expectedReturnTime);
  if (hasRemaining && (!expectedReturnAt || Date.parse(expectedReturnAt) < Date.parse(returnedAt))) {
    showReturnConfirm.value = false;
    return toast.error('برای اقلام مانده، تاریخ برگشت تقریبی لیست را بعد از زمان این برگشت قرار دهید');
  }
  for (const item of selectedItems) {
    const state = returnEntryFor(item);
    if (state.damagedQuantity > 0 && !state.damageNotes.trim()) {
      return toast.error(`شرح خسارت «${item.product_name_snapshot}» را وارد کنید`);
    }
  }
  if (!(await persistDraft())) return toast.error('ابتدا ذخیره تغییرات لیست را کامل کنید');

  returning.value = true;
  const result = await draftStore.recordReturn(draftId.value, {
    returned_at: returnedAt,
    notes: null,
    items: selectedItems.map((item) => {
      const state = returnEntryFor(item);
      return {
        delivery_list_item_id: Number(item.id),
        healthy_quantity: state.returnQuantity - state.damagedQuantity,
        damaged_quantity: state.damagedQuantity,
        remaining_expected_return_at: remainingAfterReturn(item) > 0
          ? expectedReturnAt
          : null,
        damage_notes: state.damageNotes || null
      };
    })
  });
  returning.value = false;
  if (!result.success) return toast.error(result.message);
  showReturnConfirm.value = false;
  await hydrateDraft(result.data);
  emit('saved', result.data);
  toast.success(result.data.status === 'COMPLETED' ? 'برگشت کامل ثبت و لیست تکمیل شد' : 'برگشت اقلام و مانده‌ها ثبت شد');
}

function removeProduct(localKey) {
  const index = form.items.findIndex((item) => item.localKey === localKey);
  if (index < 0) return;
  const oldKey = form.items[index].localKey;
  delete rowSearchState[oldKey];
  if (form.items.length > 5) form.items.splice(index, 1);
  else form.items.splice(index, 1, createItemRow());
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
  if (!isDraft.value) {
    finalizing.value = true;
    const saved = await persistDraft();
    finalizing.value = false;
    if (!saved) return toast.error('ذخیره تغییرات لیست انجام نشد');
    toast.success('تغییرات لیست ذخیره شد');
    return;
  }
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
  emit('finalized', result.data);
  router.replace(`/lists/${result.data.id}`);
}

function validateForFinalization() {
  if (!form.customerId) return 'مشتری را از فهرست انتخاب کنید یا ابتدا مشتری جدید بسازید';
  if (!form.deliveryDate || !form.deliveryTime) return 'تاریخ و ساعت تحویل الزامی است';
  if (!form.expectedReturnDate || !form.expectedReturnTime) return 'تاریخ و ساعت تقریبی برگشت الزامی است';
  if (!activeItems.value.length) return 'حداقل یک محصول به لیست اضافه کنید';
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

<style scoped>
.draft-workspace {
  --draft-green: #0f5f4c;
  --draft-green-dark: #0b493b;
  --draft-sage: #edf6f0;
  --draft-cream: #fffdf8;
  --draft-border: #ded7c8;
  background: var(--draft-cream);
  border-color: #e4dccd;
}

.draft-workspace__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #ebe4d7;
}
.draft-id-badge {
  border: 1px solid #b8ddce;
  border-radius: 999px;
  background: #eaf7f0;
  padding: .3rem .65rem;
  color: #0f6b53;
  font-size: .7rem;
  font-weight: 900;
}

.draft-information-grid {
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  gap: .9rem;
  padding: 1.25rem;
  border-bottom: 1px solid #ebe4d7;
}

.draft-field {
  position: relative;
  grid-column: span 2;
  min-width: 0;
  height: 3.25rem;
  border: 1px solid var(--draft-border);
  border-radius: .7rem;
  background: #fff;
}

.draft-field--customer { z-index: 40; grid-column: span 3; }
.draft-field--notes { grid-column: span 4; }
.draft-field--row-one-customer { grid-column: span 4; }
.draft-field--row-one-date,
.draft-field--row-one-time,
.draft-field--row-two-date,
.draft-field--row-two-time { grid-column: span 2; }
.draft-night-before--compact { grid-column: span 4; min-height: 3.25rem; }
.draft-field--row-two-notes { grid-column: span 8; }
.draft-field--readonly {
  display: flex;
  align-items: center;
  padding: 0 .9rem;
  color: #475569;
  font-size: .8rem;
  font-weight: 700;
  background: #faf8f2;
}

.draft-field__label {
  position: absolute;
  z-index: 2;
  top: -.55rem;
  right: .75rem;
  padding-inline: .35rem;
  background: var(--draft-cream);
  color: #475569;
  font-size: .7rem;
  font-weight: 800;
  line-height: 1rem;
}

.draft-field__control,
.draft-field :deep(.draft-field__control),
.draft-customer-control input {
  width: 100%;
  height: 100%;
  border: 0 !important;
  border-radius: .65rem;
  background: transparent;
  padding: 0 .9rem;
  color: #1e293b;
  font-size: .82rem;
  outline: none;
  box-shadow: none !important;
}

.draft-field:focus-within {
  border-color: #4c8c79;
  box-shadow: 0 0 0 3px rgba(15, 95, 76, .08);
}

.draft-field > .draft-field__control,
.draft-field :deep(input.draft-field__control) {
  direction: ltr;
  text-align: center;
}
.draft-field--notes > .draft-field__control { direction: rtl; text-align: right; }

.draft-customer-control { display: flex; height: 100%; align-items: center; }
.draft-customer-control button {
  display: grid;
  width: 2.25rem;
  height: 2.25rem;
  margin-left: .45rem;
  flex: 0 0 auto;
  place-items: center;
  border-radius: .55rem;
  background: var(--draft-sage);
  color: var(--draft-green);
  font-size: 1.25rem;
  font-weight: 900;
}
.draft-customer-results {
  position: absolute;
  z-index: 80;
  top: calc(100% + .4rem);
  right: 0;
  width: 100%;
  max-height: 18rem;
  overflow-y: auto;
  border: 1px solid #d9d3c7;
  border-radius: .75rem;
  background: #fff;
  box-shadow: 0 18px 38px rgba(35, 48, 43, .2);
}
.draft-customer-results button {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  padding: .75rem .85rem;
  border-bottom: 1px solid #eee9df;
  text-align: right;
}
.draft-customer-results button:last-child { border-bottom: 0; }
.draft-customer-results button:hover { background: var(--draft-sage); }
.draft-customer-results strong { overflow: hidden; color: #1e293b; font-size: .78rem; text-overflow: ellipsis; white-space: nowrap; }
.draft-customer-results span { color: #64748b; direction: ltr; font-size: .68rem; white-space: nowrap; }
.draft-customer-results__empty { padding: 1rem; color: #94a3b8; font-size: .72rem; text-align: center; }

.draft-night-before {
  grid-column: span 4;
  display: flex;
  min-width: 0;
  min-height: 3rem;
  align-items: center;
  gap: .65rem;
  padding: .4rem .65rem;
  border: 1px solid var(--draft-border);
  border-radius: .7rem;
  background: #faf8f2;
  cursor: pointer;
}
.draft-night-before--active { border-color: #86b7a8; background: var(--draft-sage); }
.draft-night-before > input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.draft-night-before__switch {
  display: flex;
  width: 2rem;
  height: 1.1rem;
  flex: 0 0 auto;
  align-items: center;
  padding: .15rem;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background .2s;
}
.draft-night-before--compact .draft-night-before__switch { width: 1.65rem; height: .92rem; padding: .12rem; }
.draft-night-before--compact .draft-night-before__switch span { width: .68rem; height: .68rem; }
.draft-night-before--compact.draft-night-before--active .draft-night-before__switch span { transform: translateX(-.72rem); }
.draft-night-before__switch span {
  width: .8rem;
  height: .8rem;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, .2);
  transition: transform .2s;
}
.draft-night-before--active .draft-night-before__switch { background: var(--draft-green); }
.draft-night-before--active .draft-night-before__switch span { transform: translateX(-.9rem); }
.draft-night-before strong { display: block; color: #334155; font-size: .72rem; }
.draft-night-before small { display: block; margin-top: .1rem; color: #64748b; font-size: .6rem; }

.draft-items-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
}
.draft-items-count {
  border: 1px solid #cde2d8;
  border-radius: 999px;
  background: var(--draft-sage);
  padding: .4rem .75rem;
  color: var(--draft-green);
  font-size: .75rem;
  font-weight: 900;
}
.draft-row-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .45rem; }
.draft-row-actions > span:first-child { color: #64748b; font-size: .7rem; font-weight: 800; }
.draft-row-actions > button {
  min-width: 2.6rem;
  height: 2rem;
  border: 1px solid #bcd7cc;
  border-radius: .5rem;
  background: #fff;
  color: var(--draft-green);
  font-size: .7rem;
  font-weight: 900;
}
.draft-row-actions > button:hover { background: var(--draft-sage); }
.draft-row-actions > .draft-register-return {
  min-width: 7.5rem;
  border-color: var(--draft-green);
  background: var(--draft-green);
  color: #fff;
}
.draft-row-actions > .draft-register-return:hover:not(:disabled) { background: var(--draft-green-dark); }
.draft-row-actions > .draft-register-return:disabled { cursor: not-allowed; opacity: .45; }
.draft-add-rows-control {
  position: relative;
  z-index: 40;
  display: inline-flex;
  align-items: stretch;
  direction: rtl;
}
.draft-add-rows-control__main,
.draft-add-rows-control__toggle {
  display: inline-flex;
  height: 2.35rem;
  align-items: center;
  justify-content: center;
  border: 0;
  background: var(--draft-green);
  color: #fff;
  font-size: .75rem;
  font-weight: 900;
  transition: background .15s ease;
}
.draft-add-rows-control__main {
  gap: .45rem;
  border-radius: 0 .55rem .55rem 0;
  padding: 0 .85rem;
}
.draft-add-rows-control__toggle {
  width: 2.15rem;
  border-right: 1px solid rgba(255, 255, 255, .3);
  border-radius: .55rem 0 0 .55rem;
  background: #2f8d63;
}
.draft-add-rows-control__main:hover,
.draft-add-rows-control__toggle:hover { background: var(--draft-green-dark); }
.draft-add-rows-control__main svg { width: 1.05rem; }
.draft-add-rows-control__toggle svg { width: .95rem; }
.draft-add-rows-menu {
  position: absolute;
  z-index: 150;
  top: calc(100% + .35rem);
  right: 0;
  width: 100%;
  min-width: 9.5rem;
  overflow: hidden;
  border: 1px solid #d9d3c7;
  border-radius: .6rem;
  background: #fff;
  box-shadow: 0 14px 30px rgba(35, 48, 43, .18);
}
.draft-add-rows-menu button {
  display: block;
  width: 100%;
  padding: .65rem .75rem;
  border-bottom: 1px solid #eee9df;
  color: #234238;
  font-size: .72rem;
  font-weight: 800;
  text-align: right;
}
.draft-add-rows-menu button:last-child { border-bottom: 0; }
.draft-add-rows-menu button:hover,
.draft-add-rows-menu button:focus-visible { background: var(--draft-sage); outline: none; }

.draft-table-wrap { position: relative; overflow: visible; padding-inline: 1.25rem; }
.draft-items-table { width: 100%; table-layout: fixed; border-collapse: separate; border-spacing: 0; }
.draft-items-table th,
.draft-items-table td {
  height: 3.55rem;
  padding: .45rem .5rem;
  border-left: 1px solid #e7e1d6;
  border-bottom: 1px solid #e7e1d6;
  text-align: center;
  vertical-align: middle;
}
.draft-items-table th:first-child,
.draft-items-table td:first-child { border-right: 1px solid #e7e1d6; }
.draft-items-table thead th {
  height: 2.75rem;
  border-top: 1px solid #e7e1d6;
  background: #f3f7f3;
  color: #365247;
  font-size: .7rem;
  font-weight: 900;
}
.draft-items-table thead th:first-child { border-top-right-radius: .65rem; }
.draft-items-table thead th:last-child { border-top-left-radius: .65rem; }
.draft-items-table th:nth-child(1) { width: 5%; }
.draft-items-table th:nth-child(2) { width: 29%; }
.draft-items-table th:nth-child(3) { width: 12%; }
.draft-items-table th:nth-child(4) { width: 16%; }
.draft-items-table th:nth-child(5) { width: 16%; }
.draft-items-table th:nth-child(6) { width: 16%; }
.draft-items-table th:nth-child(7) { width: 6%; }
.unified-list-table { min-width: 0; }
.unified-list-table th:nth-child(1) { width: 4%; }
.unified-list-table th:nth-child(2) { width: 27%; }
.unified-list-table th:nth-child(3) { width: 12%; }
.unified-list-table th:nth-child(4) { width: 14%; }
.unified-list-table th:nth-child(5) { width: 8%; }
.unified-list-table th:nth-child(6) { width: 21%; }
.unified-list-table th:nth-child(7) { width: 7%; }
.unified-list-table th:nth-child(8) { width: 7%; }
.draft-add-row td { position: relative; background: #f5f8f1; color: #64748b; font-size: .7rem; }
.draft-add-row__number {
  display: inline-grid;
  width: 1.75rem;
  height: 1.75rem;
  place-items: center;
  border-radius: 999px;
  background: var(--draft-green);
  color: #fff;
  font-size: 1rem;
  font-weight: 900;
}
.draft-add-row__hint { color: #94a3b8 !important; }
.draft-add-row__action {
  display: inline-block;
  color: var(--draft-green);
  font-size: .65rem;
  font-weight: 900;
  white-space: nowrap;
}

.draft-product-search-cell {
  position: relative;
  z-index: 1;
  overflow: visible;
  padding: 0 !important;
}
.draft-product-search-cell:focus-within {
  z-index: 100;
  background: #f5faf6 !important;
}
.draft-product-search {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 3.55rem;
}
.draft-product-search > input {
  width: 100%;
  height: 100%;
  min-height: 3.55rem;
  border: 0;
  border-radius: 0;
  background: transparent;
  padding: 0 2.25rem 0 2.3rem;
  color: #1e293b;
  font-size: .76rem;
  outline: none;
}
.draft-product-search > input:focus { box-shadow: none; }
.draft-product-search__icon {
  position: absolute;
  z-index: 2;
  top: 50%;
  right: .7rem;
  width: 1.05rem;
  color: var(--draft-green);
  transform: translateY(-50%);
  pointer-events: none;
}
.draft-product-search kbd {
  position: absolute;
  z-index: 2;
  top: .58rem;
  left: .55rem;
  min-width: 1.45rem;
  border: 1px solid #d8d3c8;
  border-radius: .35rem;
  background: #f6f3eb;
  padding: .12rem .3rem;
  color: #64748b;
  font-size: .65rem;
}
.draft-product-results {
  position: absolute;
  z-index: 110;
  top: 100%;
  right: 0;
  width: 100%;
  min-width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  max-height: 18rem;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid #d9d3c7;
  border-radius: 0 0 .7rem .7rem;
  background: #fff;
  box-shadow: 0 18px 40px rgba(35, 48, 43, .18);
}
.draft-product-result {
  display: grid;
  width: 100%;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: .75rem;
  padding: .7rem .8rem;
  border-bottom: 1px solid #eee9df;
  text-align: right;
  transition: background .15s;
}
.draft-product-result:last-child { border-bottom: 0; }
.draft-product-result:hover { background: var(--draft-sage); }
.draft-product-result--active {
  background: var(--draft-sage);
  box-shadow: inset -3px 0 0 var(--draft-green);
}
.draft-product-result span { overflow: hidden; color: #64748b; font-size: .7rem; text-overflow: ellipsis; white-space: nowrap; }
.draft-product-result__name { color: #1e293b !important; font-size: .76rem !important; font-weight: 900; }
.draft-product-result strong { color: var(--draft-green); font-size: .72rem; white-space: nowrap; }
.draft-product-results__empty { padding: 1rem; color: #94a3b8; font-size: .75rem; text-align: center; }

.draft-item-row td { background: #fff; color: #334155; font-size: .75rem; }
.draft-item-row:nth-child(odd) td { background: #fffdfa; }
.draft-item-row--empty td { background: #fbfcf8 !important; }
.draft-item-row--empty .draft-table-input,
.draft-item-row--empty .draft-stepper { opacity: .55; }
.draft-table-input:disabled,
.draft-stepper button:disabled,
.draft-stepper input:disabled { cursor: not-allowed; }
.draft-row-number { color: #64748b !important; font-weight: 800; }
.draft-product-name { text-align: right !important; font-weight: 900; }
.draft-product-category { color: #64748b !important; }
.draft-stepper {
  display: grid;
  height: 2.25rem;
  grid-template-columns: 1.8rem minmax(2rem, 1fr) 1.8rem;
  overflow: hidden;
  border: 1px solid #dcd7cc;
  border-radius: .5rem;
  background: #fff;
}
.draft-stepper button { color: var(--draft-green); font-size: 1rem; font-weight: 900; }
.draft-stepper input { min-width: 0; border-inline: 1px solid #e7e1d6; text-align: center; outline: none; }
.draft-stepper--compact {
  height: 2rem;
  grid-template-columns: 1.55rem minmax(1.8rem, 1fr) 1.55rem;
}
.draft-stepper--compact button { font-size: .85rem; }
.unified-return-row--selected td { background: #f2f9f5 !important; }
.return-check { display: inline-grid; cursor: pointer; place-items: center; }
.return-check input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.return-check span {
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 1px solid #cfd8d3;
  border-radius: .58rem;
  background: #fff;
  color: transparent;
  font-size: .9rem;
  font-weight: 900;
  transition: .15s ease;
}
.return-check--active span,
.return-check--done span { border-color: #8cc5ae; background: var(--draft-green); color: #fff; }
.return-check--done { cursor: default; opacity: .65; }
.return-stat {
  display: inline-grid;
  min-width: 2rem;
  height: 1.75rem;
  place-items: center;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: .75rem;
}
.return-stat--returned { background: #e8f7ef; color: #087255; }
.return-stat--remaining { background: #fff3dd; color: #b45309; }
.return-stat--complete { background: #e8f7ef; color: #087255; }
.damage-action-button {
  min-height: 2rem;
  border: 1px solid #f3c7b9;
  border-radius: .5rem;
  background: #fff7ed;
  padding: .35rem .45rem;
  color: #c2410c;
  font-size: .62rem;
  font-weight: 900;
  white-space: nowrap;
}
.damage-action-button--active { border-color: #fb7185; background: #fff1f2; color: #be123c; }
.damage-action-button:disabled { cursor: not-allowed; opacity: .4; }
.return-confirm-form,
.damage-dialog-form {
  --draft-green: #0f5f4c;
  --draft-cream: #fffdf8;
  --draft-border: #ded7c8;
}
.return-confirm-form { display: grid; gap: 1rem; }
.return-confirm-form > p { color: #475569; font-size: .78rem; line-height: 1.8; }
.return-confirm-fields { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: .75rem; padding-top: .35rem; }
.return-confirm-fields .draft-field { grid-column: auto; width: 100%; }
.damage-dialog-form { display: grid; gap: 1rem; }
.damage-dialog-form label { display: grid; gap: .4rem; color: #475569; font-size: .72rem; font-weight: 800; }
.damage-dialog-form input,
.damage-dialog-form textarea {
  width: 100%;
  border: 1px solid #ded7c8;
  border-radius: .65rem;
  background: #fff;
  padding: .7rem .8rem;
  color: #1e293b;
  font-size: .78rem;
  outline: none;
}
.damage-dialog-form input { height: 2.8rem; text-align: center; }
.damage-dialog-form textarea { resize: vertical; }
.damage-dialog-form input:focus,
.damage-dialog-form textarea:focus { border-color: var(--draft-green); box-shadow: 0 0 0 3px rgba(15, 95, 76, .08); }
.draft-table-input {
  width: 100%;
  height: 2.25rem;
  min-width: 0;
  border: 1px solid #dcd7cc;
  border-radius: .5rem;
  background: #fff;
  padding: 0 .55rem;
  color: #334155;
  font-size: .72rem;
  outline: none;
}
.draft-table-input:focus { border-color: #6f9e8f; box-shadow: 0 0 0 2px rgba(15, 95, 76, .07); }
.draft-price-input { text-align: center; }
.draft-line-total { color: var(--draft-green) !important; font-weight: 900; }
.draft-delete-button {
  display: inline-grid;
  width: 2.15rem;
  height: 2.15rem;
  place-items: center;
  border: 1px solid #fecdd3;
  border-radius: .55rem;
  background: #fff1f2;
  color: #e11d48;
}
.draft-delete-button svg { width: 1rem; }
.draft-empty-row td { height: 4.5rem; color: #94a3b8; font-size: .75rem; text-align: center; }

.draft-summary-bar {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
  align-items: stretch;
  gap: 0;
  margin-top: 1.25rem;
  border-top: 1px solid #e5dfd3;
  background: #faf8f2;
}
.draft-summary-item {
  display: flex;
  min-height: 4.5rem;
  flex-direction: column;
  justify-content: center;
  gap: .35rem;
  padding: .75rem 1.25rem;
  border-left: 1px solid #e5dfd3;
}
.draft-summary-item span { color: #64748b; font-size: .7rem; }
.draft-summary-item strong { color: #1e293b; font-size: .95rem; }
.draft-summary-item--total strong { color: var(--draft-green); font-size: 1.05rem; }
.draft-summary-rule {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 11rem;
  padding: .75rem 1rem;
  color: #64748b;
  font-size: .72rem;
  font-weight: 800;
}
.draft-summary-rule--active { background: #e6f3eb; color: var(--draft-green); }

@media (max-width: 1279px) {
  .draft-field--row-one-customer { grid-column: span 4; }
  .draft-field--row-one-date, .draft-field--row-one-time { grid-column: span 2; }
  .draft-night-before--compact { grid-column: span 4; }
  .draft-field--row-two-date, .draft-field--row-two-time { grid-column: span 2; }
  .draft-field--row-two-notes { grid-column: span 8; }
}

@media (max-width: 767px) {
  .draft-workspace__header { align-items: flex-start; flex-direction: column; }
  .draft-information-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 1rem; }
  .draft-field--row-one-customer, .draft-night-before--compact, .draft-field--row-two-notes { grid-column: span 2; }
  .draft-field--row-one-date, .draft-field--row-one-time, .draft-field--row-two-date, .draft-field--row-two-time { grid-column: span 1; }
  .draft-table-wrap { padding-inline: .35rem; overflow: visible; }
  .unified-list-table { min-width: 0; }
  .draft-summary-bar { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .draft-summary-item { border-bottom: 1px solid #e5dfd3; }
  .draft-summary-rule { min-width: 0; }
}
</style>
