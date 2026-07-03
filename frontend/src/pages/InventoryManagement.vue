<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,#eff6ff,transparent_34%),linear-gradient(180deg,#f8fbff_0%,#f8fafc_48%,#f1f5f9_100%)]">
    <header class="sticky top-2 z-20 mx-auto max-w-7xl px-4 pt-4">
      <section class="rounded-[2rem] border border-slate-200 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div class="grid gap-6 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-6">
          <div>
            <p class="text-xs font-semibold tracking-[0.34em] text-slate-400">INVENTORY & RENTAL</p>
            <h1 class="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">انبار و ماتریس وضعیت رزرو</h1>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              هر محصول به شکل یک بلوک فشرده نمایش داده می‌شود. هر واحد آزاد را می‌توانی مستقیم رزرو کنی یا به سبد رزرو بفرستی.
            </p>
          </div>

          <div class="flex flex-wrap items-start justify-end gap-3">
            <button
              type="button"
              class="inline-flex h-12 items-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              @click="router.push('/home')"
            >
              بازگشت
            </button>
            <button
              type="button"
              class="inline-flex h-12 items-center rounded-2xl bg-blue-600 px-4 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 transition hover:bg-blue-700"
              @click="router.push('/inventory/manage')"
            >
              مدیریت محصول
            </button>
            <button
              type="button"
              class="inline-flex h-12 items-center rounded-2xl border border-rose-200 bg-rose-50 px-4 text-sm font-semibold text-rose-700 transition hover:bg-rose-100"
              @click="router.push('/inventory/reservations/active')"
            >
              آزادسازی رزروها
            </button>
            <button
              type="button"
              class="inline-flex h-12 items-center gap-2 rounded-2xl bg-emerald-600 px-4 text-sm font-semibold text-white shadow-lg shadow-emerald-600/20 transition hover:bg-emerald-700"
              @click="router.push('/inventory/reservations/new')"
            >
              <span>سبد رزرو</span>
              <span class="rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">{{ reservationCart.totalQuantity.toLocaleString('fa-IR') }}</span>
            </button>
          </div>
        </div>
      </section>
    </header>

    <main class="mx-auto grid max-w-7xl gap-6 px-4 py-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside class="space-y-5">
        <section class="rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <div class="space-y-4">
            <div>
              <h2 class="text-sm font-black text-slate-900">جستجو و فیلتر و دسته‌بندی</h2>
              <p class="mt-1 text-xs leading-6 text-slate-500">همه ابزارهای پیدا کردن محصول و محدود کردن نمایش، همین‌جا یکجا قرار گرفته‌اند.</p>
            </div>

            <div class="flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
              <svg class="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
              </svg>
              <input
                v-model.trim="searchTerm"
                type="text"
                placeholder="جستجو در محصول و مشتری"
                class="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              />
            </div>

            <JalaliDatePicker
              :model-value="rangeStartPersian"
              trigger-mode="button"
              button-placeholder="از تاریخ"
              button-class="h-11 w-full justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm"
              @update:model-value="rangeStartPersian = $event"
            />

            <JalaliDatePicker
              :model-value="rangeEndPersian"
              trigger-mode="button"
              button-placeholder="تا تاریخ"
              button-class="h-11 w-full justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm"
              @update:model-value="rangeEndPersian = $event"
            />

            <CustomSelect
              :model-value="statusFilter"
              :options="statusOptions"
              placeholder="وضعیت"
              trigger-class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm"
              @update:model-value="statusFilter = $event"
            />

            <div class="flex flex-wrap gap-2">
              <button
                type="button"
                class="inline-flex h-10 items-center rounded-2xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                @click="reloadDashboard"
              >
                اعمال
              </button>
              <button
                type="button"
                class="inline-flex h-10 items-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                @click="resetFilters"
              >
                پاک کردن
              </button>
            </div>
            <div class="rounded-[1.5rem] border border-slate-200 bg-slate-50/80 p-3">
              <div class="mb-3 flex min-h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 shadow-sm">
                <svg class="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                </svg>
                <input
                  v-model.trim="treeSearch"
                  type="text"
                  placeholder="جستجو در دسته‌بندی"
                  class="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                />
              </div>

              <div class="space-y-1">
                <button
                  type="button"
                  class="w-full rounded-2xl px-3 py-2 text-right text-sm font-semibold transition"
                  :class="selectedCategoryId ? 'text-slate-700 hover:bg-white' : 'bg-blue-50 text-blue-700'"
                  @click="selectedCategoryId = null"
                >
                  همه دسته‌ها
                </button>

                <div v-if="filteredTree.length" class="space-y-1">
                  <CategoryTreeItem
                    v-for="node in filteredTree"
                    :key="node.id"
                    :node="node"
                    :selected-id="selectedCategoryId"
                    @select="selectedCategoryId = $event.id"
                  />
                </div>
                <p v-else class="rounded-2xl bg-white px-3 py-3 text-sm text-slate-500">شاخه‌ای پیدا نشد.</p>
              </div>
            </div>
          </div>
        </section>

        <section class="rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h2 class="text-sm font-black text-slate-900">سبد رزرو</h2>
          <div class="mt-3 space-y-2 text-sm text-slate-600">
            <p>محصول در سبد: <span class="font-black text-slate-900">{{ reservationCart.uniqueProductsCount.toLocaleString('fa-IR') }}</span></p>
            <p>کل واحدها: <span class="font-black text-slate-900">{{ reservationCart.totalQuantity.toLocaleString('fa-IR') }}</span></p>
          </div>
        </section>
      </aside>

      <section class="space-y-5">
        <section class="grid gap-4 md:grid-cols-4">
          <article v-for="card in summaryCards" :key="card.label" class="rounded-[1.5rem] border border-white/80 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
            <p class="text-sm font-medium text-slate-500">{{ card.label }}</p>
            <p class="mt-3 text-3xl font-black text-slate-900">{{ card.value }}</p>
            <p class="mt-2 text-xs text-slate-500">{{ card.helper }}</p>
          </article>
        </section>

        <section class="rounded-[1.75rem] border border-slate-200 bg-white/92 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-4">
            <div>
              <h2 class="text-lg font-black text-slate-900">محصولات {{ selectedCategoryObject?.name || 'همه شاخه‌ها' }}</h2>
              <p class="mt-1 text-sm text-slate-500">{{ filteredGroups.length.toLocaleString('fa-IR') }} محصول پیدا شد</p>
            </div>
            <div class="text-sm text-slate-500">
              در این صفحه
              <span class="font-black text-slate-900">{{ paginatedGroups.length.toLocaleString('fa-IR') }}</span>
              محصول نمایش داده می‌شود
            </div>
          </div>

          <div v-if="inventoryStore.loading" class="px-4 py-16 text-center text-sm text-slate-500">در حال بارگذاری...</div>
          <div v-else-if="paginatedGroups.length === 0" class="px-4 py-16 text-center text-sm text-slate-500">موردی پیدا نشد.</div>

          <div v-else class="space-y-3 p-3">
            <article
              v-for="group in paginatedGroups"
              :key="group.product_id"
              class="rounded-[1.5rem] border border-slate-200 bg-white p-3"
            >
              <div class="flex flex-wrap items-center justify-between gap-3 pb-3">
                <div class="min-w-0">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="rounded-full bg-slate-900 px-3 py-1 text-[11px] font-semibold text-white">{{ group.category_name || 'بدون دسته‌بندی' }}</span>
                    <span class="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">{{ formatNumber(group.available_units) }} آزاد</span>
                    <span class="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700">{{ formatNumber(group.reserved_units) }} رزرو</span>
                    <span v-if="reservationCart.getProductQuantity(group.product_id)" class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
                      {{ formatNumber(reservationCart.getProductQuantity(group.product_id)) }} در سبد
                    </span>
                  </div>
                  <h3 class="mt-2 truncate text-base font-black text-slate-900">{{ group.product_name }}</h3>
                </div>
                <div class="rounded-2xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                  {{ formatNumber(group.total_units) }} واحد
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <article
                  v-for="unit in group.units"
                  :key="unit.unit_id"
                  class="w-[168px] rounded-2xl border p-2 transition"
                  :class="unit.status === 'reserved' ? 'border-rose-200 bg-rose-50/80' : 'border-emerald-200 bg-emerald-50/80'"
                >
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-[11px] font-black text-slate-700">واحد {{ formatNumber(unit.unit_number) }}</span>
                    <span class="rounded-full px-2 py-0.5 text-[10px] font-bold" :class="unit.status === 'reserved' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'">
                      {{ unit.status === 'reserved' ? 'رزرو' : 'آزاد' }}
                    </span>
                  </div>

                  <p class="mt-2 min-h-[32px] text-[11px] leading-5 text-slate-700">
                    {{ unit.status === 'reserved' ? unit.customer_name || 'رزرو شده' : 'آماده برای رزرو' }}
                  </p>
                  <p class="text-[10px] text-slate-500">
                    {{ unit.status === 'reserved' ? formatUnitDates(unit) : 'بدون رزرو فعال در بازه انتخابی' }}
                  </p>

                  <div v-if="unit.status !== 'reserved'" class="mt-3 grid gap-2">
                    <button
                      type="button"
                      class="inline-flex h-8 items-center justify-center rounded-xl bg-blue-600 px-2 text-[11px] font-semibold text-white transition hover:bg-blue-700"
                      @click="openDirectReserve(unit)"
                    >
                      رزرو مستقیم
                    </button>
                    <button
                      type="button"
                      class="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                      @click="addUnitToCart(group)"
                    >
                      افزودن به سبد رزرو
                    </button>
                  </div>

                  <div v-else class="mt-3 rounded-xl bg-white/70 px-2 py-2 text-[10px] text-rose-700">
                    این واحد در این بازه قابل افزودن یا رزرو نیست
                  </div>
                </article>
              </div>
            </article>
          </div>

          <div
            v-if="!inventoryStore.loading && filteredGroups.length > 0"
            class="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <p class="text-sm text-slate-500">
              نمایش
              <span class="font-semibold text-slate-700">{{ (rowStartIndex + 1).toLocaleString('fa-IR') }}</span>
              تا
              <span class="font-semibold text-slate-700">{{ Math.min(rowStartIndex + pageSize, filteredGroups.length).toLocaleString('fa-IR') }}</span>
              از
              <span class="font-semibold text-slate-700">{{ filteredGroups.length.toLocaleString('fa-IR') }}</span>
            </p>

            <div class="flex flex-wrap items-center gap-2">
              <CustomSelect
                :model-value="pageSize"
                :options="pageSizeOptions"
                trigger-class="min-w-[92px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm"
                @update:model-value="pageSize = Number($event)"
              />
              <button
                type="button"
                :disabled="currentPage === 1"
                class="inline-flex h-10 items-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                @click="goToPage(currentPage - 1)"
              >
                قبلی
              </button>
              <button
                v-for="page in visiblePageNumbers"
                :key="page"
                type="button"
                class="inline-flex h-10 min-w-[40px] items-center justify-center rounded-2xl px-3 text-sm font-semibold transition"
                :class="page === currentPage ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
                @click="goToPage(page)"
              >
                {{ page.toLocaleString('fa-IR') }}
              </button>
              <button
                type="button"
                :disabled="currentPage === totalPages"
                class="inline-flex h-10 items-center rounded-2xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                @click="goToPage(currentPage + 1)"
              >
                بعدی
              </button>
            </div>
          </div>
        </section>
      </section>
    </main>

    <InventoryDirectReserveModal
      :is-open="directReserveOpen"
      :unit="selectedUnit"
      :customers="inventoryStore.lookups.customers"
      :saving="directReserveSaving"
      :initial-start-persian="rangeStartPersian"
      :initial-end-persian="rangeEndPersian"
      @close="closeDirectReserve"
      @save="submitDirectReserve"
    />
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import CategoryTreeItem from '../components/CategoryTreeItem.vue';
import CustomSelect from '../components/CustomSelect.vue';
import InventoryDirectReserveModal from '../components/InventoryDirectReserveModal.vue';
import JalaliDatePicker from '../components/JalaliDatePicker.vue';
import { useReservationCartStore } from '../stores/reservationCartStore';
import { useInventoryStore } from '../stores/inventoryStore';
import { getCurrentPersianDate, toGregorianDate, toPersianDate } from '../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const inventoryStore = useInventoryStore();
const reservationCart = useReservationCartStore();

const today = getCurrentPersianDate();
const defaultPersianDate = `${today.year}/${String(today.month).padStart(2, '0')}/${String(today.day).padStart(2, '0')}`;

const rangeStartPersian = ref(defaultPersianDate);
const rangeEndPersian = ref(defaultPersianDate);
const searchTerm = ref('');
const treeSearch = ref('');
const statusFilter = ref('all');
const selectedCategoryId = ref(null);
const currentPage = ref(1);
const pageSize = ref(8);
const directReserveOpen = ref(false);
const directReserveSaving = ref(false);
const selectedUnit = ref(null);

const pageSizeOptions = [6, 8, 10, 12].map((size) => ({ label: size.toLocaleString('fa-IR'), value: size }));
const statusOptions = [
  { label: 'همه وضعیت‌ها', value: 'all' },
  { label: 'فقط آزاد', value: 'available' },
  { label: 'فقط رزرو شده', value: 'reserved' }
];

const categoryTree = computed(() => inventoryStore.lookups.category_tree || []);
const selectedCategoryObject = computed(() => inventoryStore.lookups.categories.find((item) => String(item.id) === String(selectedCategoryId.value)) || null);
const summaryCards = computed(() => [
  { label: 'محصول‌ها', value: formatNumber(inventoryStore.dashboard.summary.total_products), helper: 'مدل‌های فهرست‌شده' },
  { label: 'کل واحدها', value: formatNumber(inventoryStore.dashboard.summary.total_quantity), helper: 'همه رکوردها' },
  { label: 'رزروشده', value: formatNumber(inventoryStore.dashboard.summary.total_reserved), helper: 'تا زمان آزادسازی دستی' },
  { label: 'آزاد', value: formatNumber(inventoryStore.dashboard.summary.total_available), helper: 'قابل رزرو' }
]);

const filteredTree = computed(() => filterTree(categoryTree.value, treeSearch.value));
const filteredUnits = computed(() => {
  const query = searchTerm.value.trim().toLowerCase();
  return (inventoryStore.dashboard.units || []).filter((unit) => {
    const matchesSearch = !query || [
      unit.product_name,
      unit.category_name,
      unit.customer_name
    ].some((value) => String(value || '').toLowerCase().includes(query));

    const matchesCategory = !selectedCategoryId.value
      || String(unit.category_id) === String(selectedCategoryId.value)
      || isCategoryDescendant(unit.category_id, selectedCategoryId.value);

    const normalizedStatus = unit.status === 'reserved' ? 'reserved' : 'available';
    const matchesStatus = statusFilter.value === 'all' || normalizedStatus === statusFilter.value;

    return matchesSearch && matchesCategory && matchesStatus;
  });
});

const groupedProducts = computed(() => {
  const groups = new Map();

  filteredUnits.value.forEach((unit) => {
    if (!groups.has(unit.product_id)) {
      groups.set(unit.product_id, {
        product_id: unit.product_id,
        product_name: unit.product_name,
        category_name: unit.category_name,
        total_units: 0,
        reserved_units: 0,
        available_units: 0,
        units: []
      });
    }

    const group = groups.get(unit.product_id);
    group.units.push(unit);
    group.total_units += 1;

    if (unit.status === 'reserved') {
      group.reserved_units += 1;
    } else {
      group.available_units += 1;
    }
  });

  return Array.from(groups.values()).sort((a, b) => a.product_name.localeCompare(b.product_name, 'fa'));
});

const filteredGroups = computed(() => groupedProducts.value);
const totalPages = computed(() => Math.max(1, Math.ceil(filteredGroups.value.length / pageSize.value)));
const rowStartIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const paginatedGroups = computed(() => filteredGroups.value.slice(rowStartIndex.value, rowStartIndex.value + pageSize.value));
const visiblePageNumbers = computed(() => {
  const start = Math.max(1, currentPage.value - 1);
  const end = Math.min(totalPages.value, start + 2);
  const adjustedStart = Math.max(1, end - 2);
  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
});

onMounted(async () => {
  reservationCart.initialize();
  await loadData();
});

watch([searchTerm, treeSearch, statusFilter, selectedCategoryId, pageSize], () => {
  currentPage.value = 1;
});

watch(totalPages, () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value;
});

function formatNumber(value) {
  return Number(value || 0).toLocaleString('fa-IR');
}

function formatUnitDates(unit) {
  if (!unit.start_date || !unit.end_date) return 'بازه ثبت نشده';
  return `${toPersianDate(unit.start_date)} تا ${toPersianDate(unit.end_date)}`;
}

function getRangeParams() {
  const startDate = toGregorianDate(rangeStartPersian.value);
  const endDate = toGregorianDate(rangeEndPersian.value);
  return {
    startDate: startDate <= endDate ? startDate : endDate,
    endDate: startDate <= endDate ? endDate : startDate
  };
}

async function loadData() {
  try {
    const params = getRangeParams();
    await Promise.all([
      inventoryStore.fetchLookups(params),
      inventoryStore.fetchDashboard(params)
    ]);
    reservationCart.syncProductMeta(inventoryStore.lookups.products);
  } catch (_error) {
    toast.error(inventoryStore.error || 'خطا در دریافت اطلاعات انبار');
  }
}

function filterTree(nodes, query) {
  const normalized = String(query || '').trim().toLowerCase();
  if (!normalized) return nodes;

  return nodes
    .map((node) => {
      const filteredChildren = filterTree(node.children || [], normalized);
      const selfMatch = String(node.name || '').toLowerCase().includes(normalized);
      if (selfMatch || filteredChildren.length > 0) {
        return { ...node, children: filteredChildren };
      }
      return null;
    })
    .filter(Boolean);
}

function isCategoryDescendant(categoryId, selectedId) {
  const categories = inventoryStore.lookups.categories;
  let current = categories.find((item) => String(item.id) === String(categoryId));
  while (current?.parent_id) {
    if (String(current.parent_id) === String(selectedId)) return true;
    current = categories.find((item) => String(item.id) === String(current.parent_id));
  }
  return false;
}

function openDirectReserve(unit) {
  if (unit.status === 'reserved') return;
  selectedUnit.value = unit;
  directReserveOpen.value = true;
}

function closeDirectReserve() {
  directReserveOpen.value = false;
  selectedUnit.value = null;
}

async function submitDirectReserve(payload) {
  if (!selectedUnit.value) return;

  directReserveSaving.value = true;
  const result = await inventoryStore.updateUnitAssignment(selectedUnit.value.unit_id, {
    customer_id: payload.customer_id,
    customer_name: payload.customer_name,
    start_date: payload.start_date,
    end_date: payload.end_date,
    reservation_item_id: selectedUnit.value.reservation_item_id || null,
    notes: payload.notes
  });
  directReserveSaving.value = false;

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  toast.success('رزرو مستقیم ثبت شد');
  closeDirectReserve();
  await loadData();
}

function addUnitToCart(group) {
  if (group.available_units <= reservationCart.getProductQuantity(group.product_id)) {
    toast.error('واحد آزاد بیشتری برای افزودن به سبد وجود ندارد');
    return;
  }

  const result = reservationCart.addProduct({
    id: group.product_id,
    name: group.product_name,
    category_name: group.category_name
  }, 1, group.available_units);

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  toast.success('محصول به سبد رزرو اضافه شد');
}

async function reloadDashboard() {
  await loadData();
}

function resetFilters() {
  searchTerm.value = '';
  treeSearch.value = '';
  statusFilter.value = 'all';
  selectedCategoryId.value = null;
  rangeStartPersian.value = defaultPersianDate;
  rangeEndPersian.value = defaultPersianDate;
  currentPage.value = 1;
  reloadDashboard();
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
}
</script>
