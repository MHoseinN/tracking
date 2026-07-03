<template>
  <div class="min-h-screen bg-[radial-gradient(circle_at_top,#f8fafc,transparent_28%),linear-gradient(180deg,#ffffff_0%,#f8fafc_40%,#eef2ff_100%)]">
    <header class="sticky top-2 z-20 mx-auto max-w-7xl px-4 pt-4">
      <section class="rounded-[2rem] border border-slate-200 bg-white/90 shadow-[0_24px_80px_rgba(15,23,42,0.08)] backdrop-blur">
        <div class="grid gap-5 px-5 py-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:px-6">
          <div>
            <p class="text-xs font-semibold tracking-[0.32em] text-slate-400">INVENTORY MATRIX LAB</p>
            <h1 class="mt-3 text-2xl font-black text-slate-900 sm:text-3xl">نمونه ماتریس وضعیت انبار</h1>
            <p class="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
              این صفحه فقط برای بررسی مدل ماتریسی است. هر محصول به شکل یک بلوک فشرده نمایش داده می‌شود و هر واحد با یک کلیک، فرم ویرایش خودش را دقیقا داخل همان کارت باز می‌کند.
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
          </div>
        </div>
      </section>
    </header>

    <main class="mx-auto grid max-w-7xl gap-6 px-4 py-6 xl:grid-cols-[280px_minmax(0,1fr)]">
      <aside class="space-y-5">
        <section class="rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h2 class="text-sm font-black text-slate-900">فیلترها</h2>

          <div class="mt-4 space-y-3">
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

            <CustomSelect
              :model-value="statusFilter"
              :options="statusOptions"
              placeholder="وضعیت"
              trigger-class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm"
              @update:model-value="statusFilter = $event"
            />

            <CustomSelect
              :model-value="pageSize"
              :options="pageSizeOptions"
              placeholder="تعداد"
              trigger-class="h-11 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-medium shadow-sm"
              @update:model-value="pageSize = Number($event)"
            />
          </div>
        </section>

        <section class="rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
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
              :class="selectedCategoryId ? 'text-slate-700 hover:bg-slate-50' : 'bg-blue-50 text-blue-700'"
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
            <p v-else class="rounded-2xl bg-slate-50 px-3 py-3 text-sm text-slate-500">شاخه‌ای پیدا نشد.</p>
          </div>
        </section>

        <section class="rounded-[1.75rem] border border-slate-200 bg-white/90 p-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)]">
          <h2 class="text-sm font-black text-slate-900">خلاصه</h2>
          <div class="mt-3 space-y-2 text-sm text-slate-600">
            <p>محصول: <span class="font-black text-slate-900">{{ formatNumber(filteredGroups.length) }}</span></p>
            <p>واحد: <span class="font-black text-slate-900">{{ formatNumber(filteredUnits.length) }}</span></p>
            <p>رزروشده: <span class="font-black text-rose-700">{{ formatNumber(reservedCount) }}</span></p>
            <p>آزاد: <span class="font-black text-emerald-700">{{ formatNumber(availableCount) }}</span></p>
          </div>
        </section>
      </aside>

      <section class="space-y-5">
        <section class="rounded-[1.75rem] border border-slate-200 bg-white/92 p-4 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-black text-slate-900">مدل ماتریسی فشرده</h2>
              <p class="mt-1 text-sm text-slate-500">هر ردیف یک محصول است و هر کارت کوچک یک واحد از همان محصول</p>
            </div>
            <span class="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">ویرایش در همان کارت</span>
          </div>
        </section>

        <section v-if="inventoryStore.loading" class="rounded-[1.75rem] border border-slate-200 bg-white/92 px-4 py-12 text-center text-sm text-slate-500 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          در حال بارگذاری...
        </section>

        <section v-else-if="paginatedGroups.length === 0" class="rounded-[1.75rem] border border-slate-200 bg-white/92 px-4 py-12 text-center text-sm text-slate-500 shadow-[0_20px_70px_rgba(15,23,42,0.06)]">
          موردی پیدا نشد.
        </section>

        <section v-else class="space-y-3">
          <article
            v-for="group in paginatedGroups"
            :key="group.product_id"
            class="rounded-[1.75rem] border border-slate-200 bg-white/92 p-3 shadow-[0_20px_70px_rgba(15,23,42,0.06)]"
          >
            <div class="flex flex-wrap items-center justify-between gap-3 px-1 pb-3">
              <div class="min-w-0">
                <h3 class="truncate text-base font-black text-slate-900">{{ group.product_name }}</h3>
                <p class="mt-1 truncate text-xs text-slate-500">{{ group.category_name || 'بدون دسته‌بندی' }}</p>
              </div>
              <div class="flex flex-wrap gap-2 text-xs font-bold">
                <span class="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700">{{ formatNumber(group.available_units) }} آزاد</span>
                <span class="rounded-full bg-rose-100 px-3 py-1 text-rose-700">{{ formatNumber(group.reserved_units) }} رزرو</span>
              </div>
            </div>

            <div class="flex flex-wrap gap-2">
              <article
                v-for="unit in group.units"
                :key="unit.unit_id"
                class="w-[150px] rounded-2xl border transition"
                :class="selectedUnitId === unit.unit_id
                  ? 'border-slate-400 bg-white shadow-lg shadow-slate-200/60'
                  : unit.status === 'reserved'
                    ? 'border-rose-200 bg-rose-50'
                    : 'border-emerald-200 bg-emerald-50'"
              >
                <button
                  type="button"
                  class="flex min-h-[78px] w-full flex-col justify-between px-2 py-2 text-right"
                  @click="toggleSelectedUnit(unit.unit_id)"
                >
                  <div class="flex items-start justify-between gap-2">
                    <span class="text-[11px] font-black text-slate-700">واحد {{ formatNumber(unit.unit_number) }}</span>
                    <span
                      class="rounded-full px-2 py-0.5 text-[10px] font-bold"
                      :class="unit.status === 'reserved' ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'"
                    >
                      {{ unit.status === 'reserved' ? 'رزرو' : 'آزاد' }}
                    </span>
                  </div>

                  <p class="line-clamp-2 text-[11px] font-semibold text-slate-700">
                    {{ drafts[unit.unit_id]?.customer_name || 'برای ثبت یا ویرایش کلیک کن' }}
                  </p>
                </button>

                <div v-if="selectedUnitId === unit.unit_id" class="border-t border-slate-200 px-2 py-2">
                  <div class="grid gap-2">
                    <input
                      v-model="drafts[unit.unit_id].customer_name"
                      list="layout-lab-customers"
                      type="text"
                      class="h-8 rounded-xl border border-slate-200 bg-white px-2 text-[11px] outline-none transition focus:border-blue-400"
                      placeholder="نام مشتری"
                    />

                    <div class="grid grid-cols-2 gap-2">
                      <input
                        v-model="drafts[unit.unit_id].days"
                        type="number"
                        min="1"
                        class="h-8 rounded-xl border border-slate-200 bg-white px-2 text-center text-[11px] outline-none transition focus:border-blue-400"
                        placeholder="روز"
                      />
                      <input
                        v-model="drafts[unit.unit_id].start_persian"
                        type="text"
                        class="h-8 rounded-xl border border-slate-200 bg-white px-2 text-center text-[11px] outline-none transition focus:border-blue-400"
                        placeholder="رفت"
                      />
                    </div>

                    <input
                      v-model="drafts[unit.unit_id].end_persian"
                      type="text"
                      class="h-8 rounded-xl border border-slate-200 bg-white px-2 text-center text-[11px] outline-none transition focus:border-blue-400"
                      placeholder="برگشت"
                    />
                  </div>
                </div>
              </article>
            </div>
          </article>
        </section>

        <section
          v-if="!inventoryStore.loading && filteredGroups.length > 0"
          class="flex flex-col gap-3 rounded-[1.5rem] border border-slate-200 bg-white/90 px-4 py-4 shadow-[0_18px_60px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-slate-500">
            نمایش
            <span class="font-bold text-slate-900">{{ (rowStartIndex + 1).toLocaleString('fa-IR') }}</span>
            تا
            <span class="font-bold text-slate-900">{{ Math.min(rowStartIndex + pageSize, filteredGroups.length).toLocaleString('fa-IR') }}</span>
            از
            <span class="font-bold text-slate-900">{{ filteredGroups.length.toLocaleString('fa-IR') }}</span>
            محصول
          </p>

          <div class="flex flex-wrap gap-2">
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
              :class="page === currentPage ? 'bg-blue-600 text-white' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'"
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
        </section>
      </section>
    </main>

    <datalist id="layout-lab-customers">
      <option v-for="customer in inventoryStore.lookups.customers" :key="customer.id" :value="customer.name"></option>
    </datalist>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useToast } from 'vue-toastification';
import CategoryTreeItem from '../components/CategoryTreeItem.vue';
import CustomSelect from '../components/CustomSelect.vue';
import { useInventoryStore } from '../stores/inventoryStore';
import { toPersianDate } from '../utils/dateConverter';

const router = useRouter();
const toast = useToast();
const inventoryStore = useInventoryStore();

const searchTerm = ref('');
const treeSearch = ref('');
const statusFilter = ref('all');
const selectedCategoryId = ref(null);
const pageSize = ref(8);
const currentPage = ref(1);
const selectedUnitId = ref(null);
const drafts = ref({});

const pageSizeOptions = [6, 8, 10, 12].map((size) => ({ label: `${size.toLocaleString('fa-IR')} محصول`, value: size }));
const statusOptions = [
  { label: 'همه وضعیت‌ها', value: 'all' },
  { label: 'فقط آزاد', value: 'available' },
  { label: 'فقط رزرو شده', value: 'reserved' }
];

const categories = computed(() => inventoryStore.lookups.categories || []);
const categoryTree = computed(() => inventoryStore.lookups.category_tree || []);

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

const filteredGroups = computed(() => {
  const groups = new Map();

  filteredUnits.value.forEach((unit) => {
    if (!groups.has(unit.product_id)) {
      groups.set(unit.product_id, {
        product_id: unit.product_id,
        product_name: unit.product_name,
        category_name: unit.category_name,
        units: [],
        available_units: 0,
        reserved_units: 0
      });
    }

    const group = groups.get(unit.product_id);
    group.units.push(unit);

    if (unit.status === 'reserved') {
      group.reserved_units += 1;
    } else {
      group.available_units += 1;
    }
  });

  return Array.from(groups.values()).sort((a, b) => a.product_name.localeCompare(b.product_name, 'fa'));
});

const totalPages = computed(() => Math.max(1, Math.ceil(filteredGroups.value.length / pageSize.value)));
const rowStartIndex = computed(() => (currentPage.value - 1) * pageSize.value);
const paginatedGroups = computed(() => filteredGroups.value.slice(rowStartIndex.value, rowStartIndex.value + pageSize.value));
const visiblePageNumbers = computed(() => {
  const start = Math.max(1, currentPage.value - 1);
  const end = Math.min(totalPages.value, start + 2);
  const adjustedStart = Math.max(1, end - 2);
  return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
});
const reservedCount = computed(() => filteredUnits.value.filter((unit) => unit.status === 'reserved').length);
const availableCount = computed(() => filteredUnits.value.filter((unit) => unit.status !== 'reserved').length);

onMounted(async () => {
  await loadData();
});

watch([searchTerm, treeSearch, statusFilter, selectedCategoryId, pageSize], () => {
  currentPage.value = 1;
});

watch(totalPages, () => {
  if (currentPage.value > totalPages.value) {
    currentPage.value = totalPages.value;
  }
});

watch(filteredUnits, (units) => {
  const next = {};
  units.forEach((unit) => {
    next[unit.unit_id] = drafts.value[unit.unit_id] || {
      customer_name: unit.customer_name || '',
      days: unit.total_days || 1,
      start_persian: unit.start_date ? toPersianDate(unit.start_date) : '',
      end_persian: unit.end_date ? toPersianDate(unit.end_date) : ''
    };
  });
  drafts.value = next;

  if (selectedUnitId.value && !units.some((unit) => unit.unit_id === selectedUnitId.value)) {
    selectedUnitId.value = null;
  }
}, { immediate: true });

function formatNumber(value) {
  return Number(value || 0).toLocaleString('fa-IR');
}

async function loadData() {
  try {
    await Promise.all([
      inventoryStore.fetchLookups(),
      inventoryStore.fetchDashboard()
    ]);
  } catch (_error) {
    toast.error(inventoryStore.error || 'خطا در بارگذاری نمونه ماتریسی');
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
  let current = categories.value.find((item) => String(item.id) === String(categoryId));
  while (current?.parent_id) {
    if (String(current.parent_id) === String(selectedId)) return true;
    current = categories.value.find((item) => String(item.id) === String(current.parent_id));
  }
  return false;
}

function toggleSelectedUnit(unitId) {
  selectedUnitId.value = selectedUnitId.value === unitId ? null : unitId;
}

function goToPage(page) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  selectedUnitId.value = null;
}
</script>
