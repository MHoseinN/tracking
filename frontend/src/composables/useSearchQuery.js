import { computed, ref } from 'vue';

export function normalizeSearchText(value) {
  return String(value ?? '')
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .trim()
    .toLowerCase();
}

export function useSearchQuery(initialValue = '') {
  const searchQuery = ref(initialValue);
  const normalizedQuery = computed(() => normalizeSearchText(searchQuery.value));

  function clearSearch() {
    searchQuery.value = '';
  }

  return {
    searchQuery,
    normalizedQuery,
    clearSearch,
    normalizeSearchText
  };
}
