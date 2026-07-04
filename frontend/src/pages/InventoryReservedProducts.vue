<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,#fff7ed,transparent_34%),linear-gradient(180deg,#fffdf8_0%,#f8fafc_48%,#fff7ed_100%)]">
    <header class="sticky top-2 z-20 mx-auto max-w-7xl px-4 pt-4">
      <section class="rounded-[2rem] border border-slate-200 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div class="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-6">
          <div>
            <p class="text-xs font-semibold tracking-[0.32em] text-slate-400">ACTIVE RESERVATIONS</p>
            <h1 class="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">مدیریت محصولات رزروشده</h1>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              رزروها تا زمانی که خودت آزادشان نکنی فعال می‌مانند. از این صفحه می‌توانی یک محصول، یک رزرو کامل، یا همه رزروها را آزاد کنی.
            </p>
          </div>

          <div class="flex flex-wrap items-start justify-end gap-3">
            <button
              type="button"
              class="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              @click="router.push('/inventory')"
            >
              بازگشت به انبار
            </button>
            <button
              type="button"
              :disabled="releasingAll || !orders.length"
              class="inline-flex h-12 items-center rounded-2xl bg-rose-600 px-4 text-sm font-semibold text-white shadow-lg shadow-rose-600/20 transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60"
              @click="showReleaseAllConfirm = true"
            >
              {{ releasingAll ? 'در حال آزادسازی...' : 'آزادسازی همه محصولات' }}
            </button>
          </div>
        </div>
      </section>
    </header>

    <main class="mx-auto max-w-7xl px-4 py-6">
      <section class="mb-5 grid gap-4 md:grid-cols-3">
        <article class="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p class="text-sm font-medium text-slate-500">رزروهای فعال</p>
          <p class="mt-3 text-3xl font-black text-slate-900">{{ orders.length.toLocaleString('fa-IR') }}</p>
        </article>
        <article class="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p class="text-sm font-medium text-slate-500">محصولات رزروشده</p>
          <p class="mt-3 text-3xl font-black text-slate-900">{{ totalItems.toLocaleString('fa-IR') }}</p>
        </article>
        <article class="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <p class="text-sm font-medium text-slate-500">نوع مستقیم</p>
          <p class="mt-3 text-3xl font-black text-slate-900">{{ directReservations.toLocaleString('fa-IR') }}</p>
        </article>
      </section>

      <section v-if="inventoryStore.loading" class="rounded-[1.75rem] border border-slate-200 bg-white/92 px-4 py-16 text-center text-sm text-slate-500 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
        در حال بارگذاری رزروهای فعال...
      </section>

      <section v-else-if="orders.length === 0" class="rounded-[1.75rem] border border-slate-200 bg-white/92 px-4 py-16 text-center text-sm text-slate-500 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
        فعلا محصول رزروشده‌ای وجود ندارد.
      </section>

      <section v-else class="space-y-3">
        <article
          v-for="order in orders"
          :key="order.reservation_order_id"
          class="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white/92 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
        >
          <button
            type="button"
            class="flex w-full flex-wrap items-center justify-between gap-4 px-4 py-4 text-right transition hover:bg-slate-50/80"
            @click="toggleOrder(order.reservation_order_id)"
          >
            <div class="min-w-0 flex-1">
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="order.reservation_type === 'bulk' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'">
                  {{ order.reservation_type === 'bulk' ? 'رزرو یک‌جا' : 'رزرو مستقیم' }}
                </span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {{ order.items_count.toLocaleString('fa-IR') }} محصول
                </span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {{ toPersianDate(order.start_date) }} تا {{ toPersianDate(order.end_date) }}
                </span>
              </div>
              <h2 class="mt-2 truncate text-lg font-black text-slate-900">{{ order.customer_name || 'مشتری بدون نام' }}</h2>
              <p class="mt-1 text-sm text-slate-500">
                {{ expandedOrders[order.reservation_order_id] ? 'برای بستن جزئیات دوباره کلیک کن' : summarizeItems(order.items) }}
              </p>
              <p v-if="order.notes && expandedOrders[order.reservation_order_id]" class="mt-2 text-sm text-slate-500">{{ order.notes }}</p>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="inline-flex h-10 items-center rounded-2xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                @click.stop="openEditor(order)"
              >
                ویرایش رزرو
              </button>
              <button
                type="button"
                :disabled="Boolean(releasingOrders[order.reservation_order_id])"
                class="inline-flex h-10 items-center rounded-2xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                @click.stop="releaseOrder(order)"
              >
                {{ releasingOrders[order.reservation_order_id] ? 'در حال آزادسازی...' : 'آزادسازی کل رزرو' }}
              </button>
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
                <svg class="h-4 w-4 transition" :class="expandedOrders[order.reservation_order_id] ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </button>

          <div v-if="expandedOrders[order.reservation_order_id]" class="border-t border-slate-100 px-4 py-4">
            <div class="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <article
                v-for="item in order.items"
                :key="item.reservation_item_id"
                class="rounded-[1.25rem] border border-rose-200 bg-rose-50/75 p-3"
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-slate-900">{{ item.product_name }}</p>
                    <p class="mt-1 truncate text-xs text-slate-500">{{ item.category_name || 'بدون دسته‌بندی' }}</p>
                    <p class="mt-2 text-xs font-semibold text-slate-700">واحد {{ item.unit_number.toLocaleString('fa-IR') }}</p>
                  </div>
                  <button
                    type="button"
                    :disabled="Boolean(releasingItems[item.reservation_item_id])"
                    class="inline-flex h-9 items-center rounded-xl border border-white/70 bg-white px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    @click="releaseItem(item)"
                  >
                    {{ releasingItems[item.reservation_item_id] ? '...' : 'آزادسازی' }}
                  </button>
                </div>
              </article>
            </div>
          </div>
        </article>
      </section>

      <InventoryReservationOrderEditorModal
        :is-open="showEditor"
        :reservation="editingOrder"
        :customer-options="customerOptions"
        :product-options="editorProductOptions"
        :loading="editorSaving"
        @cancel="closeEditor"
        @save="saveReservationOrder"
      />

      <ConfirmModal
        :is-open="showReleaseAllConfirm"
        title="آزادسازی همه رزروها"
        message="همه رزروهای فعال آزاد می‌شوند و محصولات دوباره در انبار آزاد خواهند شد. ادامه می‌دهی؟"
        :loading="releasingAll"
        confirm-text="بله، همه آزاد شوند"
        loading-text="در حال آزادسازی..."
        @confirm="confirmReleaseAll"
        @cancel="showReleaseAllConfirm = false"
      />
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import ConfirmModal from '../components/ConfirmModal.vue';
import InventoryReservationOrderEditorModal from '../components/InventoryReservationOrderEditorModal.vue';
import { useInventoryStore } from '../stores/inventoryStore';
import { toPersianDate } from '../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const inventoryStore = useInventoryStore();

const releasingItems = ref({});
const releasingOrders = ref({});
const releasingAll = ref(false);
const expandedOrders = ref({});
const showReleaseAllConfirm = ref(false);
const showEditor = ref(false);
const editingOrder = ref(null);
const editorSaving = ref(false);

const orders = computed(() => inventoryStore.activeReservations || []);
const totalItems = computed(() => orders.value.reduce((sum, order) => sum + (order.items_count || 0), 0));
const directReservations = computed(() => orders.value.filter((order) => order.reservation_type === 'direct').length);
const customerOptions = computed(() => inventoryStore.lookups.customers.map((customer) => ({
  label: customer.name,
  value: customer.id
})));
const editorProductOptions = computed(() => {
  const lookupMap = new Map((inventoryStore.lookups.products || []).map((product) => [Number(product.id), product]));

  (editingOrder.value?.items || []).forEach((item) => {
    const productId = Number(item.product_id);
    if (!lookupMap.has(productId)) {
      lookupMap.set(productId, {
        id: productId,
        name: item.product_name,
        category_name: item.category_name || '',
        available_quantity: 0
      });
    }
  });

  return Array.from(lookupMap.values());
});

onMounted(async () => {
  await loadData();
});

async function loadData() {
  try {
    await Promise.all([
      inventoryStore.fetchActiveReservations(),
      inventoryStore.fetchLookups()
    ]);
  } catch (_error) {
    toast.error(inventoryStore.error || 'خطا در دریافت رزروهای فعال');
  }
}

function toggleOrder(reservationOrderId) {
  expandedOrders.value = {
    ...expandedOrders.value,
    [reservationOrderId]: !expandedOrders.value[reservationOrderId]
  };
}

function summarizeItems(items) {
  return items
    .slice(0, 3)
    .map((item) => `${item.product_name} ${item.unit_number.toLocaleString('fa-IR')}`)
    .join('، ');
}

async function openEditor(order) {
  editingOrder.value = JSON.parse(JSON.stringify(order));
  showEditor.value = true;

  try {
    await inventoryStore.fetchLookups({
      startDate: order.start_date,
      endDate: order.end_date
    });
  } catch (_error) {
    toast.error(inventoryStore.error || 'خطا در دریافت لیست محصولات آزاد');
  }
}

function closeEditor() {
  showEditor.value = false;
  editingOrder.value = null;
}

async function releaseItem(item) {
  releasingItems.value = { ...releasingItems.value, [item.reservation_item_id]: true };
  const result = await inventoryStore.deleteUnitAssignment(item.unit_id, item.reservation_item_id);
  releasingItems.value = { ...releasingItems.value, [item.reservation_item_id]: false };

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  toast.success('محصول آزاد شد');
  await loadData();
}

async function releaseOrder(order) {
  releasingOrders.value = { ...releasingOrders.value, [order.reservation_order_id]: true };
  const result = await inventoryStore.releaseReservationOrder(order.reservation_order_id);
  releasingOrders.value = { ...releasingOrders.value, [order.reservation_order_id]: false };

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  toast.success('کل رزرو آزاد شد');
  await loadData();
}

async function confirmReleaseAll() {
  releasingAll.value = true;
  const result = await inventoryStore.releaseAllReservations();
  releasingAll.value = false;
  showReleaseAllConfirm.value = false;

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  toast.success('همه محصولات رزروشده آزاد شدند');
  await loadData();
}

async function saveReservationOrder(payload) {
  editorSaving.value = true;
  const result = await inventoryStore.updateReservationOrder(payload.reservation_order_id, payload);
  editorSaving.value = false;

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  toast.success('رزرو با موفقیت ویرایش شد');
  closeEditor();
  await loadData();
}
</script>
