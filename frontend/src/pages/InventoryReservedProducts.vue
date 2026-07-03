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
              @click="releaseAll"
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

      <section v-else class="space-y-4">
        <article
          v-for="order in orders"
          :key="order.reservation_order_id"
          class="rounded-[1.75rem] border border-slate-200 bg-white/92 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
        >
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="rounded-full px-3 py-1 text-xs font-semibold" :class="order.reservation_type === 'bulk' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'">
                  {{ order.reservation_type === 'bulk' ? 'رزرو یک‌جا' : 'رزرو مستقیم' }}
                </span>
                <span class="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                  {{ order.items_count.toLocaleString('fa-IR') }} محصول
                </span>
              </div>
              <h2 class="mt-2 text-lg font-black text-slate-900">{{ order.customer_name || 'مشتری بدون نام' }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ toPersianDate(order.start_date) }} تا {{ toPersianDate(order.end_date) }}</p>
              <p v-if="order.notes" class="mt-2 text-sm text-slate-500">{{ order.notes }}</p>
            </div>

            <button
              type="button"
              :disabled="Boolean(releasingOrders[order.reservation_order_id])"
              class="inline-flex h-11 items-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
              @click="releaseOrder(order)"
            >
              {{ releasingOrders[order.reservation_order_id] ? 'در حال آزادسازی...' : 'آزادسازی کل این رزرو' }}
            </button>
          </div>

          <div class="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
        </article>
      </section>
    </main>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import { useInventoryStore } from '../stores/inventoryStore';
import { toPersianDate } from '../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const inventoryStore = useInventoryStore();

const releasingItems = ref({});
const releasingOrders = ref({});
const releasingAll = ref(false);

const orders = computed(() => inventoryStore.activeReservations || []);
const totalItems = computed(() => orders.value.reduce((sum, order) => sum + (order.items_count || 0), 0));
const directReservations = computed(() => orders.value.filter((order) => order.reservation_type === 'direct').length);

onMounted(async () => {
  await loadData();
});

async function loadData() {
  try {
    await inventoryStore.fetchActiveReservations();
  } catch (_error) {
    toast.error(inventoryStore.error || 'خطا در دریافت رزروهای فعال');
  }
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

async function releaseAll() {
  releasingAll.value = true;
  const result = await inventoryStore.releaseAllReservations();
  releasingAll.value = false;

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  toast.success('همه محصولات رزروشده آزاد شدند');
  await loadData();
}
</script>
