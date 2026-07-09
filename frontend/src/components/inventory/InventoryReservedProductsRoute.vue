<template>
  <div>
    <Teleport defer to="#app-shell-actions">
      <button type="button" :disabled="releasingAll || !orders.length" class="app-button-danger w-full" @click="showReleaseAllConfirm = true">
        {{ releasingAll ? 'در حال آزادسازی...' : 'آزادسازی همه محصولات' }}
      </button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/inventory')">بازگشت به انبار</button>
    </Teleport>

    <div class="max-w-7xl">
      <section class="mb-5 grid gap-4 md:grid-cols-3">
        <AppStatCard
          label="رزروهای فعال"
          :value="orders.length.toLocaleString('fa-IR')"
          value-class="text-slate-900 text-3xl"
          container-class="rounded-xl border-white/80 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
        />
        <AppStatCard
          label="محصولات رزروشده"
          :value="totalItems.toLocaleString('fa-IR')"
          value-class="text-slate-900 text-3xl"
          container-class="rounded-xl border-white/80 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
        />
        <AppStatCard
          label="نوع مستقیم"
          :value="directReservations.toLocaleString('fa-IR')"
          value-class="text-slate-900 text-3xl"
          container-class="rounded-xl border-white/80 bg-white/90 shadow-[0_18px_60px_rgba(15,23,42,0.06)]"
        />
      </section>

      <AppContentState
        v-if="inventoryStore.loading"
        loading
        message="در حال بارگذاری رزروهای فعال..."
        surface-class="rounded-xl bg-white/92 px-4 py-16 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
      />

      <AppContentState
        v-else-if="filteredOrders.length === 0"
        message="فعلا محصول رزروشده‌ای وجود ندارد."
        surface-class="rounded-xl bg-white/92 px-4 py-16 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
      />

      <section v-else class="space-y-3">
        <section class="rounded-xl border border-slate-200 bg-white/92 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div class="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
            <svg class="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
            </svg>
            <input
              v-model.trim="customerSearch"
              type="text"
              class="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="جست‌وجوی لحظه‌ای بر اساس نام مشتری"
            />
          </div>
        </section>

        <article
          v-for="order in filteredOrders"
          :key="order.reservation_order_id"
          class="overflow-hidden rounded-xl border border-slate-200 bg-white/92 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
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
                  {{ getGroupedOrderItems(order).length.toLocaleString('fa-IR') }} قلم
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
                class="inline-flex h-10 items-center rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                @click.stop="openEditor(order)"
              >
                ویرایش رزرو
              </button>
              <button
                type="button"
                :disabled="Boolean(releasingOrders[order.reservation_order_id])"
                class="inline-flex h-10 items-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                @click.stop="pendingReleaseOrder = order"
              >
                {{ releasingOrders[order.reservation_order_id] ? 'در حال آزادسازی...' : 'آزادسازی کل رزرو' }}
              </button>
              <span class="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500">
                <svg class="h-4 w-4 transition" :class="expandedOrders[order.reservation_order_id] ? 'rotate-180' : ''" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </span>
            </div>
          </button>

          <div v-if="expandedOrders[order.reservation_order_id]" class="border-t border-slate-100 px-4 py-4">
            <div class="overflow-hidden rounded-xl border border-slate-200 bg-white">
              <div class="grid grid-cols-[minmax(0,1.3fr)_86px_120px_90px] gap-3 border-b border-slate-200 bg-slate-50 px-3 py-3 text-xs font-bold text-slate-500">
                <span>محصول</span>
                <span class="text-center">تعداد</span>
                <span class="text-center">تغییر تعداد</span>
                <span class="text-center">حذف</span>
              </div>

              <div class="divide-y divide-slate-100">
                <div
                  v-for="groupedItem in getGroupedOrderItems(order)"
                  :key="`${order.reservation_order_id}-${groupedItem.product_id}`"
                  class="grid grid-cols-[minmax(0,1.3fr)_86px_120px_90px] items-center gap-3 px-3 py-3"
                >
                  <div class="min-w-0">
                    <p class="truncate text-sm font-black text-slate-900">{{ groupedItem.product_name }}</p>
                    <p class="mt-1 truncate text-[11px] text-slate-500">{{ groupedItem.category_name || 'بدون دسته‌بندی' }}</p>
                  </div>

                  <div class="text-center text-sm font-bold text-slate-700">
                    {{ groupedItem.quantity.toLocaleString('fa-IR') }}
                  </div>

                  <div class="flex items-center justify-center gap-1 rounded-xl bg-slate-50 px-2 py-2">
                    <button
                      type="button"
                      :disabled="Boolean(updatingOrders[order.reservation_order_id])"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      @click="changeGroupedItemQuantity(order, groupedItem.product_id, -1)"
                    >
                      -
                    </button>
                    <button
                      type="button"
                      :disabled="Boolean(updatingOrders[order.reservation_order_id])"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      @click="changeGroupedItemQuantity(order, groupedItem.product_id, 1)"
                    >
                      +
                    </button>
                  </div>

                  <div class="flex justify-center">
                    <button
                      type="button"
                      :disabled="Boolean(updatingOrders[order.reservation_order_id])"
                      class="inline-flex h-8 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 px-3 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                      @click="removeGroupedItem(order, groupedItem.product_id)"
                    >
                      حذف
                    </button>
                  </div>
                </div>
              </div>
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

      <ConfirmModal
        :is-open="Boolean(pendingReleaseOrder)"
        title="آزادسازی این رزرو"
        :message="pendingReleaseOrder ? `رزرو مشتری «${pendingReleaseOrder.customer_name || 'بدون نام'}» آزاد شود؟` : ''"
        :loading="pendingReleaseOrder ? Boolean(releasingOrders[pendingReleaseOrder.reservation_order_id]) : false"
        confirm-text="بله، این رزرو آزاد شود"
        loading-text="در حال آزادسازی رزرو..."
        @confirm="pendingReleaseOrder ? releaseOrder(pendingReleaseOrder) : null"
        @cancel="pendingReleaseOrder = null"
      />
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../AppContentState.vue';
import AppStatCard from '../AppStatCard.vue';
import ConfirmModal from '../ConfirmModal.vue';
import InventoryReservationOrderEditorModal from '../InventoryReservationOrderEditorModal.vue';
import { useInventoryStore } from '../../stores/inventoryStore';
import { toPersianDate } from '../../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const inventoryStore = useInventoryStore();

const releasingItems = ref({});
const releasingOrders = ref({});
const releasingAll = ref(false);
const updatingOrders = ref({});
const expandedOrders = ref({});
const showReleaseAllConfirm = ref(false);
const showEditor = ref(false);
const editingOrder = ref(null);
const editorSaving = ref(false);
const customerSearch = ref('');
const pendingReleaseOrder = ref(null);

const orders = computed(() => inventoryStore.activeReservations || []);
const totalItems = computed(() => orders.value.reduce((sum, order) => sum + (order.items_count || 0), 0));
const directReservations = computed(() => orders.value.filter((order) => order.reservation_type === 'direct').length);
const filteredOrders = computed(() => {
  const query = customerSearch.value.trim().toLowerCase();
  if (!query) return orders.value;

  return orders.value.filter((order) =>
    String(order.customer_name || '').toLowerCase().includes(query)
  );
});
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
  return getGroupedItems(items)
    .slice(0, 3)
    .map((item) => `${item.product_name} ${item.quantity.toLocaleString('fa-IR')} عدد`)
    .join('، ');
}

function getGroupedItems(items = []) {
  const grouped = new Map();

  items.forEach((item) => {
    const productId = Number(item.product_id);
    const existing = grouped.get(productId);
    if (existing) {
      existing.quantity += 1;
      existing.unit_ids.push(item.unit_id);
      existing.reservation_item_ids.push(item.reservation_item_id);
      return;
    }

    grouped.set(productId, {
      product_id: productId,
      product_name: item.product_name,
      category_name: item.category_name || '',
      quantity: 1,
      unit_ids: [item.unit_id],
      reservation_item_ids: [item.reservation_item_id]
    });
  });

  return Array.from(grouped.values()).sort((a, b) => String(a.product_name).localeCompare(String(b.product_name), 'fa'));
}

function getGroupedOrderItems(order) {
  return getGroupedItems(order?.items || []);
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
  pendingReleaseOrder.value = null;

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

function buildGroupedOrderPayload(order, groupedItems) {
  return {
    reservation_order_id: order.reservation_order_id,
    customer_id: order.customer_id ? Number(order.customer_id) : null,
    customer_name: order.customer_name || '',
    start_date: order.start_date,
    end_date: order.end_date,
    items: groupedItems
      .filter((item) => Number(item.quantity) > 0)
      .map((item) => ({
        product_id: Number(item.product_id),
        quantity: Number(item.quantity)
      }))
  };
}

async function persistGroupedOrderChanges(order, groupedItems, successMessage) {
  const payload = buildGroupedOrderPayload(order, groupedItems);
  if (payload.items.length === 0) {
    toast.error('حداقل یک محصول باید در رزرو باقی بماند');
    return;
  }

  updatingOrders.value = { ...updatingOrders.value, [order.reservation_order_id]: true };
  const result = await inventoryStore.updateReservationOrder(order.reservation_order_id, payload);
  updatingOrders.value = { ...updatingOrders.value, [order.reservation_order_id]: false };

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  toast.success(successMessage);
  await loadData();
  expandedOrders.value = {
    ...expandedOrders.value,
    [order.reservation_order_id]: true
  };
}

async function changeGroupedItemQuantity(order, productId, delta) {
  const groupedItems = getGroupedOrderItems(order).map((item) => ({ ...item }));
  const target = groupedItems.find((item) => Number(item.product_id) === Number(productId));
  if (!target) return;

  const nextQuantity = Number(target.quantity) + Number(delta);
  if (nextQuantity <= 0) {
    await removeGroupedItem(order, productId);
    return;
  }

  target.quantity = nextQuantity;
  await persistGroupedOrderChanges(order, groupedItems, 'تعداد محصول در رزرو به‌روزرسانی شد');
}

async function removeGroupedItem(order, productId) {
  const groupedItems = getGroupedOrderItems(order).filter((item) => Number(item.product_id) !== Number(productId));
  await persistGroupedOrderChanges(order, groupedItems, 'محصول از این رزرو حذف شد');
}
</script>
