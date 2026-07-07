<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-3 sm:p-5"
      @click.self="emit('cancel')"
    >
      <div class="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.26)]">
        <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <p class="text-xs font-semibold tracking-[0.28em] text-slate-400">RESERVATION EDITOR</p>
            <h2 class="mt-2 text-xl font-black text-slate-900">ویرایش رزرو</h2>
          </div>
          <button
            type="button"
            class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            @click="emit('cancel')"
          >
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-5 py-5">
          <section class="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.85fr)]">
            <div class="space-y-5">
              <section class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <div class="grid gap-4 md:grid-cols-2">
                  <label class="space-y-2 md:col-span-2">
                    <span class="text-sm font-semibold text-slate-700">مشتری</span>
                    <SearchableLookupInput
                      v-model="customerName"
                      :options="customerOptions"
                      header-text="مشتری‌ها"
                      no-results-text="مشتری‌ای پیدا نشد. می‌توانی نام جدید را دستی وارد کنی."
                      placeholder="نام مشتری را بنویس یا از لیست انتخاب کن"
                      @select="handleCustomerSelect"
                      @clear="customerId = null"
                    />
                  </label>

                  <label class="space-y-2">
                    <span class="text-sm font-semibold text-slate-700">تاریخ رفت</span>
                    <JalaliDatePicker
                      :model-value="startDatePersian"
                      input-class="h-12 rounded-xl border border-slate-200 px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      @update:model-value="startDatePersian = $event"
                    />
                  </label>

                  <label class="space-y-2">
                    <span class="text-sm font-semibold text-slate-700">تاریخ برگشت</span>
                    <JalaliDatePicker
                      :model-value="endDatePersian"
                      input-class="h-12 rounded-xl border border-slate-200 px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      @update:model-value="endDatePersian = $event"
                    />
                  </label>
                </div>
              </section>

              <section class="rounded-xl border border-slate-200 bg-white p-4">
                <div class="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 class="text-base font-black text-slate-900">اقلام رزرو</h3>
                    <p class="mt-1 text-xs text-slate-500">با انتخاب محصول از لیست، آیتم جدید به همین رزرو اضافه می‌شود.</p>
                  </div>
                  <div class="w-full max-w-md">
                    <SearchableLookupInput
                      v-model="productSearch"
                      :options="productSearchOptions"
                      header-text="محصولات آزاد"
                      no-results-text="محصول آزادی برای این بازه پیدا نشد."
                      placeholder="محصول آزاد را جستجو و انتخاب کن"
                      @select="handleProductSelect"
                      @clear="productSearch = ''"
                    />
                  </div>
                </div>

                <div v-if="items.length === 0" class="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  حداقل یک محصول باید در رزرو باقی بماند.
                </div>

                <div v-else class="mt-4 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <div class="grid grid-cols-[minmax(0,1.2fr)_86px_120px_90px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500">
                    <span>محصول</span>
                    <span class="text-center">تعداد</span>
                    <span class="text-center">تغییر تعداد</span>
                    <span class="text-center">حذف</span>
                  </div>

                  <div class="max-h-[340px] divide-y divide-slate-100 overflow-y-auto">
                    <div
                      v-for="item in items"
                      :key="item.product_id"
                      class="grid grid-cols-[minmax(0,1.2fr)_86px_120px_90px] items-center gap-3 px-3 py-3"
                    >
                      <div class="min-w-0">
                        <p class="truncate text-sm font-bold text-slate-900">{{ item.product_name }}</p>
                        <p class="mt-1 truncate text-[11px] text-slate-500">{{ item.category_name || 'بدون دسته‌بندی' }}</p>
                        <p class="mt-1 text-[11px]" :class="Number(item.quantity) > getProductCapacity(item.product_id) ? 'text-rose-600' : 'text-slate-500'">
                          ظرفیت: {{ getProductCapacity(item.product_id).toLocaleString('fa-IR') }}
                        </p>
                      </div>

                      <div class="text-center text-sm font-bold text-slate-700">
                        {{ Number(item.quantity).toLocaleString('fa-IR') }}
                      </div>

                      <div class="flex items-center justify-center gap-1 rounded-xl bg-slate-50 px-2 py-2">
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          @click="decrementItem(item.product_id)"
                        >
                          -
                        </button>
                        <input
                          :value="item.quantity"
                          type="number"
                          min="1"
                          class="h-8 w-14 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm outline-none transition focus:border-blue-400"
                          @input="setItemQuantity(item.product_id, $event.target.value)"
                        />
                        <button
                          type="button"
                          class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                          :disabled="Number(item.quantity) >= getProductCapacity(item.product_id)"
                          @click="incrementItem(item.product_id)"
                        >
                          +
                        </button>
                      </div>

                      <div class="flex justify-center">
                        <button
                          type="button"
                          class="inline-flex h-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          @click="removeItem(item.product_id)"
                        >
                          حذف
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>

            <aside class="space-y-4">
              <section class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <h3 class="text-sm font-black text-slate-900">خلاصه سریع</h3>
                <div class="mt-3 grid gap-3">
                  <div class="rounded-xl bg-white px-4 py-3">
                    <p class="text-xs font-semibold text-slate-500">نام مشتری</p>
                    <p class="mt-1 text-sm font-bold text-slate-900">{{ customerName || 'وارد نشده' }}</p>
                  </div>
                  <div class="rounded-xl bg-white px-4 py-3">
                    <p class="text-xs font-semibold text-slate-500">بازه رزرو</p>
                    <p class="mt-1 text-sm font-bold text-slate-900">{{ startDatePersian || '-' }} تا {{ endDatePersian || '-' }}</p>
                  </div>
                  <div class="rounded-xl bg-white px-4 py-3">
                    <p class="text-xs font-semibold text-slate-500">تعداد کل اقلام</p>
                    <p class="mt-1 text-sm font-bold text-slate-900">{{ totalQuantity.toLocaleString('fa-IR') }} واحد</p>
                  </div>
                </div>
              </section>

              <p v-if="errorMessage" class="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                {{ errorMessage }}
              </p>

              <div class="flex flex-col gap-3">
                <button
                  type="button"
                  :disabled="loading"
                  class="inline-flex h-12 items-center justify-center rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  @click="submit"
                >
                  {{ loading ? 'در حال ذخیره...' : 'ذخیره تغییرات رزرو' }}
                </button>
                <button
                  type="button"
                  :disabled="loading"
                  class="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                  @click="emit('cancel')"
                >
                  بستن
                </button>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import JalaliDatePicker from './JalaliDatePicker.vue';
import SearchableLookupInput from './SearchableLookupInput.vue';
import { toGregorianDate, toPersianDate } from '../utils/dateConverter';

const props = defineProps({
  isOpen: { type: Boolean, default: false },
  reservation: { type: Object, default: null },
  customerOptions: { type: Array, default: () => [] },
  productOptions: { type: Array, default: () => [] },
  loading: { type: Boolean, default: false }
});

const emit = defineEmits(['cancel', 'save']);

const customerId = ref(null);
const customerName = ref('');
const startDatePersian = ref('');
const endDatePersian = ref('');
const items = ref([]);
const productSearch = ref('');
const errorMessage = ref('');

const currentProductCountMap = computed(() => {
  const map = new Map();
  (props.reservation?.items || []).forEach((item) => {
    const current = map.get(Number(item.product_id)) || 0;
    map.set(Number(item.product_id), current + 1);
  });
  return map;
});

const productOptionMap = computed(() => {
  const map = new Map();
  props.productOptions.forEach((product) => {
    map.set(Number(product.id), product);
  });
  return map;
});

const productSearchOptions = computed(() =>
  props.productOptions
    .filter((product) => getProductCapacity(product.id) > getItemQuantity(product.id))
    .map((product) => ({
      label: `${product.name}${product.category_name ? ` - ${product.category_name}` : ''}`,
      value: product.id,
      product
    }))
);

const totalQuantity = computed(() =>
  items.value.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0)
);

watch(
  () => [props.isOpen, props.reservation],
  () => {
    if (!props.isOpen || !props.reservation) return;
    resetForm();
  },
  { immediate: true }
);

watch(customerName, () => {
  const matched = props.customerOptions.find((customer) => customer.label === customerName.value.trim());
  customerId.value = matched?.value || null;
});

function resetForm() {
  customerId.value = props.reservation?.customer_id || null;
  customerName.value = props.reservation?.customer_name || '';
  startDatePersian.value = toPersianDate(props.reservation?.start_date || '');
  endDatePersian.value = toPersianDate(props.reservation?.end_date || '');
  productSearch.value = '';
  errorMessage.value = '';

  const grouped = new Map();
  (props.reservation?.items || []).forEach((item) => {
    const key = Number(item.product_id);
    const existing = grouped.get(key);
    if (existing) {
      existing.quantity += 1;
      return;
    }

    grouped.set(key, {
      product_id: key,
      product_name: item.product_name,
      category_name: item.category_name || '',
      quantity: 1
    });
  });

  items.value = Array.from(grouped.values());
}

function handleCustomerSelect(option) {
  customerId.value = option?.value || null;
}

function handleProductSelect(option) {
  const product = option?.product;
  if (!product) return;

  const productId = Number(product.id);
  const currentQuantity = getItemQuantity(productId);
  const maxQuantity = getProductCapacity(productId);

  if (currentQuantity >= maxQuantity) {
    errorMessage.value = 'برای این محصول ظرفیت آزاد دیگری وجود ندارد';
    productSearch.value = '';
    return;
  }

  const existing = items.value.find((item) => Number(item.product_id) === productId);
  if (existing) {
    existing.quantity += 1;
  } else {
    items.value.push({
      product_id: productId,
      product_name: product.name,
      category_name: product.category_name || '',
      quantity: 1
    });
  }

  productSearch.value = '';
  errorMessage.value = '';
}

function getItemQuantity(productId) {
  return items.value.find((item) => Number(item.product_id) === Number(productId))?.quantity || 0;
}

function getProductCapacity(productId) {
  const lookupQuantity = Number(productOptionMap.value.get(Number(productId))?.available_quantity || 0);
  const currentQuantity = Number(currentProductCountMap.value.get(Number(productId)) || 0);
  return lookupQuantity + currentQuantity;
}

function setItemQuantity(productId, quantity) {
  const target = items.value.find((item) => Number(item.product_id) === Number(productId));
  if (!target) return;

  const maxQuantity = Math.max(1, getProductCapacity(productId));
  target.quantity = Math.min(maxQuantity, Math.max(1, Number(quantity) || 1));
}

function incrementItem(productId) {
  setItemQuantity(productId, getItemQuantity(productId) + 1);
}

function decrementItem(productId) {
  const currentQuantity = getItemQuantity(productId);
  if (currentQuantity <= 1) {
    removeItem(productId);
    return;
  }
  setItemQuantity(productId, currentQuantity - 1);
}

function removeItem(productId) {
  items.value = items.value.filter((item) => Number(item.product_id) !== Number(productId));
}

function submit() {
  errorMessage.value = '';

  if (!customerName.value.trim()) {
    errorMessage.value = 'نام مشتری را وارد کن';
    return;
  }

  const startDate = toGregorianDate(startDatePersian.value);
  const endDate = toGregorianDate(endDatePersian.value);
  if (!startDate || !endDate || startDate > endDate) {
    errorMessage.value = 'بازه تاریخ معتبر انتخاب کن';
    return;
  }

  if (items.value.length === 0) {
    errorMessage.value = 'حداقل یک آیتم باید در رزرو باقی بماند';
    return;
  }

  const invalidItem = items.value.find((item) => Number(item.quantity) > getProductCapacity(item.product_id));
  if (invalidItem) {
    errorMessage.value = `موجودی آزاد برای «${invalidItem.product_name}» کافی نیست`;
    return;
  }

  emit('save', {
    reservation_order_id: props.reservation?.reservation_order_id,
    customer_id: customerId.value ? Number(customerId.value) : null,
    customer_name: customerName.value.trim(),
    start_date: startDate,
    end_date: endDate,
    items: items.value.map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity)
    }))
  });
}
</script>
