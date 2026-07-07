<template>
  <AppShell title="مدیریت رزرو" subtitle="وضعیت موجودی، رزروهای فعال و عملیات روزمره انبار را در یک صفحه مرکزی مدیریت کن">
    <template #actions>
      <button type="button" class="app-button-primary w-full justify-between" @click="router.push('/inventory/manage')">
        <span>مدیریت محصولات</span>
      </button>
      <button type="button" class="app-button w-full justify-between border border-amber-200 bg-amber-100 text-amber-700 hover:bg-amber-200 focus:ring-amber-100" @click="router.push('/inventory/reservations/new')">
        <span>سبد رزرو</span>
        <span class="rounded-full bg-white/60 px-2 py-0.5 text-xs font-bold">{{ reservationCart.totalQuantity.toLocaleString('fa-IR') }}</span>
      </button>
      <button type="button" class="app-button-success w-full" @click="router.push('/inventory/reservations/active')">رزروهای فعال</button>
      <button type="button" class="app-button-secondary w-full" @click="reloadDashboard">بارگذاری مجدد</button>
      <button type="button" class="app-button-secondary w-full" @click="resetFilters">پاک کردن فیلترها</button>
      <button type="button" class="app-button-secondary w-full" @click="router.push('/home')">بازگشت به خانه</button>
    </template>

    <div class="grid items-start gap-6 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside class="space-y-5 xl:sticky xl:self-start xl:overflow-hidden">
        <section class="flex h-full min-h-0 flex-col rounded-lg border border-slate-200 bg-white/90 p-2">
          <div class="flex min-h-0 flex-1 flex-col gap-2">
            <div class="flex min-h-0 flex-1 flex-col rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <div class="flex min-h-0 flex-1 flex-col space-y-1">
                <button type="button" class="w-full rounded-xl px-3 py-2 text-right text-sm font-semibold transition"
                  :class="selectedCategoryId ? 'text-slate-700 hover:bg-white' : 'bg-blue-50 text-blue-700'"
                  @click="selectedCategoryId = null">
                  دسته بندی </button>

                <div v-if="filteredTree.length" class="min-h-0 flex-1 space-y-1 overflow-y-auto pl-1 pr-1">
                  <CategoryTreeItem v-for="node in filteredTree" :key="node.id" :node="node"
                    :selected-id="selectedCategoryId" @select="selectedCategoryId = $event.id" />
                </div>
                <p v-else class="rounded-xl bg-white px-3 py-3 text-sm text-slate-500">شاخه‌ای پیدا نشد.</p>
              </div>
            </div>
          </div>
        </section>
      </aside>

      <section class="space-y-5">

        <section class="rounded-lg border border-slate-200 bg-white/92 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <div class="border-b border-slate-100 p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 class="text-lg font-black text-slate-900">محصولات {{ selectedCategoryObject?.name || 'همه دسته‌ها' }}
                </h2>
              </div>
            </div>
            <div class="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1fr)_180px_180px_180px_auto_auto] xl:items-center">
              <div class="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
                <input v-model.trim="searchTerm" type="text" placeholder="جستجو در محصول، دسته‌بندی و مشتری"
                  class="h-10 min-w-0 flex-1 bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400" />
                <svg class="h-4 w-4 shrink-0 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                    d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z" />
                </svg>
              </div>
              <JalaliDatePicker :model-value="rangeStartPersian" trigger-mode="button" button-placeholder="از تاریخ"
                button-class="h-11 w-full flex-row-reverse justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm"
                @update:model-value="rangeStartPersian = $event" />
              <JalaliDatePicker :model-value="rangeEndPersian" trigger-mode="button" button-placeholder="تا تاریخ"
                button-class="h-11 w-full flex-row-reverse justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm"
                @update:model-value="rangeEndPersian = $event" />
              <CustomSelect :model-value="statusFilter" :options="statusOptions" placeholder="وضعیت"
                trigger-class="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm"
                @update:model-value="statusFilter = $event" />
              <button type="button"
                class="inline-flex h-11 items-center justify-center rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-800"
                @click="reloadDashboard">
                اعمال
              </button>
              <button type="button"
                class="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                @click="resetFilters">
                پاک کردن
              </button>
            </div>
          </div>

          <AppContentState
            v-if="inventoryStore.loading"
            loading
            message="در حال بارگذاری..."
            surface-class="border-0 bg-transparent px-4 py-16 shadow-none"
          />
          <AppContentState
            v-else-if="paginatedGroups.length === 0"
            message="موردی پیدا نشد."
            surface-class="border-0 bg-transparent px-4 py-16 shadow-none"
          />

          <div v-else class="space-y-2 px-4">
            <article v-for="group in paginatedGroups" :key="group.product_id"
              class="rounded-lg border border-slate-200 bg-white p-4">
              <div class="pb-2">
                <div class="min-w-0 flex items-center justify-between gap-2">
                  <div class="flex gap-4">
                    <h3 class="truncate text-base font-black text-slate-900">{{ group.product_name }}</h3>
                    <div class="flex gap-1">
                      <span class="rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-700">{{
                        formatNumber(group.available_units) }} آزاد</span>
                      <span class="rounded-full bg-rose-100 px-3 py-1 text-[11px] font-semibold text-rose-700">{{
                        formatNumber(group.reserved_units) }} رزرو</span>
                      <span v-if="reservationCart.getProductQuantity(group.product_id)"
                        class="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-semibold text-amber-700">
                        {{ formatNumber(reservationCart.getProductQuantity(group.product_id)) }} در سبد
                      </span>
                    </div>
                  </div>
                  <div class="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
                    {{ formatNumber(group.total_units) }}عدد </div>

                </div>
              </div>

              <div class="grid grid-cols-3 md:grid-cols-6 gap-2">
                <article v-for="unit in group.units" :key="unit.unit_id"
                  class="w-32 rounded-xl border p-2 transition hover:-translate-y-0.5 hover:shadow-lg"
                  :class="unit.status === 'reserved' ? 'border-rose-200 bg-rose-50/80' : 'border-emerald-200 bg-emerald-50/80'">
                  <button type="button" class="block w-full text-right" @click="openUnitModal(unit)">
                    <div class="flex items-start justify-between gap-2">
                      <span class="text-[11px] font-black text-slate-700">شماره {{ formatNumber(unit.unit_number)
                      }}</span>
                      <span class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                        :class="unit.status === 'reserved' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'">
                        {{ unit.status === 'reserved' ? 'رزرو' : 'آزاد' }}
                      </span>
                    </div>

                    <p class="mt-2 min-h-[32px] text-[11px] leading-5 text-slate-700">
                      {{ unit.status === 'reserved' ? unit.customer_name || 'رزرو شده' : 'آماده برای رزرو' }}
                    </p>
                    <p class="text-[10px] text-slate-500">
                      {{ unit.status === 'reserved' ? formatUnitDates(unit) : 'بدون رزرو فعال در بازه انتخابی' }}
                    </p>
                  </button>

                  <div v-if="unit.status !== 'reserved'" class="mt-3 grid gap-2">
                    <button type="button"
                      class="inline-flex h-8 items-center justify-center rounded-xl bg-blue-600 px-2 text-[11px] font-semibold text-white transition hover:bg-blue-700"
                      @click.stop="openUnitModal(unit)">
                      رزرو 
                    </button>
                    <button type="button"
                      class="inline-flex h-8 items-center justify-center rounded-xl border border-slate-200 bg-white px-2 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                      @click.stop="addUnitToCart(group)">
                      افزودن به سبد 
                    </button>
                  </div>

                  <div v-else class="mt-3 rounded-xl bg-white/70 px-2 py-2 text-[10px] text-rose-700">
                    برای ویرایش یا آزادسازی روی همین آیتم کلیک کن
                  </div>
                </article>
              </div>
            </article>
          </div>

          <div v-if="!inventoryStore.loading && filteredGroups.length > 0"
            class="border-t border-slate-100 px-4 py-4">
            <AppPagination
              :total-rows="filteredGroups.length"
              :row-start-index="rowStartIndex"
              :page-size="pageSize"
              :page-size-options="pageSizeOptions"
              :current-page="currentPage"
              :total-pages="totalPages"
              :visible-page-numbers="visiblePageNumbers"
              @update:page-size="pageSize = $event"
              @go-to-page="goToPage"
            />
          </div>
        </section>
      </section>
    </div>

    <InventoryDirectReserveModal :is-open="directReserveOpen" :unit="selectedUnit"
      :customers="inventoryStore.lookups.customers" :saving="directReserveSaving"
      :initial-start-persian="rangeStartPersian" :initial-end-persian="rangeEndPersian" @close="closeDirectReserve"
      @save="submitDirectReserve" @clear="clearUnitReservation" />
  </AppShell>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import AppContentState from '../components/AppContentState.vue';
import AppShell from '../components/AppShell.vue';
import AppPagination from '../components/AppPagination.vue';
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

function openUnitModal(unit) {
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

async function clearUnitReservation(unit) {
  if (!unit?.reservation_item_id) return;

  directReserveSaving.value = true;
  const result = await inventoryStore.deleteUnitAssignment(unit.unit_id, unit.reservation_item_id);
  directReserveSaving.value = false;

  if (!result.success) {
    toast.error(result.message);
    return;
  }

  toast.success('محصول آزاد شد');
  closeDirectReserve();
  await loadData();
}

function addUnitToCart(group) {
  if (group.available_units <= reservationCart.getProductQuantity(group.product_id)) {
    toast.error('عدد آزاد بیشتری برای افزودن به سبد وجود ندارد');
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
