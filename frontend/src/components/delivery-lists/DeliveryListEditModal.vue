<template>
  <AppModal title="ویرایش لیست" :is-open="isOpen"  size="md" :busy="saving"
    
    @close="emit('close')">
    <form id="delivery-list-quick-edit-form" class="space-y-5" @submit.prevent="submitForm">
      <div class="edit-form-grid">
        <div class="edit-field customer-field edit-field--full">
          <label for="edit-list-customer">نام مشتری</label>
          <input id="edit-list-customer" v-model.trim="form.customerName" class="edit-control" type="text" maxlength="255"
            placeholder="نام یا شماره تماس مشتری را جست‌وجو کنید" autocomplete="off" role="combobox"
            aria-autocomplete="list" aria-controls="edit-list-customer-results" :aria-expanded="customerSearchOpen"
            :aria-activedescendant="activeCustomerOptionId" :disabled="saving" @focus="openCustomerSearch"
            @input="handleCustomerSearchInput" @blur="closeCustomerSearch"
            @keydown.down.prevent="moveCustomerSelection(1)" @keydown.up.prevent="moveCustomerSelection(-1)"
            @keydown.enter.prevent="selectHighlightedCustomer" @keydown.escape.prevent="closeCustomerSearchImmediately" />
          <div v-if="customerSearchOpen" id="edit-list-customer-results" class="customer-results" role="listbox">
            <button v-for="(customer, index) in filteredCustomers" :id="customerOptionId(customer)" :key="customer.id"
              type="button" role="option" :class="{ 'customer-result--active': customerActiveIndex === index }"
              :aria-selected="customerActiveIndex === index" @mouseenter="customerActiveIndex = index"
              @mousedown.prevent="selectCustomer(customer)">
              <span class="customer-result__identity">
                <strong>{{ customer.name }}</strong>
                <small v-if="customer.referrer">معرف: {{ customer.referrer }}</small>
              </span>
              <span class="customer-result__phone">{{ customer.phone || 'بدون شماره تماس' }}</span>
            </button>
            <div v-if="!filteredCustomers.length" class="customer-results__empty">مشتری‌ای پیدا نشد.</div>
          </div>
        </div>

        <label class="edit-field edit-field--full">
          <span>مجموع قیمت لیست</span>
          <span class="price-control-wrap">
            <input v-model="form.dailyTotal" class="edit-control price-control" type="text" inputmode="numeric"
              dir="ltr" autocomplete="off" :disabled="saving" @input="normalizeTotalPrice" />
            <span class="price-unit">تومان</span>
          </span>
        </label>

        <label class="edit-field">
          <span>تاریخ تحویل</span>
          <JalaliDatePicker v-model="form.deliveryDate" input-class="edit-control" />
        </label>
        <label class="edit-field">
          <span>ساعت تحویل</span>
          <TimePicker24 v-model="form.deliveryTime" input-class="edit-control" />
        </label>
        <label class="edit-field">
          <span>تاریخ تقریبی برگشت</span>
          <JalaliDatePicker v-model="form.expectedReturnDate" input-class="edit-control" />
        </label>
        <label class="edit-field">
          <span>ساعت تقریبی برگشت</span>
          <TimePicker24 v-model="form.expectedReturnTime" input-class="edit-control" />
        </label>
      </div>

      <p v-if="errorMessage" class="rounded-lg bg-rose-50 px-3 py-2 text-sm font-bold text-rose-700">
        {{ errorMessage }}
      </p>
    </form>

    <template #footer>
      <AppButton variant="secondary" :disabled="saving" @click="emit('close')">انصراف</AppButton>
      <AppButton type="submit" variant="primary" :loading="saving" form="delivery-list-quick-edit-form">
        ذخیره تغییرات
      </AppButton>
    </template>
  </AppModal>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import JalaliDatePicker from '../JalaliDatePicker.vue';
import TimePicker24 from '../TimePicker24.vue';
import AppButton from '../ui/AppButton.vue';
import AppModal from '../ui/AppModal.vue';
import { toGregorianDate, toPersianDate } from '../../utils/dateConverter';
import { normalizeNumericSearch } from '../../utils/numberSearch';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  list: { type: Object, default: null },
  customers: { type: Array, default: () => [] },
  saving: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'save']);
const errorMessage = ref('');
const customerSearchOpen = ref(false);
const customerActiveIndex = ref(-1);
const form = reactive({
  customerId: '',
  customerName: '',
  deliveryDate: '',
  deliveryTime: '',
  expectedReturnDate: '',
  expectedReturnTime: '',
  dailyTotal: '',
  items: []
});

const activeCustomers = computed(() => props.customers.filter((customer) => (
  customer.is_active !== false && customer.is_active !== 0 && customer.is_active !== '0'
)));
const filteredCustomers = computed(() => {
  const query = form.customerName.trim().toLowerCase();
  return activeCustomers.value.filter((customer) => (
    !query
    || String(customer.name || '').toLowerCase().includes(query)
    || String(customer.phone || '').includes(query)
    || String(customer.referrer || '').toLowerCase().includes(query)
  )).slice(0, 8);
});
const activeCustomerOptionId = computed(() => {
  if (!customerSearchOpen.value || customerActiveIndex.value < 0) return undefined;
  const customer = filteredCustomers.value[customerActiveIndex.value];
  return customer ? customerOptionId(customer) : undefined;
});

watch(() => [props.isOpen, props.list], ([open, list]) => {
  if (!open || !list) return;
  errorMessage.value = '';
  form.customerId = list.customer_id ? String(list.customer_id) : '';
  form.customerName = activeCustomers.value.find((customer) => String(customer.id) === form.customerId)?.name
    || list.customer_name || list.customer_name_snapshot || '';
  form.deliveryDate = datePart(list.delivered_at);
  form.deliveryTime = timePart(list.delivered_at);
  form.expectedReturnDate = datePart(list.expected_return_at);
  form.expectedReturnTime = timePart(list.expected_return_at);
  form.items = (list.items || []).filter((item) => Number(item.product_id) > 0).map((item) => ({ ...item }));
  form.dailyTotal = formatPriceValue(form.items.reduce((sum, item) => (
    sum + Math.max(1, Number(item.delivered_quantity) || 1) * Math.max(0, Number(item.daily_price_toman) || 0)
  ), 0));
  closeCustomerSearchImmediately();
}, { immediate: true });

function submitForm() {
  if (props.saving || !props.list) return;
  errorMessage.value = validateForm();
  if (errorMessage.value) return;
  const customer = activeCustomers.value.find((item) => String(item.id) === form.customerId);
  const pricedItems = allocateDailyTotal(form.items, Number(normalizeNumericSearch(form.dailyTotal)));
  emit('save', {
    version: Number(props.list.version),
    customer_id: Number(customer.id),
    customer_name_snapshot: customer.name,
    delivered_at: combineDateTime(form.deliveryDate, form.deliveryTime),
    expected_return_at: combineDateTime(form.expectedReturnDate, form.expectedReturnTime),
    night_before: Boolean(props.list.night_before),
    notes: props.list.notes || null,
    items: pricedItems.map((item) => ({
      id: Number(item.id) || null,
      product_id: Number(item.product_id),
      daily_price_toman: item.daily_price_toman,
      delivered_quantity: Math.max(1, Math.round(Number(item.delivered_quantity) || 1)),
      remaining_expected_return_at: item.remaining_expected_return_at || null,
      notes: item.notes || null
    }))
  });
}

function validateForm() {
  if (!activeCustomers.value.some((item) => String(item.id) === form.customerId)) return 'مالک لیست را انتخاب کنید.';
  if (!form.deliveryDate || !form.deliveryTime) return 'تاریخ و ساعت تحویل الزامی است.';
  if (!form.expectedReturnDate || !form.expectedReturnTime) return 'تاریخ و ساعت تقریبی برگشت الزامی است.';
  const deliveredAt = Date.parse(combineDateTime(form.deliveryDate, form.deliveryTime));
  const expectedAt = Date.parse(combineDateTime(form.expectedReturnDate, form.expectedReturnTime));
  if (!Number.isFinite(deliveredAt) || !Number.isFinite(expectedAt)) return 'تاریخ واردشده معتبر نیست.';
  if (expectedAt < deliveredAt) return 'زمان تقریبی برگشت نمی‌تواند قبل از زمان تحویل باشد.';
  if (!form.items.length) return 'این لیست قلم قابل‌ویرایشی ندارد.';
  const normalizedTotal = normalizeNumericSearch(form.dailyTotal);
  if (normalizedTotal === '') return 'مجموع قیمت لیست را وارد کنید.';
  const quantities = form.items.map((item) => Math.max(1, Number(item.delivered_quantity) || 1));
  if (!findPriceAdditions(Number(normalizedTotal), quantities)) {
    return 'مجموع قیمت واردشده با تعداد اقلام این لیست سازگار نیست.';
  }
  return '';
}

function normalizeTotalPrice() {
  form.dailyTotal = formatPriceValue(form.dailyTotal);
}

function formatPriceValue(value) {
  const normalized = normalizeNumericSearch(value);
  return normalized === '' ? '' : Number(normalized).toLocaleString('fa-IR');
}

function syncCustomerId() {
  const normalizedName = form.customerName.trim().toLowerCase();
  const exactMatches = activeCustomers.value.filter((customer) => (
    String(customer.name || '').trim().toLowerCase() === normalizedName
  ));
  form.customerId = exactMatches.length === 1 ? String(exactMatches[0].id) : '';
}

function openCustomerSearch() {
  customerSearchOpen.value = true;
  if (customerActiveIndex.value >= filteredCustomers.value.length) customerActiveIndex.value = -1;
}

function handleCustomerSearchInput() {
  syncCustomerId();
  customerActiveIndex.value = -1;
  openCustomerSearch();
}

function customerOptionId(customer) {
  return `edit-list-customer-option-${customer.id}`;
}

function moveCustomerSelection(direction) {
  const results = filteredCustomers.value;
  customerSearchOpen.value = true;
  if (!results.length) {
    customerActiveIndex.value = -1;
    return;
  }
  const current = customerActiveIndex.value;
  customerActiveIndex.value = current < 0 || current >= results.length
    ? (direction > 0 ? 0 : results.length - 1)
    : (current + direction + results.length) % results.length;
  nextTick(() => {
    document.getElementById(activeCustomerOptionId.value)?.scrollIntoView({ block: 'nearest' });
  });
}

function selectHighlightedCustomer() {
  if (!customerSearchOpen.value) return;
  const customer = filteredCustomers.value[customerActiveIndex.value] || filteredCustomers.value[0];
  if (customer) selectCustomer(customer);
}

function selectCustomer(customer) {
  form.customerId = String(customer.id);
  form.customerName = customer.name;
  closeCustomerSearchImmediately();
}

function closeCustomerSearchImmediately() {
  customerSearchOpen.value = false;
  customerActiveIndex.value = -1;
}

function closeCustomerSearch() {
  window.setTimeout(closeCustomerSearchImmediately, 120);
}

function allocateDailyTotal(items, targetTotal) {
  const pricedItems = items.map((item) => ({
    ...item,
    daily_price_toman: Math.max(0, Math.round(Number(item.daily_price_toman) || 0))
  }));
  const currentTotal = pricedItems.reduce((sum, item) => (
    sum + Math.max(1, Number(item.delivered_quantity) || 1) * item.daily_price_toman
  ), 0);
  const ratio = currentTotal > 0 ? targetTotal / currentTotal : 0;
  let allocatedTotal = 0;
  pricedItems.forEach((item) => {
    const quantity = Math.max(1, Number(item.delivered_quantity) || 1);
    item.daily_price_toman = currentTotal > 0 ? Math.floor(item.daily_price_toman * ratio) : 0;
    allocatedTotal += quantity * item.daily_price_toman;
  });

  let remainder = targetTotal - allocatedTotal;
  const quantities = pricedItems.map((item) => Math.max(1, Number(item.delivered_quantity) || 1));
  let additions = findPriceAdditions(remainder, quantities);
  let reductionIndex = 0;
  while (!additions) {
    const itemIndex = pricedItems.findIndex((item, index) => (
      index >= reductionIndex && item.daily_price_toman > 0
    ));
    const fallbackIndex = itemIndex >= 0
      ? itemIndex
      : pricedItems.findIndex((item) => item.daily_price_toman > 0);
    if (fallbackIndex < 0) break;
    pricedItems[fallbackIndex].daily_price_toman -= 1;
    remainder += quantities[fallbackIndex];
    reductionIndex = (fallbackIndex + 1) % pricedItems.length;
    additions = findPriceAdditions(remainder, quantities);
  }
  if (!additions) return pricedItems;
  additions.forEach((addition, index) => {
    pricedItems[index].daily_price_toman += addition;
  });
  return pricedItems;
}

function findPriceAdditions(amount, quantities) {
  if (amount === 0) return quantities.map(() => 0);
  if (amount < 0 || !quantities.length) return null;
  const minimum = Math.min(...quantities);
  const minimumIndex = quantities.indexOf(minimum);
  const distances = Array(minimum).fill(Number.POSITIVE_INFINITY);
  const previousResidue = Array(minimum).fill(-1);
  const previousIndex = Array(minimum).fill(-1);
  const visited = Array(minimum).fill(false);
  distances[0] = 0;

  for (let step = 0; step < minimum; step += 1) {
    let residue = -1;
    for (let candidate = 0; candidate < minimum; candidate += 1) {
      if (!visited[candidate] && (residue < 0 || distances[candidate] < distances[residue])) residue = candidate;
    }
    if (residue < 0 || !Number.isFinite(distances[residue])) break;
    visited[residue] = true;
    quantities.forEach((quantity, index) => {
      const nextResidue = (residue + quantity) % minimum;
      const nextDistance = distances[residue] + quantity;
      if (nextDistance < distances[nextResidue]) {
        distances[nextResidue] = nextDistance;
        previousResidue[nextResidue] = residue;
        previousIndex[nextResidue] = index;
      }
    });
  }

  const targetResidue = amount % minimum;
  if (distances[targetResidue] > amount) return null;
  const additions = quantities.map(() => 0);
  let cursor = targetResidue;
  while (cursor !== 0) {
    const index = previousIndex[cursor];
    if (index < 0) return null;
    additions[index] += 1;
    cursor = previousResidue[cursor];
  }
  additions[minimumIndex] += (amount - distances[targetResidue]) / minimum;
  return additions;
}

function datePart(value) {
  return value ? toPersianDate(String(value).slice(0, 10)) : '';
}

function timePart(value) {
  const match = String(value || '').match(/T?(\d{2}:\d{2})/);
  return match?.[1] || '';
}

function combineDateTime(persianDate, time) {
  if (!persianDate || !time) return null;
  return `${toGregorianDate(persianDate)}T${time}:00+03:30`;
}

function formatNumber(value) {
  return Number(value || 0).toLocaleString('fa-IR');
}
</script>

<style scoped>
.edit-field {
  display: grid;
  gap: .45rem;
  color: #334155;
  font-size: .8rem;
  font-weight: 800;
}

.edit-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 1rem;
}

.edit-field--full {
  grid-column: 1 / -1;
}

.customer-field {
  position: relative;
  z-index: 10;
}

.edit-control,
:deep(.edit-control) {
  width: 100%;
  height: 2.75rem;
  border: 1px solid #cbd5e1;
  border-radius: .7rem;
  background: #fff;
  padding: 0 .75rem;
  color: #0f172a;
  outline: none;
}

.edit-control:focus,
:deep(.edit-control:focus) {
  border-color: #0f766e;
  box-shadow: 0 0 0 3px rgb(13 148 136 / 12%);
}

.price-control-wrap {
  position: relative;
  display: block;
}

.price-control {
  padding-right: .9rem;
  padding-left: 4.5rem;
  text-align: right;
  font-size: .95rem;
  font-weight: 800;
}

.price-unit {
  position: absolute;
  top: 50%;
  left: .9rem;
  transform: translateY(-50%);
  color: #64748b;
  font-size: .72rem;
  font-weight: 800;
  pointer-events: none;
}

.customer-results {
  position: absolute;
  z-index: 30;
  top: calc(100% + .35rem);
  right: 0;
  left: 0;
  max-height: 15rem;
  overflow-y: auto;
  border: 1px solid #cbd5e1;
  border-radius: .7rem;
  background: #fff;
  box-shadow: 0 16px 36px rgb(15 23 42 / 18%);
}

.customer-results button {
  display: flex;
  width: 100%;
  align-items: center;
  justify-content: space-between;
  gap: .75rem;
  padding: .7rem .8rem;
  border-bottom: 1px solid #f1f5f9;
  text-align: right;
}

.customer-results button:last-child {
  border-bottom: 0;
}

.customer-results button:hover,
.customer-result--active {
  background: #ecfdf5;
}

.customer-result--active {
  box-shadow: inset -3px 0 0 #0f766e;
}

.customer-result__identity {
  display: grid;
  min-width: 0;
  gap: .1rem;
}

.customer-result__identity strong {
  overflow: hidden;
  color: #1e293b;
  font-size: .78rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.customer-result__identity small,
.customer-result__phone {
  color: #64748b;
  font-size: .68rem;
}

.customer-result__phone {
  flex: 0 0 auto;
  direction: ltr;
  white-space: nowrap;
}

.customer-results__empty {
  padding: 1rem;
  color: #94a3b8;
  font-size: .75rem;
  text-align: center;
}

@media (max-width: 520px) {
  .edit-form-grid {
    grid-template-columns: 1fr;
  }

  .edit-field--full {
    grid-column: auto;
  }
}
</style>
