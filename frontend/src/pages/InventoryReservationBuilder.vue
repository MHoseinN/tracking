<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,#ecfeff,transparent_34%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)]">
    <header class="sticky top-2 z-20 mx-auto max-w-6xl px-4 pt-4">
      <section class="rounded-[2rem] border border-slate-200 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div class="flex flex-wrap items-start justify-between gap-4 px-5 py-5 lg:px-6">
          <div>
            <p class="text-xs font-semibold tracking-[0.34em] text-slate-400">RESERVATION CART</p>
            <h1 class="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">سبد رزرو</h1>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              محصولات موردنیاز را کم یا زیاد کن، بعد مشتری و بازه تاریخ را مشخص کن و ثبت نهایی بزن.
            </p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              class="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              @click="router.push('/inventory')"
            >
              بازگشت به انبار
            </button>
          </div>
        </div>
      </section>
    </header>

    <main class="mx-auto max-w-6xl px-4 py-6">
      <section class="space-y-6">
        <section class="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
          <div class="grid gap-5 md:grid-cols-3">
            <label class="space-y-2 md:col-span-3">
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
                input-class="h-12 rounded-2xl border border-slate-200 px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                @update:model-value="startDatePersian = $event"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">تاریخ برگشت</span>
              <JalaliDatePicker
                :model-value="endDatePersian"
                input-class="h-12 rounded-2xl border border-slate-200 px-4 text-sm focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                @update:model-value="endDatePersian = $event"
              />
            </label>

            <label class="space-y-2">
              <span class="text-sm font-semibold text-slate-700">مدت رزرو</span>
              <div class="flex h-12 items-center rounded-2xl bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                {{ durationLabel }}
              </div>
            </label>
          </div>

          <label class="mt-5 block space-y-2">
            <span class="text-sm font-semibold text-slate-700">یادداشت کلی رزرو</span>
            <textarea
              v-model.trim="notes"
              rows="4"
              class="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              placeholder="اگر توضیحی برای این رزرو داری اینجا بنویس"
            ></textarea>
          </label>
        </section>

        <section class="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-xl font-black text-slate-900">اقلام سبد</h2>
              <p class="mt-2 text-sm text-slate-500">تعداد هر محصول را کم یا زیاد کن. بعد از ثبت نهایی، سبد خالی می‌شود.</p>
            </div>
            <div class="w-full max-w-md">
              <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-3">
                <div class="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                  <svg class="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                  </svg>
                  <input
                    v-model.trim="productSearch"
                    type="text"
                    class="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                    placeholder="جستجوی لحظه‌ای محصول برای افزودن به سبد"
                  />
                </div>

                <div v-if="productSearch.trim()" class="mt-3 max-h-72 space-y-2 overflow-y-auto">
                  <button
                    v-for="product in searchableProducts"
                    :key="product.id"
                    type="button"
                    class="flex w-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-3 text-right transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="getProductRemaining(product.id) <= 0"
                    @click="addProductToCart(product)"
                  >
                    <div class="min-w-0">
                      <p class="truncate text-sm font-semibold text-slate-900">{{ product.name }}</p>
                      <p class="mt-1 truncate text-xs text-slate-500">{{ product.category_name || 'بدون دسته‌بندی' }}</p>
                    </div>
                    <span
                      class="shrink-0 rounded-full px-3 py-1 text-xs font-semibold"
                      :class="getProductRemaining(product.id) > 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'"
                    >
                      {{ getProductRemaining(product.id).toLocaleString('fa-IR') }} آزاد
                    </span>
                  </button>

                  <p v-if="searchableProducts.length === 0" class="rounded-2xl bg-white px-3 py-3 text-sm text-slate-500">
                    محصول آزادی برای این جستجو پیدا نشد.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div v-if="cartItems.length === 0" class="mt-5 rounded-[1.5rem] border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
            سبد رزرو خالی است. از صفحه انبار محصولات را به سبد اضافه کن.
          </div>

          <div v-else class="mt-5 space-y-3">
            <article
              v-for="item in cartItems"
              :key="item.product_id"
              class="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-4"
            >
              <div class="grid gap-4 md:grid-cols-[minmax(0,1fr)_160px_auto] md:items-center">
                <div class="min-w-0">
                  <p class="truncate font-semibold text-slate-900">{{ item.product_name }}</p>
                  <p class="mt-1 truncate text-xs text-slate-500">{{ item.category_name || 'بدون دسته‌بندی' }}</p>
                  <p class="mt-2 text-xs" :class="isLineOverLimit(item) ? 'text-rose-600' : 'text-slate-500'">
                    موجودی آزاد در این بازه:
                    <span class="font-semibold">{{ getAvailableQuantity(item.product_id).toLocaleString('fa-IR') }}</span>
                  </p>
                </div>

                <div class="flex items-center justify-center gap-2 rounded-2xl bg-white px-3 py-2">
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    @click="decrementCartItem(item)"
                  >
                    -
                  </button>
                  <input
                    :value="item.quantity"
                    type="number"
                    min="1"
                    class="h-9 w-16 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm outline-none transition focus:border-blue-400"
                    @input="updateQuantity(item, $event.target.value)"
                  />
                  <button
                    type="button"
                    class="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                    :disabled="item.quantity >= getAvailableQuantity(item.product_id)"
                    @click="incrementCartItem(item)"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  class="inline-flex h-11 items-center justify-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
                  @click="reservationCart.removeProduct(item.product_id)"
                >
                  حذف از سبد
                </button>
              </div>
            </article>
          </div>
        </section>
        <section class="rounded-[2rem] border border-slate-200 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
          <p v-if="errorMessage" class="rounded-2xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {{ errorMessage }}
          </p>

          <div class="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              :disabled="saving || cartItems.length === 0"
              class="inline-flex h-12 flex-1 items-center justify-center rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              @click="submitReservation"
            >
              {{ saving ? 'در حال ثبت...' : 'ثبت نهایی رزرو' }}
            </button>
            <button
              type="button"
              :disabled="cartItems.length === 0"
              class="inline-flex h-12 items-center justify-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              @click="reservationCart.clear()"
            >
              خالی کردن سبد
            </button>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import JalaliDatePicker from '../components/JalaliDatePicker.vue';
import SearchableLookupInput from '../components/SearchableLookupInput.vue';
import { useReservationCartStore } from '../stores/reservationCartStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { getCurrentPersianDate, toGregorianDate } from '../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const inventoryStore = useInventoryStore();
const reservationCart = useReservationCartStore();

const today = getCurrentPersianDate();
const defaultDate = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;

const customerId = ref(null);
const customerName = ref('');
const startDatePersian = ref(defaultDate);
const endDatePersian = ref(defaultDate);
const notes = ref('');
const saving = ref(false);
const errorMessage = ref('');
const productSearch = ref('');

const cartItems = computed(() => reservationCart.items);
const customerOptions = computed(() => inventoryStore.lookups.customers.map((customer) => ({
  label: customer.name,
  value: customer.id
})));
const searchableProducts = computed(() => {
  const query = productSearch.value.trim().toLowerCase();
  if (!query) return [];

  return inventoryStore.lookups.products
    .filter((product) => {
      const matches = String(product.name || '').toLowerCase().includes(query)
        || String(product.category_name || '').toLowerCase().includes(query);
      return matches && getProductRemaining(product.id) > 0;
    })
    .slice(0, 10);
});
const durationLabel = computed(() => {
  const startDate = toGregorianDate(startDatePersian.value);
  const endDate = toGregorianDate(endDatePersian.value);
  if (!startDate || !endDate) return 'تاریخ را کامل کن';
  const diff = Math.round((new Date(`${endDate}T00:00:00`).getTime() - new Date(`${startDate}T00:00:00`).getTime()) / 86400000) + 1;
  return diff > 0 ? `${diff.toLocaleString('fa-IR')} روز` : 'بازه نامعتبر';
});

onMounted(async () => {
  reservationCart.initialize();
  await refreshLookups();
});

watch([startDatePersian, endDatePersian], async () => {
  const startDate = toGregorianDate(startDatePersian.value);
  const endDate = toGregorianDate(endDatePersian.value);
  if (!startDate || !endDate) return;
  await refreshLookups();
});

watch(customerName, () => {
  syncCustomerId();
});

function syncCustomerId() {
  const matched = inventoryStore.lookups.customers.find((customer) => customer.name === customerName.value.trim());
  customerId.value = matched?.id || null;
}

function handleCustomerSelect(option) {
  customerId.value = option?.value || null;
}

async function refreshLookups() {
  try {
    const startDate = toGregorianDate(startDatePersian.value);
    const endDate = toGregorianDate(endDatePersian.value);
    await inventoryStore.fetchLookups({
      startDate: startDate <= endDate ? startDate : endDate,
      endDate: startDate <= endDate ? endDate : startDate
    });
    reservationCart.syncProductMeta(inventoryStore.lookups.products);
  } catch (_error) {
    toast.error(inventoryStore.error || 'خطا در دریافت موجودی محصولات');
  }
}

function getAvailableQuantity(productId) {
  return inventoryStore.lookups.products.find((item) => Number(item.id) === Number(productId))?.available_quantity || 0;
}

function getProductRemaining(productId) {
  return Math.max(0, getAvailableQuantity(productId) - reservationCart.getProductQuantity(productId));
}

function isLineOverLimit(item) {
  return Number(item.quantity) > getAvailableQuantity(item.product_id);
}

function updateQuantity(item, value) {
  reservationCart.setQuantity(item.product_id, value);
}

function incrementCartItem(item) {
  if (getProductRemaining(item.product_id) <= 0) return;
  reservationCart.increment(item.product_id);
}

function decrementCartItem(item) {
  reservationCart.decrement(item.product_id);
}

function addProductToCart(product) {
  const result = reservationCart.addProduct(product, 1, getAvailableQuantity(product.id));
  if (!result.success) {
    toast.error(result.message);
    return;
  }
  productSearch.value = '';
  toast.success('محصول به سبد رزرو اضافه شد');
}

async function submitReservation() {
  errorMessage.value = '';

  const startDate = toGregorianDate(startDatePersian.value);
  const endDate = toGregorianDate(endDatePersian.value);
  const items = cartItems.value.map((item) => ({
    product_id: Number(item.product_id),
    quantity: Number(item.quantity)
  }));

  if (!customerName.value.trim()) {
    errorMessage.value = 'نام مشتری را وارد کن';
    return;
  }

  if (!startDate || !endDate || startDate > endDate) {
    errorMessage.value = 'بازه تاریخ معتبر انتخاب کن';
    return;
  }

  if (items.length === 0) {
    errorMessage.value = 'سبد رزرو خالی است';
    return;
  }

  const invalidItem = cartItems.value.find((item) => isLineOverLimit(item));
  if (invalidItem) {
    errorMessage.value = 'تعداد یکی از محصولات از موجودی آزاد این بازه بیشتر است';
    return;
  }

  saving.value = true;
  const result = await inventoryStore.createReservation({
    customer_id: customerId.value ? Number(customerId.value) : null,
    customer_name: customerName.value.trim(),
    start_date: startDate,
    end_date: endDate,
    notes: notes.value.trim() || null,
    items
  });
  saving.value = false;

  if (!result.success) {
    errorMessage.value = result.message;
    return;
  }

  reservationCart.clear();
  toast.success('رزرو با موفقیت ثبت شد');
  router.push('/inventory');
}
</script>
