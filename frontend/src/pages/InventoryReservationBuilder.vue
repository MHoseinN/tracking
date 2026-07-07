<template>
  <AppShell title="سبد رزرو" subtitle="محصولات را انتخاب کن، مشتری و بازه تاریخ را تعیین کن و رزرو را نهایی ثبت کن">
    <template #actions>
      <button type="button" :disabled="saving || cartItems.length === 0" class="app-button-success w-full" @click="submitReservation">
        {{ saving ? 'در حال ثبت...' : 'ثبت نهایی رزرو' }}
      </button>
      <button type="button" :disabled="cartItems.length === 0" class="app-button-secondary w-full" @click="showClearCartConfirm = true">
        خالی کردن سبد
      </button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/inventory')">بازگشت به انبار</button>
    </template>

    <div class="max-w-6xl">
      <section class="rounded-xl border border-slate-200 bg-white/90 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.06)]">
        <div class="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <h2 class="text-xl font-black text-slate-900">مشتری و اقلام سبد</h2>
            <p class="mt-2 text-sm text-slate-500">هم مشتری را انتخاب کن، هم محصولات را با جست‌وجوی دراپ‌داونی اضافه کن و در همان بالا رزرو را ثبت نهایی بزن.</p>
          </div>

          <div class="flex flex-wrap gap-3">
            <button
              type="button"
              :disabled="saving || cartItems.length === 0"
              class="inline-flex h-12 items-center justify-center rounded-xl bg-emerald-600 px-5 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              @click="submitReservation"
            >
              {{ saving ? 'در حال ثبت...' : 'ثبت نهایی رزرو' }}
            </button>
            <button
              type="button"
              :disabled="cartItems.length === 0"
              class="inline-flex h-12 items-center justify-center rounded-xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
              @click="showClearCartConfirm = true"
            >
              خالی کردن سبد
            </button>
          </div>
        </div>

        <div class="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(330px,0.8fr)]">
          <div class="space-y-5">
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

              <label class="space-y-2">
                <span class="text-sm font-semibold text-slate-700">مدت رزرو</span>
                <div class="flex h-12 items-center rounded-xl bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                  {{ durationLabel }}
                </div>
              </label>
            </div>

            <div class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <div class="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 class="text-base font-black text-slate-900">افزودن محصول به سبد</h3>
                  <p class="mt-1 text-xs text-slate-500">فقط محصولات آزاد این بازه نمایش داده می‌شوند.</p>
                </div>
                <div class="w-full max-w-md">
                  <SearchableLookupInput
                    v-model="productSearch"
                    :options="productSearchOptions"
                    header-text="محصولات آزاد"
                    no-results-text="محصول آزادی برای این جستجو پیدا نشد."
                    placeholder="محصول را جست‌وجو و از لیست انتخاب کن"
                    @select="handleProductSelect"
                    @clear="productSearch = ''"
                  />
                </div>
              </div>
            </div>

            <p v-if="errorMessage" class="rounded-xl bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              {{ errorMessage }}
            </p>

            <div v-if="cartItems.length === 0" class="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              سبد رزرو خالی است. از انبار یا همین جست‌وجو محصولات را اضافه کن.
            </div>

            <div v-else class="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div class="grid grid-cols-[minmax(0,1.3fr)_110px_130px_92px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500">
                <span>محصول</span>
                <span class="text-center">آزاد</span>
                <span class="text-center">تعداد</span>
                <span class="text-center">عملیات</span>
              </div>

              <div class="divide-y divide-slate-100">
                <div
                  v-for="item in cartItems"
                  :key="item.product_id"
                  class="grid grid-cols-[minmax(0,1.3fr)_110px_130px_92px] items-center gap-3 px-3 py-3"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-bold text-slate-900">{{ item.product_name }}</p>
                    <p class="mt-1 truncate text-[11px] text-slate-500">{{ item.category_name || 'بدون دسته‌بندی' }}</p>
                  </div>

                  <div class="text-center text-xs font-semibold" :class="isLineOverLimit(item) ? 'text-rose-600' : 'text-slate-600'">
                    {{ getAvailableQuantity(item.product_id).toLocaleString('fa-IR') }}
                  </div>

                  <div class="flex items-center justify-center gap-1 rounded-xl bg-slate-50 px-2 py-2">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                      @click="decrementCartItem(item)"
                    >
                      -
                    </button>
                    <input
                      :value="item.quantity"
                      type="number"
                      min="1"
                      class="h-8 w-14 rounded-xl border border-slate-200 bg-white px-2 text-center text-sm outline-none transition focus:border-blue-400"
                      @input="updateQuantity(item, $event.target.value)"
                    />
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                      :disabled="item.quantity >= getAvailableQuantity(item.product_id)"
                      @click="incrementCartItem(item)"
                    >
                      +
                    </button>
                  </div>

                  <div class="flex justify-center">
                    <button
                      type="button"
                      class="inline-flex h-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100"
                      @click="reservationCart.removeProduct(item.product_id)"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <aside class="space-y-4">
            <article class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p class="text-sm font-semibold text-slate-500">تعداد آیتم‌های سبد</p>
              <p class="mt-3 text-3xl font-black text-slate-900">{{ reservationCart.totalQuantity.toLocaleString('fa-IR') }}</p>
            </article>
            <article class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p class="text-sm font-semibold text-slate-500">محصولات متفاوت</p>
              <p class="mt-3 text-3xl font-black text-slate-900">{{ reservationCart.uniqueProductsCount.toLocaleString('fa-IR') }}</p>
            </article>
            <article class="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
              <p class="text-sm font-semibold text-slate-500">بازه انتخابی</p>
              <p class="mt-3 text-sm font-bold text-slate-900">{{ startDatePersian }} تا {{ endDatePersian }}</p>
            </article>
          </aside>
        </div>
      </section>

      <ConfirmModal
        :is-open="showClearCartConfirm"
        title="خالی کردن سبد"
        message="همه اقلام سبد رزرو حذف می‌شوند. ادامه می‌دهی؟"
        confirm-text="بله، سبد خالی شود"
        @confirm="confirmClearCart"
        @cancel="showClearCartConfirm = false"
      />

      <ConfirmModal
        :is-open="showSubmitConfirm"
        title="ثبت نهایی رزرو"
        message="اطلاعات این رزرو ثبت شود؟ بعد از ثبت، اقلام از سبد حذف می‌شوند."
        :loading="saving"
        confirm-text="بله، ثبت نهایی شود"
        loading-text="در حال ثبت رزرو..."
        @confirm="confirmSubmitReservation"
        @cancel="showSubmitConfirm = false"
      />
    </div>
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppShell from '../components/AppShell.vue';
import ConfirmModal from '../components/ConfirmModal.vue';
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
const saving = ref(false);
const errorMessage = ref('');
const productSearch = ref('');
const showClearCartConfirm = ref(false);
const showSubmitConfirm = ref(false);

const cartItems = computed(() => reservationCart.items);
const customerOptions = computed(() => inventoryStore.lookups.customers.map((customer) => ({
  label: customer.name,
  value: customer.id
})));
const productSearchOptions = computed(() =>
  inventoryStore.lookups.products
    .filter((product) => getProductRemaining(product.id) > 0)
    .map((product) => ({
      label: `${product.name}${product.category_name ? ` - ${product.category_name}` : ''}`,
      value: product.id,
      product
    }))
);
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

function handleProductSelect(option) {
  const product = option?.product;
  if (!product) return;
  addProductToCart(product);
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
    toast.error('برای ثبت نهایی، نام مشتری را انتخاب یا وارد کن');
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

  showSubmitConfirm.value = true;
}

function confirmClearCart() {
  reservationCart.clear();
  showClearCartConfirm.value = false;
  toast.success('سبد رزرو خالی شد');
}

async function confirmSubmitReservation() {
  errorMessage.value = '';

  const startDate = toGregorianDate(startDatePersian.value);
  const endDate = toGregorianDate(endDatePersian.value);
  const items = cartItems.value.map((item) => ({
    product_id: Number(item.product_id),
    quantity: Number(item.quantity)
  }));

  saving.value = true;
  const result = await inventoryStore.createReservation({
    customer_id: customerId.value ? Number(customerId.value) : null,
    customer_name: customerName.value.trim(),
    start_date: startDate,
    end_date: endDate,
    items
  });
  saving.value = false;
  showSubmitConfirm.value = false;

  if (!result.success) {
    errorMessage.value = result.message;
    toast.error(result.message);
    return;
  }

  reservationCart.clear();
  toast.success('رزرو با موفقیت ثبت شد');
  router.push('/inventory');
}
</script>
