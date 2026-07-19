<template>
  <Teleport to="body">
    <div v-if="isOpen" class="fixed inset-0 z-[140] flex items-center justify-center bg-slate-950/45 p-3"
      @click.self="emit('cancel')">
      <div
        class="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-md">
        <div class="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 class="mt-2 text-xl font-black text-slate-900">ویرایش رزرو</h2>
          </div>
          <button type="button"
            class="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            @click="emit('cancel')">
            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div class="flex overflow-y-auto px-5 py-5">
          <section>
            <div class="space-y-5">
              <section class="rounded-lg border border-slate-200 p-4">
                <div class="grid gap-4 grid-cols-5 items-center">
                  <label class="space-y-2 col-span-2">
                    <span class="text-sm font-semibold text-slate-700">مشتری</span>
                    <SearchableLookupInput v-model="customerName" :options="customerOptions" header-text="مشتری‌ها"
                      no-results-text="مشتری‌ای پیدا نشد. می‌توانی نام جدید را دستی وارد کنی."
                      placeholder="نام مشتری را بنویس یا از لیست انتخاب کن" @select="handleCustomerSelect"
                      @clear="customerId = null" />
                  </label>

                  <label class="space-y-2">
                    <span class="text-sm font-semibold text-slate-700">تاریخ رفت</span>
                    <JalaliDatePicker :model-value="startDatePersian"
                      input-class="h-12 rounded-lg border border-slate-200 px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      @update:model-value="startDatePersian = $event" />
                  </label>

                  <label class="space-y-2">
                    <span class="text-sm font-semibold text-slate-700">تاریخ برگشت</span>
                    <JalaliDatePicker :model-value="endDatePersian"
                      input-class="h-12 rounded-lg border border-slate-200 px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      @update:model-value="endDatePersian = $event" />
                  </label>
                  <label class="space-y-2 flex flex-col ">
                    <span class="text-sm font-semibold text-slate-700">عملیات</span>
                    <button type="button" :disabled="loading"
                      class="space-y-2 h-12 app-button-success   disabled:cursor-not-allowed disabled:opacity-60"
                      @click="submit">
                      {{ loading ? 'در حال ذخیره...' : 'ذخیره ' }}
                    </button>
                  </label>
                </div>
              </section>

              <section class="rounded-lg border border-slate-200 bg-white p-4">

                <div>
                  <SearchableLookupInput v-model="productSearch" :options="productSearchOptions"
                    header-text="محصولات آزاد" no-results-text="محصول آزادی برای این بازه پیدا نشد."
                    placeholder="محصول آزاد را جستجو و انتخاب کن" @select="handleProductSelect"
                    @clear="productSearch = ''" />

                </div>

                <div v-if="items.length === 0"
                  class="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                  حداقل یک محصول باید در رزرو باقی بماند.
                </div>

                <div v-else class="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white">
                  <div
                    class="grid grid-cols-5 gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500">
                    <span class="col-span-3">محصولات</span>
                    <span class="text-center col-span-1"> تعداد</span>
                    <span class="text-center col-span-1">حذف</span>
                  </div>

                  <div class="max-h-[340px] divide-y divide-slate-100 overflow-y-auto">
                    <div v-for="item in items" :key="item.product_id" class="grid grid-cols-5 items-center gap-3 px-3 ">
                      <div class="flex col-span-3 items-center justify-between min-w-0">
                        <p class="col-span-1 truncate text-md font-bold text-slate-900">{{ item.product_name }}</p>
                        <p class="col-span-1 mt-1 text-sm bg-slate-100 px-2 py-1 rounded-lg"
                          :class="Number(item.quantity) > getProductCapacity(item.product_id) ? 'text-rose-600' : 'text-slate-500'">
                          ظرفیت آزاد: {{ getProductCapacity(item.product_id).toLocaleString('fa-IR') }}
                        </p>
                      </div>

                      <div class="flex items-center justify-center gap-1 rounded-lg  px-2 py-2">
                        <button type="button"
                          class="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl font-bold text-slate-700 transition hover:bg-slate-50"
                          @click="decrementItem(item.product_id)">
                          -
                        </button>
                        <input :value="item.quantity" type="text" min="1"
                          class="h-8 w-10 rounded-lg border border-slate-200 bg-white px-2 text-center text-sm outline-none transition focus:border-blue-400"
                          @input="setItemQuantity(item.product_id, $event.target.value)" />
                        <button type="button"
                          class="inline-flex h-6 w-6 items-center justify-center rounded-lg border border-slate-200 bg-white text-xl font-bold text-slate-700 transition hover:bg-slate-50"
                          :disabled="Number(item.quantity) >= getProductCapacity(item.product_id)"
                          @click="incrementItem(item.product_id)">
                          +
                        </button>
                      </div>

                      <div class="flex justify-center">
                        <button type="button"
                          class="inline-flex h-8 items-center justify-center rounded-lg border border-rose-100 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                          @click="removeItem(item.product_id)">
                          <svg fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="size-4">
                            <path stroke-linecap="round" stroke-linejoin="round"
                              d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            </div>
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
