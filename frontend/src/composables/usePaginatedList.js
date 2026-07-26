import { computed, ref, unref, watch } from 'vue';

function toPageSizeOption(option) {
  if (typeof option === 'object') return option;
  return {
    label: Number(option).toLocaleString('fa-IR'),
    value: Number(option)
  };
}

export function usePaginatedList(source, options = {}) {
  const currentPage = ref(options.initialPage || 1);
  const pageSize = ref(options.initialPageSize || 15);
  const pageSizeOptions = computed(() => (options.pageSizeOptions || [10, 15, 20, 50, 100]).map(toPageSizeOption));
  const totalRows = computed(() => unref(source).length);
  const totalPages = computed(() => Math.max(1, Math.ceil(totalRows.value / pageSize.value)));
  const rowStartIndex = computed(() => (currentPage.value - 1) * pageSize.value);
  const paginatedItems = computed(() =>
    unref(source).slice(rowStartIndex.value, rowStartIndex.value + pageSize.value)
  );
  const visiblePageNumbers = computed(() => {
    const start = Math.max(1, currentPage.value - 1);
    const end = Math.min(totalPages.value, start + 2);
    const adjustedStart = Math.max(1, end - 2);
    return Array.from({ length: end - adjustedStart + 1 }, (_, index) => adjustedStart + index);
  });

  function resetPage() {
    currentPage.value = 1;
  }

  function goToPage(page) {
    if (page < 1 || page > totalPages.value) return;
    currentPage.value = page;
    options.scrollTarget?.value?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  watch(pageSize, resetPage);

  if (options.resetSources?.length) {
    watch(options.resetSources, resetPage);
  }

  watch([totalRows, totalPages], () => {
    if (currentPage.value > totalPages.value) {
      currentPage.value = totalPages.value;
    }

    if (currentPage.value < 1) {
      currentPage.value = 1;
    }
  });

  return {
    currentPage,
    pageSize,
    pageSizeOptions,
    totalRows,
    totalPages,
    rowStartIndex,
    paginatedItems,
    visiblePageNumbers,
    resetPage,
    goToPage
  };
}
